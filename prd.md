# Glai — Product Requirements Document
**Version:** 1.1 (Finalised Planning)  
**Author:** Soumya Maheshwari  
**Last Updated:** April 2026  
**Status:** Ready for Development

---

## 1. Problem Statement

Managing diabetes requires knowing exactly how many carbohydrates are in every meal. Most diabetic patients in India either skip carb counting entirely (too tedious) or estimate loosely (too inaccurate).

**Glai** makes carb counting effortless. Photo → AI identifies the food → user confirms → full nutrition breakdown saved. That's the entire loop.

**What Glai does:** Photo → nutrition breakdown (carbs, protein, fat, calories) → saved log → daily and historical summary.  
**What Glai does not do:** Calculate or suggest insulin doses. That stays between her and her doctor.

---

## 2. User

### Primary User (v1)
- 46-year-old woman, 70kg
- Type 2 diabetic on dual insulin therapy (short-acting + long-acting)
- Based in Mumbai
- Eats primarily Indian home-cooked food
- Single user — no login required in v1

### Designed for Scale
- Database is built with `user_id` on every record from day one
- v1 uses a hardcoded local UUID as the default user
- Adding multi-user auth later = adding an auth layer on top, no schema changes needed

---

## 3. Core Principles

| Principle | What it means |
|---|---|
| Accuracy over speed | Better to show a range honestly than a precise wrong number |
| No insulin guidance | The app counts carbs. The doctor handles dosing. |
| Offline-friendly | Internet needed to log new meals. All saved data accessible offline. |
| No photo storage | Photos are used to query GPT-4o and then discarded. Only nutrition data is saved. |
| Confirmations before saving | User always reviews and confirms AI output before anything is written to the database |

---

## 4. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native (Expo managed) | Fast iteration, good camera/image picker support |
| Camera | expo-camera + expo-image-picker | Native camera, gallery fallback |
| Vision + Nutrition | GPT-4o Vision (OpenAI) — sole source | Best food recognition, handles Indian cuisine well |
| Local DB | expo-sqlite | Structured queries, works fully offline for reads |
| Cloud DB | Supabase (postgres) | Syncs local data to cloud, ready for multi-user |
| Navigation | Expo Router (file-based) | Clean screen structure |
| State | Zustand | Lightweight, no boilerplate |

### Data Flow
```
Photo taken
  → Compressed to max 1200px
  → Sent to GPT-4o (Step 1: identify dishes)
  → Sent to GPT-4o (Step 2: estimate portions + nutrition)
  → Shown to user on Review screen
  → User edits if needed, confirms
  → Nutrition data saved to SQLite + synced to Supabase
  → Photo discarded — never stored
```

---

## 5. Multi-Step GPT-4o Prompt Architecture

This is the core intelligence of the app. Two sequential API calls, not one.

### Step 1 — Food Identification
**Input:** Base64 image  
**Ask:** "What dishes are visible in this photo? List each item separately. Be specific — not 'rice' but 'steamed white rice'. Flag anything you're uncertain about."  
**Output:** JSON array of identified items with confidence per item  
**Why separate:** Separating identification from nutrition estimation reduces hallucination. The model focuses on one task at a time.

### Step 2 — Portion + Nutrition Estimation
**Input:** Base64 image + list of identified items from Step 1  
**Ask:** "Given these identified dishes, estimate the weight of each item visible in the photo. Then return carbs, protein, fat, and calories for each item. Return low and high estimates — not a single number. Account for typical Indian home-cooking portion sizes."  
**Output:** JSON with per-item nutrition ranges + totals  
**Why ranges:** For a diabetic, a ±15g carb error is clinically meaningful. Showing 38–52g is more honest and more useful than showing 45g with false confidence.

### Prompt constraints applied to both calls
- Temperature: `0.1` — consistent, not creative
- Response format: `json_object` — no markdown wrapping
- Image detail: `high` — better portion estimation from visual cues
- Indian food context baked into system prompt — dal, roti, rice, sabzi, idli, dosa etc. handled explicitly

---

## 6. Screen Architecture

### Bottom Navigation (persistent)
- Left: History
- Center: **Camera button** (primary action, always visible, centered)
- Right: Profile

The camera button is the heart of the app. It is always one tap away from anywhere.

---

### Screen 1 — Home / Today
**Purpose:** Single-glance daily nutrition summary.

**Contains:**
- Today's date + greeting ("Good morning, [name]")
- Four macro cards: Carbs / Protein / Fat / Calories (running daily totals)
- Meals logged today — each card shows: meal name, time, meal type tag, total carbs
- Empty state: "Nothing logged yet today. Tap the camera to add your first meal."
- Bottom nav with center camera button

