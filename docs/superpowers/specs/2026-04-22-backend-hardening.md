# Glai — Backend Hardening Notes
**Date:** 2026-04-22
**Status:** Implemented

## Scope

This pass hardens the non-UI backend surface for v1:

- OpenAI meal analysis
- local SQLite persistence
- Supabase cloud sync
- CLI-based Supabase workflow

## Implemented changes

### 1. OpenAI analysis is now schema-validated

The two-step analysis flow still follows the PRD:

1. identify dishes
2. estimate nutrition

The integration now adds:

- shared request helper
- request timeouts
- bounded retries for transient failures
- structured JSON-schema output instead of loose JSON mode
- runtime validation of model responses before the app accepts them

### 2. Meals now store an explicit local day

`created_at` remains the exact timestamp, but meals now also store `logged_on_date`.

Why:

- grouping by `date(created_at)` on UTC timestamps can shift late-night meals into the wrong day
- daily summaries should reflect the user’s local calendar day

Effects:

- `getMealsForDate()` now filters by `logged_on_date`
- `upsertDailySummary()` now aggregates by `logged_on_date`
- cloud sync sends that field too

### 3. Save operations are more durable

Meal save now uses a SQLite transaction so the meal row and all meal items succeed or fail together.

### 4. Supabase sync is safer

Sync now:

- no-ops cleanly when Supabase env vars are missing
- syncs the local user row first
- upserts meals, meal items, and daily summaries
- marks a meal as synced locally only after the related cloud writes succeed

### 5. Supabase CLI workflow is part of the repo

The repo now contains:

- `supabase/config.toml`
- `supabase/migrations/20260422_init_glai.sql`
- `supabase/seed.sql`

This allows database changes to be managed from the repo using the Supabase CLI instead of relying on the dashboard for normal schema work.

Current status:

- hosted project ref: `ryzxpkpfsmmxutkfwknc`
- CLI link: complete
- initial migration: pushed successfully

## Environment conventions

The app accepts:

- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_OPENAI_MODEL` (optional, defaults to a GPT-4o snapshot)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

For Supabase, either key name is accepted.

Currently accepted env names:

- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Remaining limitations

- Supabase sync is still client-driven in v1, which is fine for a trusted single-user prototype but not ideal for broader distribution.
- Real security for cloud sync will require either auth with RLS or a server/edge-function write layer.
- The main tab UI and read-only screens still need the polished pass, including the liquid-glass bottom navigation requested for history/profile/camera.
