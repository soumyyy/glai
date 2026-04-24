import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { AppState } from 'react-native';
import { syncAndRestoreCloudMealsIfNeeded } from '../lib/supabase/sync';
import { getSetting } from '../lib/db/settings';

export default function RootLayout() {
  const [, requestPermission] = useCameraPermissions();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!getSetting('onboarded')) {
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
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="manual" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="portion" options={{ presentation: 'modal', title: 'Portion Size' }} />
      <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Review' }} />
      <Stack.Screen name="save-confirmation" options={{ presentation: 'modal', title: 'Save Meal' }} />
      <Stack.Screen name="day/[date]" options={{ title: 'Day Detail' }} />
      <Stack.Screen name="meal/[id]" options={{ title: 'Meal Detail' }} />
    </Stack>
  );
}