**No internet needed** — reads from local SQLite only.

---

### Screen 2 — Camera
**Triggered by:** Center camera button in bottom nav.  
**Purpose:** Capture the meal photo.

**Contains:**
- Full-screen live viewfinder
- Subtle guidance text: "Frame your full plate"
- Shutter button (large, bottom center)
- "Choose from gallery" link (small, below shutter)
- Back/cancel (top left)

**Logic:**
- On capture, compress image to max 1200px wide before any API call
- Photo is held in memory only — never written to disk or gallery

---

### Screen 3 — Portion Selection
**Purpose:** Confirm how much of the plated food she actually ate.

**Contains:**
- Thumbnail preview of the captured photo
- Portion selector: Quarter / Half / Three-quarters / Full / Custom
- Custom = percentage slider (25%–200%)
- Helper: "Select how much of what's in the photo you ate"
- "Analyse" button — triggers the two GPT-4o calls

**Logic:**
- Default: Full
- Portion multiplier is applied to AI output after Step 2 completes
- "Analyse" button is the trigger point — both API calls happen here, user sees a loading state

---

### Screen 4 — Review (AI Output + User Confirmation)
**Purpose:** Show what the AI found. Let her correct anything wrong. Then confirm.

**This is the most important screen in the app.**

**Contains:**
- Detected items list — each item shows:
  - Dish name (tappable to edit/correct)
  - Estimated weight (e.g. "~180g")
  - Carb range (e.g. "32–41g") — prominent
  - Protein / Fat / Calories — secondary, shown below carbs
- AI confidence badge: High / Medium / Low
- Warning banner if confidence < 60%: "We're not confident about this photo. Please review carefully before confirming."
- Warning banner if image quality is poor: "Photo was hard to read. Consider retaking."
- "Add an item" — if she ate something the AI missed
- "Remove" option on each item — if AI hallucinated something
- Total summary bar at bottom: Total Carbs / Protein / Fat / Cal (updates live as she edits)
- "Confirm & Save" button

**Logic:**
- Portion multiplier already applied to all numbers shown
- If she corrects a dish name, the corrected name is stored alongside the original AI name
- Confirmation is explicit — she taps "Confirm & Save", not just "Next"
- Nothing is written to the database until she taps confirm

---

### Screen 5 — Save Confirmation
**Purpose:** Name the meal, tag it, save it.

**Contains:**
- Auto-generated meal name from AI output (e.g. "Dal Chawal") — editable text field
- Meal type selector: Breakfast / Lunch / Dinner / Snack (auto-suggested by time of day)
- Optional notes field (free text)
- Final macro summary (read-only, not editable here — edits happen on Screen 4)
- "Save" button

**Logic:**
- Time-of-day auto-suggestion: before 10am → Breakfast, 12–3pm → Lunch, 7–10pm → Dinner, else → Snack
- On save: write to SQLite → background sync to Supabase → navigate to Home
- Photo is discarded here — it is never stored beyond this point
- Show confirmation toast: "Meal saved"

---

### Screen 6 — History
**Purpose:** Browse past nutrition by day.

**Contains:**
- 7-day bar chart at top — each bar = total daily carbs for that day
- Below: scrollable list of past days, each showing date + carb/cal totals + meal count
- Tap any day → Day Detail screen

**No internet needed** — reads from local SQLite.

---

### Screen 7 — Day Detail
**Purpose:** Full nutrition breakdown for a specific past day.

**Contains:**
- Date header
- Daily totals: Carbs / Protein / Fat / Calories
- Simple macro distribution (e.g. "Carbs 55% · Protein 20% · Fat 25%")
- Chronological list of meals: time, meal type tag, meal name, carb total
- Tap any meal → Meal Detail screen

---

### Screen 8 — Meal Detail
**Purpose:** Full record of a single logged meal.

**Contains:**
- Meal name, date, time, meal type
- Item-by-item breakdown: name, weight, carbs range, protein, fat, calories
- Totals row
- Portion size used
- AI confidence at time of logging
- Whether any items were manually corrected (shown as a small flag)
- "Delete meal" (with confirmation dialog)

**Note:** No photo shown — photos are not stored.

---

### Screen 9 — Profile / Settings
**Purpose:** Personal info and data management.

**Contains:**
- Name (display only)
- Age, weight (stored locally, used for context in future versions)
- Units: metric / imperial
- Export data: "Export as CSV" — all meals, all macros, date range selectable
- App version
- "Clear all data" (destructive, double-confirmation required)

---

## 7. Data Model

### users table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key — hardcoded local UUID in v1 |
| name | String | Her name |
| age | Integer | |
| weight_kg | Float | |
| created_at | Timestamp | |

