import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { AppState } from 'react-native';
import { useFonts } from 'expo-font';
import { CevicheOne_400Regular } from '@expo-google-fonts/ceviche-one';
import { syncAndRestoreCloudMealsIfNeeded } from '../lib/supabase/sync';
import { getSetting } from '../lib/db/settings';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../lib/store/authStore';
import { useProfileStore } from '../lib/store/profileStore';
import { createSessionFromUrl, getSession, runFirstSignInMigration, subscribeToAuthChanges } from '../lib/supabase/auth';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [, requestPermission] = useCameraPermissions();
  const [fontsLoaded] = useFonts({ CevicheOne_400Regular });
  const { isReady, session, isMigrating } = useAuthStore();
  const isAuthenticated = Boolean(session);
  const isOnboarded = isAuthenticated && Boolean(getSetting('onboarded'));

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    let cancelled = false;

    async function prepareSession(nextSession: typeof session) {
      if (cancelled) return;

      useAuthStore.getState().setSession(nextSession);

      if (!nextSession) {
        useProfileStore.getState().clear();
        useAuthStore.getState().setMigrating(false);
        return;
      }

      useAuthStore.getState().setMigrating(true);
      useAuthStore.getState().setMigrationError(null);

      try {
        await runFirstSignInMigration(nextSession);
      } catch (error) {
        console.warn('[Auth] migration failed', error);
        useAuthStore.getState().setMigrationError(error instanceof Error ? error.message : 'Migration failed');
      } finally {
        useProfileStore.getState().reloadProfiles();
        useAuthStore.getState().setMigrating(false);
      }
    }

    void (async () => {
      try {
        const nextSession = await getSession();
        await prepareSession(nextSession);
      } catch (error) {
        console.warn('[Auth] bootstrap failed', error);
        useAuthStore.getState().setMigrationError(error instanceof Error ? error.message : 'Auth bootstrap failed');
      } finally {
        if (!cancelled) {
          useAuthStore.getState().setReady(true);
        }
      }
    })();

    const unsubscribe = subscribeToAuthChanges(async (_event, nextSession) => {
      await prepareSession(nextSession);
      if (!cancelled) {
        useAuthStore.getState().setReady(true);
      }
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        try {
          console.log('[Auth] deep-link:received', { url });
          const nextSession = await createSessionFromUrl(url);
          if (nextSession) {
            await prepareSession(nextSession);
          }
        } catch (error) {
          console.warn('[Auth] deep-link failed', error);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady || isMigrating || !fontsLoaded) {
      return;
    }

    SplashScreen.hideAsync().catch(() => undefined);
  }, [isMigrating, isReady, fontsLoaded]);

  useEffect(() => {
    if (!isReady || isMigrating || !session || !getSetting('onboarded')) {
      return;
    }

    syncAndRestoreCloudMealsIfNeeded({ reason: 'startup' }).catch((error) => {
      console.warn('[Restore] startup sync failed', error);
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      syncAndRestoreCloudMealsIfNeeded({ reason: 'foreground' }).catch((error) => {
        console.warn('[Restore] foreground sync failed', error);
      });
    });

    return () => subscription.remove();
  }, [isMigrating, isReady, session]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !isOnboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isOnboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="manual" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="portion" options={{ presentation: 'modal', title: 'Portion Size' }} />
        <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Review' }} />
        <Stack.Screen name="save-confirmation" options={{ presentation: 'modal', title: 'Save Meal' }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Day Detail' }} />
        <Stack.Screen name="meal/[id]" options={{ title: 'Meal Detail' }} />
      </Stack.Protected>
    </Stack>
  );
}
