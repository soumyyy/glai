# 2026-04-24 Foundation Build Notes

## Scope

This pass prepares the next iOS build to become the stable OTA base.

## What changed

- Added explicit EAS channels for every profile in `eas.json`.
- Kept the iOS `EXPO_IMAGE_DISABLE_LIBDAV1D=1` workaround on all build profiles to avoid the CocoaPods `libdav1d` clone failure seen on EAS.
- Bumped the app version from `1.0.0` to `1.0.1` so the next build gets a new runtime version under the existing `appVersion` runtime policy.
- Added OTA publish scripts that include `--environment` so `EXPO_PUBLIC_*` values resolve correctly during `eas update`.

## Why this matters

### OTA stability

The previous TestFlight line was not a trustworthy OTA base. The next build needs:

- `expo-updates` installed
- `updates.url` present
- `runtimeVersion` present
- explicit EAS channels in `eas.json`

This repo now has those pieces together.

### HealthKit / Libre work deferred

HealthKit and CGM integration were intentionally removed from the shipped foundation build after they introduced unnecessary native risk before the base TestFlight line was stable.

## Operational note

For future OTA publishes, use:

```bash
npm run update:production -- --message "Your message"
```

instead of a bare `eas update --branch production ...`, so the production EAS environment is applied during bundle export.
