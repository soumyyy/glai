# 2026-04-24 Foundation Build + HealthKit Prep

## Scope

This pass prepares the next iOS build to become the stable OTA base and adds the native dependency required for future glucose import on iPhone.

## What changed

- Added explicit EAS channels for every profile in `eas.json`.
- Kept the iOS `EXPO_IMAGE_DISABLE_LIBDAV1D=1` workaround on all build profiles to avoid the CocoaPods `libdav1d` clone failure seen on EAS.
- Bumped the app version from `1.0.0` to `1.0.1` so the next build gets a new runtime version under the existing `appVersion` runtime policy.
- Added `@kingstinct/react-native-healthkit` plus `react-native-nitro-modules` and wired the Expo config plugin in `app.json`.
- Added HealthKit usage copy for Apple review and generated HealthKit entitlements through the plugin.
- Added a small `lib/health/healthkit.ts` wrapper for:
  - HealthKit availability checks
  - requesting blood glucose read access
  - reading recent blood glucose samples from Apple Health
- Added OTA publish scripts that include `--environment` so `EXPO_PUBLIC_*` values resolve correctly during `eas update`.

## Why this matters

### OTA stability

The previous TestFlight line was not a trustworthy OTA base. The next build needs:

- `expo-updates` installed
- `updates.url` present
- `runtimeVersion` present
- explicit EAS channels in `eas.json`

This repo now has those pieces together.

### HealthKit instead of direct Libre sensor work

For iOS, the realistic path to CGM-linked meal context in this codebase is Apple Health integration.

This pass does **not** claim direct Abbott sensor integration. It prepares Glai to read glucose data that is already present in Apple Health. If Libre data is not exposed to Apple Health on the device, Glai will not be able to read it through this path.

## Operational note

For future OTA publishes, use:

```bash
npm run update:production -- --message "Your message"
```

instead of a bare `eas update --branch production ...`, so the production EAS environment is applied during bundle export.
