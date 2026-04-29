import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import { getSetting } from "../lib/db/settings";
import { useAuthStore } from "../lib/store/authStore";
import { useProfileStore } from "../lib/store/profileStore";
import {
  runFirstSignInMigration,
  signInWithGoogleOAuth,
} from "../lib/supabase/auth";

WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.4-11.2-8l-6.5 5C9.9 39.9 16.5 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"
      />
    </Svg>
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, isMigrating, session } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!session || isMigrating) return;
    router.replace(getSetting("onboarded") ? "/(tabs)" : "/onboarding");
  }, [isMigrating, router, session]);

  if (isReady && !isMigrating && session) {
    return (
      <Redirect href={getSetting("onboarded") ? "/(tabs)" : "/onboarding"} />
    );
  }

  const busy = submitting || isMigrating;

  async function handleSignIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      setSubmitting(true);
      setErrorText(null);
      const nextSession = await signInWithGoogleOAuth();
      if (!nextSession) {
        setErrorText("Sign-in was cancelled.");
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      useAuthStore.getState().setSession(nextSession);
      await runFirstSignInMigration(nextSession);
      useProfileStore.getState().reloadProfiles();
      router.replace(getSetting("onboarded") ? "/(tabs)" : "/onboarding");
    } catch (error) {
      console.warn("[Auth] sign-in failed", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      setErrorText(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={s.screen}>
      {/* Top section */}
      <View style={[s.top, { paddingTop: insets.top + 44 }]}>
        {/* Wordmark */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(700).springify()}
        >
          <Text style={s.wordmark}>GLAI</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          entering={FadeInDown.delay(180).duration(600).springify()}
          style={s.taglineBlock}
        >
          <Text style={s.tagline}>Know what you eat.</Text>
          <Text style={s.taglineAccent}>Every meal, every day.</Text>
        </Animated.View>

        {/* Decorative macro pill row */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(600).springify()}
          style={s.statRow}
        >
          {[
            { label: "CARBS", value: "48–62g", color: Colors.carbs },
            { label: "PROTEIN", value: "31g", color: Colors.protein },
            { label: "FAT", value: "18g", color: Colors.fat },
            { label: "KCAL", value: "487", color: Colors.calories },
          ].map((stat) => (
            <View key={stat.label} style={s.statPill}>
              <Text style={[s.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom sheet */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(700).springify()}
        style={[s.sheet, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={s.sheetHandle} />

        {/* <Text style={s.sheetTitle}>Get started</Text> */}
        {/* <Text style={s.sheetSub}>
          Your data syncs across every device in your household.
        </Text> */}

        <TouchableOpacity
          style={[s.googleBtn, busy && s.googleBtnBusy]}
          activeOpacity={0.8}
          disabled={busy}
          onPress={handleSignIn}
        >
          {busy ? (
            <ActivityIndicator color={Colors.textSecondary} />
          ) : (
            <>
              <GoogleLogo size={22} />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {errorText ? (
          <Animated.Text entering={FadeIn.duration(300)} style={s.errorText}>
            {errorText}
          </Animated.Text>
        ) : null}

        {/* {__DEV__ ? (
          <Text style={s.devHint}>{getAuthRedirectUri()}</Text>
        ) : null} */}

        <Text style={s.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Top hero
  top: {
    paddingHorizontal: 30,
    gap: 28,
    alignItems: 'center',
  },

  wordmark: {
    fontFamily: "CevicheOne_400Regular",
    fontSize: 72,
    color: Colors.primary,
    letterSpacing: -1,
    lineHeight: 76,
    textAlign: 'center',
  },

  taglineBlock: {
    gap: 2,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.7,
    lineHeight: 32,
    textAlign: 'center',
  },
  taglineAccent: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.carbs,
    letterSpacing: -0.7,
    lineHeight: 32,
    textAlign: 'center',
  },

  // Stat pills
  statRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },

  // Bottom sheet
  sheet: {
    backgroundColor: Colors.glassStrong,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.glassBorder,
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.6,
  },
  sheetSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    height: 56,
  },
  googleBtnBusy: { opacity: 0.55 },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.2,
  },

  errorText: {
    color: Colors.error,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  legal: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  devHint: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
