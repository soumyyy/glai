# 2026-04-23 TestFlight Readiness

## Scope

This pass prepares the app for a controlled iOS TestFlight build while preserving the current no-login, single-device-first workflow.

## EAS and iOS

- Added EAS production build and submit profiles.
- Linked the app to EAS project `8520876b-9055-49e6-98eb-b842887511b9`.
- Added iOS bundle id `com.soumymaheshwri.glai`.
- Added camera and photo library usage strings.
- Added `ITSAppUsesNonExemptEncryption: false` for App Store Connect encryption export compliance.
- Uploaded EAS production env vars for OpenAI and Supabase.

## Cloud Restore

- Supabase remains the cloud backup, while SQLite remains the local source for normal app reads.
- On Home focus, the app first syncs pending local writes/deletes, then pulls Supabase meals/items/summaries back into SQLite.
- Profile has a manual Restore from cloud action for reinstall recovery.
- The current app still uses the v1 local user id. The database policy is not hardcoded to only that user, so a later family-member profile switch can be added without replacing every table policy.

## Prototype Caveats

- OpenAI is still called directly from the client. This is acceptable for the current private TestFlight but not for broad public release.
- Supabase RLS is intentionally permissive for this no-login prototype. Before a wider release, move writes behind Supabase Auth policies or an Edge Function.
- App Store privacy answers must disclose meal photo processing by OpenAI and nutrition/meal data storage in Supabase.
