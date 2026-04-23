# PRD: Phase 1 — ICR & Fiasp Suggestion

**Date:** 2026-04-23  
**Status:** Ready for implementation  
**Scope:** Profile ICR field + Fiasp bolus suggestion on meal detail screen

---

## Goal

Give the active user a suggested Fiasp bolus dose immediately after logging a meal, calculated from the meal's carbohydrate estimate and a stored insulin-to-carb ratio (ICR). No blood glucose input. No correction dose. Just carb coverage.

---

## Background

The user's mother is on a basal–bolus insulin regimen:
- **Toujeo 13u** — fixed basal, once daily in the morning. App does not touch this.
- **Fiasp** — rapid-acting bolus at meals to cover carbohydrate intake.

The standard bolus formula for carb coverage:
```
Fiasp units = Total carbs ÷ ICR
```

Where ICR (insulin-to-carb ratio) is a number set by her endocrinologist, e.g. `10` means 1 unit per 10g of carbs.

Since the app already tracks carbs as a range (low–high), the suggestion will also be a range:
```
Low suggestion  = carbs_low_midpoint  ÷ ICR  (rounded to nearest 0.5u)
High suggestion = carbs_high_midpoint ÷ ICR  (rounded to nearest 0.5u)
```

Where `carbs_midpoint` per meal = `(total_carbs_low_g + total_carbs_high_g) / 2` — same midpoint already used for daily summaries.

---

## Out of Scope (Phase 1)

- Blood glucose / pre-meal BG entry
- Correction dose calculation
- Insulin sensitivity factor (ISF)
- Insulin on board (IOB) tracking
- CGM integration
- Toujeo reminders
- Any medical validation or clinical integration

---

## Data Model Changes

### `users` table — add one column

```sql
ALTER TABLE users ADD COLUMN insulin_to_carb_ratio REAL;
```

- Type: `REAL` (nullable)
- Null means ICR not set — suggestion is hidden everywhere
- Example value: `10.0` (1 unit per 10g carbs)
- No upper/lower bound enforced in DB; UI validates to a sensible range (5–50)

### No changes to `meals` or any other table

The suggestion is always computed on the fly from the stored carb values. It is never persisted — Phase 1 has no insulin logging.

---

## Profile Screen Changes

### Where

The existing "Add profile" form and a new "Edit profile" flow (see below).

### Fields to add

| Label | Input type | Placeholder | Validation |
|---|---|---|---|
| Insulin-to-carb ratio | Decimal keyboard | e.g. 10 | 5–50, optional |

Display hint below the input:
> "1 unit of Fiasp per X grams of carbs · set by your doctor"

### Edit profile (new capability)

Currently there is no way to edit an existing profile's age/weight/ICR after creation. Phase 1 adds this.

Tapping an **active profile row** in the sheet opens an edit form (same layout as the add form) pre-filled with existing values. Non-active profiles can only be switched to or deleted — no inline edit.

Edit form fields: Name, Age, Weight, ICR.  
Save button: "Save changes"  
On save: update the `users` row in SQLite, call `reloadProfiles()`.

### Display on profile identity card

If ICR is set, add it to the stats row alongside Age and Weight:

```
Age      Weight     ICR
34       62 kg      1:10
```

Format: `1:XX` where XX is the stored value (e.g. 10 → `1:10`).  
If ICR is null: show `—` like the other fields.

---

## Meal Detail Screen Changes (`app/meal/[id].tsx`)

### Condition to show suggestion

Only show if:
1. The meal's `user_id` matches a profile that has a non-null `insulin_to_carb_ratio`
2. ICR value is between 5 and 50 (sanity guard)

If either condition fails: render nothing. No empty state, no prompt to set ICR.

### Calculation

