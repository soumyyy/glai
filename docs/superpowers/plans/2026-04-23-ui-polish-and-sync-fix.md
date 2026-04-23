# Glai — UI Polish & Supabase Sync Fix

**Date:** 2026-04-23  
**Status:** Completed

---

## Problem

1. **Supabase sync was completely broken** — `syncPendingMeals` attempted to upsert the local user row into Supabase before syncing meals. The `users` table had an RLS policy blocking anon writes, causing a `42501` error that threw and aborted the entire function. No meals ever reached Supabase.

2. **Flow screens had mismatched UI** — `portion.tsx`, `review.tsx`, and `save-confirmation.tsx` used flat, utilitarian styling that didn't match the warm glassmorphic design language established in the tab screens (home, history, profile).

---

## Changes

### `lib/supabase/sync.ts`
- Removed the user upsert block entirely. User data is local-only in v1; there is no auth and no need to sync it to Supabase.
- Removed the now-unused `getLocalUser` import.
- Meals, meal_items, and daily_summaries sync proceeds correctly.

### `app/portion.tsx`
- Added `Atmosphere` orbs background.
- Added `useSafeAreaInsets` for proper top padding.
- Added `Stack.Screen headerShown: false` for full design control.
- Header: Back/Retake button → overline → large title → subtitle.
- Photo preview: rounded card with `borderRadius: 28`, `overflow: hidden`.
- Portion selector: 4-option grid inside a surface card, each option shows fraction + sublabel, active state uses primary colour tint.
- Info note card explaining how the multiplier works.
- CTA: pill-style "Analyse meal" button pinned to footer.

### `app/review.tsx`
- Added `Atmosphere` and `useSafeAreaInsets`.
- Replaced `FlatList` with `ScrollView` for design consistency.
- Item cards: `borderRadius: 26`, carb range in `Colors.carbs` at 20px, 4-column macro row with dividers, "tap to edit" hint, pill remove button.
- Warning banners: amber/red card style with title + body text.
- Footer pinned absolutely: live totals row with colour-coded values + "Confirm & Save" pill CTA.
- Edit/add modal: drag handle, rounded sheet, cancel + save pill buttons.

### `app/save-confirmation.tsx`
- Added `Atmosphere` and `useSafeAreaInsets`.
- Macro summary card matches home screen hero card style: colour-coded values, dividers, item count + portion subnote.
- Field labels: uppercase, 700 weight, 1.1 letter-spacing.
- Meal type chips: pill style, primary tint when active.
- Notes field: multiline, surface background.
- Save footer pinned absolutely, green pill CTA.

### Supabase RLS (manual — run in SQL Editor)
```sql
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_meals" ON meals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_meal_items" ON meal_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_daily_summaries" ON daily_summaries FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## What's next

- Verify meals are appearing in the Supabase dashboard after logging
- Consider adding a visible sync status indicator on the Home screen
- CSV export (in PRD scope for v1)
- Delete meal from Meal Detail screen (PRD scope)
