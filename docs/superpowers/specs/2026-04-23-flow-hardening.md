# 2026-04-23 Flow Hardening

## Scope

This pass tightens the Screen 3 to Screen 5 flow against the PRD, with emphasis on reliability and debugging rather than visual treatment.

## Changes

- Added a recovery pass for nutrition estimation when the primary OpenAI result is empty or fails response validation.
- Marked clearly unusable nutrition output as a hard error instead of silently continuing with zero-value estimates.
- Added Screen 4 warning banners for low AI confidence and poor image quality, matching the PRD copy.
- Added Screen 5 save guards and explicit logs around local save, daily summary recompute, and background Supabase sync.
- Added Supabase sync logs for client availability, meal/item/summary upserts, delete sync, and per-record failures.
- Added cloud restore so a reinstall can pull Supabase meals, items, and summaries back into local SQLite.
- Added user-facing analysis failure messages that distinguish connection problems from LM issues.

## Expected Behavior

- If identification succeeds but estimation returns unusable JSON or empty values, the app makes one best-effort recovery call before failing.
- Review shows plain-language warnings when the photo is low-confidence or hard to read.
- Save failures and sync failures now surface clearly in Metro logs with step-specific prefixes:
  - `[Save] ...`
  - `[Sync] ...`
  - `[OpenAI] ...`
- Deleting a synced meal queues a cloud delete in `pending_deletes`; the next sync removes cloud meal rows and refreshes or removes the related daily summary.
- Home focus runs a local-first cloud cycle: push pending local changes, then restore cloud records into SQLite and refresh the visible day.
- Profile includes a manual "Restore from cloud" action for reinstall/recovery checks.

## PRD Alignment

- Screen 3: analysis remains the single trigger point for both OpenAI calls.
- Screen 4: warnings now match the low-confidence and poor-image behavior described in the PRD.
- Screen 5: save still writes locally first, then syncs in the background, while producing enough logs to diagnose backend issues quickly.
