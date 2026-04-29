# Auth Design — Glai
**Date:** 2026-04-29  
**Status:** Approved  
**Approach:** Supabase Auth + Google Sign-In + Row Level Security

---

## 1. Goal

Allow any individual to create an account, sign in with Google, and have their data securely isolated from all other users. One account can contain multiple family profiles (same as today). Data syncs across all devices signed into the same account, with last-write-wins conflict resolution.

---

## 2. User Model

```
Google Account (auth.users)
  └── Account (auth.uid)
        ├── Profile: "Raj" (users table, account_id = auth.uid)
        │     ├── Meal: Breakfast 2026-04-29
        │     └── Meal: Lunch 2026-04-28
        └── Profile: "Priya"
              └── Meal: Dinner 2026-04-28
```

- One Google login = one Supabase auth account = one isolated data namespace
- Multiple family profiles still supported under one account (unchanged from today)
- Each profile's meals are still scoped to that profile (unchanged)

---

## 3. Auth Flow

### 3.1 App Launch
```
App opens
  → check Supabase session (from SecureStore)
  → No session?      → /sign-in
  → Session exists?
      → getSetting('onboarded') == null?  → /onboarding
      → else                              → /(tabs)
```

### 3.2 Sign-In Screen (`app/sign-in.tsx`)
- Single screen: app name/logo + "Sign in with Google" button
- Uses `expo-auth-session` to open Google OAuth in a browser popup
- On success: Supabase `signInWithIdToken()` creates/resumes the session
- After sign-in: run first-time migration (see §6), then route to onboarding or home

### 3.3 Sign-Out
- Button in Profile tab
- Calls `supabase.auth.signOut()`, clears auth store, navigates to `/sign-in`
- Local SQLite data is NOT deleted on sign-out (safe to sign back in)

---

## 4. Schema Changes

### 4.1 Local SQLite

**`users` table** — add column:
```sql
ALTER TABLE users ADD COLUMN account_id TEXT;
```
- Set to `auth.uid()` on first sign-in for all existing rows
- Required for all new rows going forward

**`meals` table** — add column:
```sql
ALTER TABLE meals ADD COLUMN updated_at TEXT;
```
- Set to `created_at` value for all existing rows on migration
- Updated to `NOW()` on every edit

**`users` table** — add column:
```sql
ALTER TABLE users ADD COLUMN updated_at TEXT;
```
- Set to `created_at` for existing rows on migration
- Updated on every profile edit

### 4.2 Supabase (cloud tables)
Same columns added to cloud schema. The `updated_at` column drives conflict resolution.

---

## 5. Row Level Security (RLS)

Enable RLS on all tables. Add policies:

**`users` (profiles):**
```sql
-- SELECT / INSERT / UPDATE / DELETE
account_id = auth.uid()
```

**`meals`:**
```sql
user_id IN (SELECT id FROM users WHERE account_id = auth.uid())
```

**`meal_items`:**
```sql
meal_id IN (
  SELECT id FROM meals WHERE user_id IN (
    SELECT id FROM users WHERE account_id = auth.uid()
  )
)
```

**`daily_summaries`:**
```sql
user_id IN (SELECT id FROM users WHERE account_id = auth.uid())
```

**`pending_deletes`:**
```sql
-- logged_on_date is not enough; need to join via meals
-- Simplest: add account_id column to pending_deletes too
account_id = auth.uid()
```

---

## 6. First-Sign-In Migration

Runs once, immediately after Google sign-in succeeds, before routing to home.

```
1. Get auth.uid() from Supabase session
2. Check local SQLite: any users row where account_id IS NULL?
3. If yes:
   a. UPDATE users SET account_id = auth.uid() WHERE account_id IS NULL
   b. UPDATE users SET updated_at = created_at WHERE updated_at IS NULL
   c. UPDATE meals SET updated_at = created_at WHERE updated_at IS NULL
   d. Add account_id to pending_deletes rows
   e. Run full sync (syncAllProfiles + syncPendingMeals)
4. Mark migration done in settings: setSetting('auth_migrated', 'true')
```

This is idempotent — safe to re-run. If sync fails mid-migration, it retries on next launch.

---

## 7. Conflict Resolution (Last-Write-Wins)

All upserts use `updated_at` to decide which version wins:

**Supabase upsert for meals:**
```sql
INSERT INTO meals (..., updated_at)
VALUES (...)
ON CONFLICT(id) DO UPDATE SET
  ...
  updated_at = excluded.updated_at
WHERE excluded.updated_at > meals.updated_at
```

Same pattern for `users` (profiles).

**Pull from cloud:**
When fetching remote records, apply same rule locally: only overwrite if remote `updated_at` > local `updated_at`.

---

## 8. Multi-Device Sync

No changes to sync frequency (push on change, pull on app focus). Auth just means:
- Supabase client is now authenticated → RLS is automatically enforced
- Pull now returns only this account's data (no filtering needed client-side)

---

## 9. New Files

| File | Purpose |
|------|---------|
| `app/sign-in.tsx` | Google Sign-In screen |
| `lib/store/authStore.ts` | Zustand store: `session`, `user`, `setSession`, `clearSession` |
| `lib/supabase/auth.ts` | `signInWithGoogle()`, `signOut()`, `getSession()`, `runFirstSignInMigration()` |

---

## 10. Modified Files

| File | Change |
|------|--------|
| `app/_layout.tsx` | Check auth session before onboarding flag; redirect to `/sign-in` if no session |
| `app/sign-in.tsx` | New |
| `app/(tabs)/profile.tsx` | Add sign-out button |
| `lib/db/schema.ts` | Add `account_id`, `updated_at` columns; run migration alters on init |
| `lib/db/users.ts` | `createProfile` and `updateProfile` set `updated_at`; pass `account_id` |
| `lib/db/meals.ts` | `saveMeal` and `updateMealItem` set `updated_at` |
| `lib/supabase/sync.ts` | Update upserts to use `updated_at` WHERE clause; auth client auto-used |
| `lib/supabase/client.ts` | Pass `auth: { storage: ExpoSecureStoreAdapter }` for persistent sessions |

---

## 11. Packages

```bash
npx expo install expo-auth-session expo-web-browser expo-secure-store
```

`expo-secure-store` — for Supabase session persistence across app restarts.

---

## 12. Supabase Dashboard Setup (manual, before development)

1. Enable Google provider in Authentication → Providers
2. Add Google OAuth Client ID + Secret (from Google Cloud Console)
3. Add redirect URL: `https://<supabase-project>.supabase.co/auth/v1/callback`
4. Add Expo redirect: `exp://` and your app scheme
5. Enable RLS on all 5 tables
6. Add the RLS policies from §5
7. Add `account_id` and `updated_at` columns to cloud tables

---

## 13. Out of Scope

- Email/password auth (Google only for now)
- Account deletion
- Transferring profiles between accounts
- Real-time sync (polling on focus is sufficient)
- Invite / family sharing across separate accounts
