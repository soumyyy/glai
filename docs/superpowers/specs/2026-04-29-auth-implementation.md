# Auth Implementation — Glai
**Date:** 2026-04-29  
**Status:** Implemented in app code, pending device QA

## What changed

- Added Google sign-in screen at `app/sign-in.tsx` using `expo-auth-session`.
- Added authenticated Supabase client session persistence in `lib/supabase/client.ts` using `expo-secure-store`.
- Added auth session store in `lib/store/authStore.ts`.
- Added auth bootstrap, sign-out, and first-sign-in migration in `lib/supabase/auth.ts`.
- Updated root routing in `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`, and `app/onboarding.tsx` to gate by:
  - no session -> `/sign-in`
  - session + not onboarded -> `/onboarding`
  - session + onboarded -> `/(tabs)`
- Added account-scoped local profile selection in `lib/store/profileStore.ts`.
- Added local SQLite auth columns and backfills in `lib/db/schema.ts`.
- Updated local profile and meal writes to persist `account_id` / `updated_at`.
- Updated sync to:
  - scope to the authenticated account
  - reconcile meals/profiles by `updated_at`
  - avoid cross-account pending delete sync

## Existing-user migration

First successful sign-in now:

1. assigns `users.account_id = auth.uid()` for legacy rows with `NULL account_id`
2. backfills missing `users.updated_at` and `meals.updated_at`
3. assigns `pending_deletes.account_id`
4. pushes migrated local data before normal authenticated restore

The migration is idempotent and tracked with `auth_migrated:<account_id>` in settings.

## QA still required

- Real-device Google sign-in on development build
- Existing local-user migration on a device with pre-auth meal history
- Sign out -> sign back in
- Different account sign-in on same device
- Reinstall -> restore from cloud after sign-in
- TestFlight build with `EXPO_PUBLIC_GOOGLE_CLIENT_ID` present in EAS environment