### meals table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → users. Ready for multi-user. |
| created_at | Timestamp | Exact logging time |
| meal_type | Enum | breakfast / lunch / dinner / snack |
| meal_name | String | Auto-generated or user-edited |
| portion_size | String | quarter / half / three-quarters / full / custom |
| portion_multiplier | Float | 0.25 – 2.0 |
| total_carbs_low_g | Float | After portion adjustment |
| total_carbs_high_g | Float | After portion adjustment |
| total_protein_g | Float | Midpoint |
| total_fat_g | Float | Midpoint |
| total_calories_kcal | Float | Midpoint |
| ai_confidence | Integer | 0–100 |
| image_quality | Enum | good / acceptable / poor |
| notes | String | Optional |
| synced_to_cloud | Boolean | Local-first sync tracking |

### meal_items table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| meal_id | UUID | Foreign key → meals |
| ai_identified_name | String | What GPT-4o called it |
| corrected_name | String | Null if user didn't correct |
| estimated_weight_g | Float | |
| carbs_low_g | Float | After portion adjustment |
| carbs_high_g | Float | After portion adjustment |
| protein_g | Float | |
| fat_g | Float | |
| calories_kcal | Float | |
| ai_notes | String | Caveats from the model |

### daily_summaries table (materialised on save)
| Field | Type | Notes |
|---|---|---|
| date | Date | Primary key |
| user_id | UUID | |
| total_carbs_g | Float | Sum of carb midpoints |
| total_protein_g | Float | |
| total_fat_g | Float | |
| total_calories_kcal | Float | |
| meal_count | Integer | |

---

## 8. Connectivity Model

| Action | Internet Required? |
|---|---|
| Log a new meal (camera + GPT-4o) | Yes |
| View today's summary | No |
| View any past meal or day | No |
| Edit or delete a saved meal | No |
| Export CSV | No |
| Sync to Supabase cloud | Yes (background, non-blocking) |

---

## 9. Accuracy & Safety Strategy

| Risk | Mitigation |
|---|---|
| Wrong food identification | Two-step prompt separates identification from estimation. User reviews on Screen 4. |
| Wrong portion estimate | User explicitly selects portion on Screen 3. AI never assumes. |
| False precision | Always show carb ranges (low–high), never single numbers |
| Low AI confidence | Yellow warning banner on Screen 4 with plain-language explanation |
| Poor photo quality | Detected and flagged, user prompted to retake |
| Mixed dishes (biryani, khichdi) | Higher uncertainty range returned and shown honestly |
| App suggests dosing | Never. No insulin logic anywhere in the app. |

---

## 10. Edge Cases

| Scenario | Handling |
|---|---|
| No internet when trying to log | Show clear message: "Logging requires internet. Your saved meals are still available." |
| GPT-4o can't identify the dish | Show "Couldn't identify this dish" + allow manual item entry by name |
| GPT-4o times out | Retry once automatically, then show error with retry button |
| User removes all AI items and adds none | "Confirm & Save" disabled until at least one item exists |
| Meal logged with low confidence | Saved normally, flagged in Meal Detail view |
| User wants to log without a photo | Not supported in v1 — photo is required for AI analysis |

---

## 11. V1 Scope

### In
- All 9 screens
- Two-step GPT-4o Vision prompt chain
- Carbs (range) + Protein + Fat + Calories per meal and per item
- Portion selector
- Review + correction screen with live-updating totals
- SQLite local storage (offline reads)
- Supabase cloud sync (background)
- Daily summary on Home screen
- 7-day chart on History screen
- Day Detail + Meal Detail screens
- CSV export
- Hardcoded local user (no login)

### Out (V2+)
- Multi-user auth (Apple Sign In / OTP)
- Apple Health integration
- CGM / glucometer connection
- Barcode scanner for packaged food
- Meal templates / re-log a past meal
- Doctor sharing portal
- Notification reminders to log meals
- Trends beyond 7 days

---

## 12. Open Questions (Resolved)

| Question | Decision |
|---|---|
| Login? | No login in v1. Hardcoded local UUID. DB schema is multi-user ready. |
| Nutrition source? | GPT-4o only. No external nutrition DB. |
| Photo storage? | Photos are never stored. Discarded after AI call. |
| Offline logging? | Not supported. Internet required to log. Saved data is fully offline. |
| Gallery support? | Yes — as a fallback on the Camera screen. |
| Export format? | CSV. PDF in v2 if her doctor needs it. |
| App name? | **Glai** |

---

*Glai v1 PRD is finalised. All open questions resolved. Ready to move to development.*