```ts
const carbsMid = (meal.total_carbs_low_g + meal.total_carbs_high_g) / 2;
const rawLow   = meal.total_carbs_low_g  / icr;
const rawHigh  = meal.total_carbs_high_g / icr;

// Round to nearest 0.5 unit
function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

const suggestLow  = roundHalf(rawLow);
const suggestHigh = roundHalf(rawHigh);
```

If `suggestLow === suggestHigh`, display a single value (e.g. `3u`).  
If they differ, display a range (e.g. `2.5–3.5u`).  
Minimum displayed value: `0.5u`. If calculation rounds to 0, show `< 0.5u`.

### UI placement

Insert a new card section between the macro strip and the items list, labelled **"Insulin"**.

```
─────────────────────────────────────
  Insulin

  Fiasp suggestion          2.5–3.5u
  Based on 28–40g carbs · 1:10 ratio

  Suggested dose is an estimate only.
  Always confirm with your doctor
  before adjusting insulin.
─────────────────────────────────────
```

**Visual spec:**
- Section label: same `sectionTitle` style used elsewhere (`12px, uppercase, textMuted`)
- Card: same `card` style (surface background, border, 20px border radius)
- Top row: `Fiasp suggestion` left in `14px semibold text` — dose right in `20px bold primary green`
- Sub-row: `Based on Xg–Xg carbs · 1:XX ratio` in `12px textMuted`
- Disclaimer: below a hairline divider, `12px textMuted italic`, full width

### Disclaimer text (exact copy)

> Suggested dose is an estimate only. Always confirm with your doctor before adjusting insulin.

No icons, no warning colours, no alert styling — plain muted text. It should feel informational, not alarming.

---

## `lib/db/users.ts` Changes

Add ICR to the `UserRow` interface:

```ts
export interface UserRow {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  insulin_to_carb_ratio: number | null;  // new
  created_at: string;
}
```

Update `createProfile` to accept and store `icr`:

```ts
export function createProfile(
  name: string,
  age: number | null,
  weight_kg: number | null,
  icr: number | null,
): UserRow
```

Add `updateProfile`:

```ts
export function updateProfile(
  id: string,
  patch: { name?: string; age?: number | null; weight_kg?: number | null; insulin_to_carb_ratio?: number | null },
): void
```

---

## `lib/db/schema.ts` Changes

Add the migration inside `initDb`:

```ts
db.execSync(`ALTER TABLE users ADD COLUMN insulin_to_carb_ratio REAL;`);
```

Wrap in a try/catch since `ALTER TABLE ADD COLUMN` throws if the column already exists (idempotency for devices that already have the column).

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| ICR not set on profile | Insulin card hidden entirely on meal detail |
| ICR set but meal has 0 carbs | Show `< 0.5u` |
| Low and high carb suggestion round to the same value | Show single value, not a range |
| Profile has ICR but meal belongs to a different user_id | Hidden (different family member, different regimen) |
| ICR value outside 5–50 | Treated as null — card hidden. UI prevents saving out-of-range values |
| Very large meal (e.g. 120g carbs, ICR 10) | Shows `12u` — no cap, no warning in Phase 1 |

---

## Files to Touch

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `ALTER TABLE users ADD COLUMN insulin_to_carb_ratio REAL` |
| `lib/db/users.ts` | Update `UserRow`, `createProfile`, add `updateProfile` |
| `app/(tabs)/profile.tsx` | Add ICR field to add form, add edit form for active profile, show ICR in stats row |
| `app/meal/[id].tsx` | Add insulin suggestion card |

No changes to `meals.ts`, `summaries.ts`, `sync.ts`, or any AI layer.

---

## What Success Looks Like

1. User opens profile sheet, taps active profile → edit form opens pre-filled
2. She enters ICR (e.g. `10`) and saves
3. Stats row on profile card shows `1:10` under ICR
4. She logs a meal with 30–45g carbs
5. Meal detail shows: `Fiasp suggestion · 3–4.5u` with the carb basis and disclaimer
6. If she switches to a different family member profile that has no ICR set, the card is invisible on their meals
