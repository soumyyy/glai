# Account Deletion — Glai
**Date:** 2026-04-29  
**Status:** Implemented locally, function deployment pending

## Why

Apple requires apps that support account creation to also allow in-app account deletion. Sign-out alone is not sufficient.

## What was added

- In-app `Delete account` action in Profile.
- Double-confirm destructive flow.
- Secured Supabase Edge Function at `supabase/functions/delete-account/index.ts`.
- Local cleanup after remote deletion:
  - profiles
  - meals
  - meal items
  - daily summaries
  - pending deletes
  - onboarding/auth-migration/account-scoped settings

## Server-side behavior

The edge function:

1. Verifies the caller using the bearer token from the app session.
2. Finds all `users` rows for `account_id = auth.uid()`.
3. Deletes `meal_items`, `daily_summaries`, `meals`, `pending_deletes`, and `users`.
4. Deletes the Supabase Auth user with `auth.admin.deleteUser(...)`.

This keeps the `service_role` key out of the client.

## Still required

Deploy the edge function before the button can work against the hosted project:

```bash
supabase functions deploy delete-account --project-ref ryzxpkpfsmmxutkfwknc
```
