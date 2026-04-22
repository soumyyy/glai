# Glai — Scaffold & Project Structure Design
**Date:** 2026-04-22  
**Status:** Approved

---

## 1. Scaffold Command

```bash
npx create-expo-app@latest glai
```

Uses the default Expo template which includes Expo Router + TypeScript. The project is initialized inside the `glai/` directory that already contains `prd.md`.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo managed, latest SDK) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Camera | expo-camera + expo-image-picker |
| Vision + Nutrition | GPT-4o Vision (OpenAI) — two-step prompt |
| Local DB | expo-sqlite |
| Cloud DB | Supabase (postgres) |
| State | Zustand |
| Styling | React Native StyleSheet (no external lib) |
| Secrets | expo-secure-store (API keys) |
| UUID | expo-crypto |
| Charts | react-native-gifted-charts (7-day bar chart) |

---

## 3. File Structure

```
app/
  _layout.tsx                  # Root layout — providers, fonts
  (tabs)/
    _layout.tsx                # Bottom tab bar: History | [Camera] | Profile
    index.tsx                  # Screen 1: Home / Today
    history.tsx                # Screen 6: History
    profile.tsx                # Screen 9: Profile / Settings
  camera.tsx                   # Screen 2: Camera (modal)
  portion.tsx                  # Screen 3: Portion Selection
  review.tsx                   # Screen 4: Review (most critical)
  save-confirmation.tsx        # Screen 5: Save Confirmation
  day/[date].tsx               # Screen 7: Day Detail
  meal/[id].tsx                # Screen 8: Meal Detail

lib/
  ai/
    identify.ts                # GPT-4o Step 1: food identification prompt
    estimate.ts                # GPT-4o Step 2: portion + nutrition estimation
    types.ts                   # Shared AI response types
  db/
    schema.ts                  # SQLite table creation (users, meals, meal_items, daily_summaries)
    meals.ts                   # Meal CRUD queries
    summaries.ts               # Daily summary queries
  supabase/
    client.ts                  # Supabase client init
    sync.ts                    # Background sync logic
  store/
    mealStore.ts               # Zustand: in-progress meal state (capture → review → save)
    summaryStore.ts            # Zustand: today's summary cache

components/
  MacroCard.tsx                # Carb / Protein / Fat / Cal display card
  MealListItem.tsx             # Row in today's meal list
  MealItemRow.tsx              # Per-dish row on Review screen
  PortionPicker.tsx            # Quarter / Half / Full / Custom selector
  TotalBar.tsx                 # Live-updating totals bar on Review screen
  ConfidenceBadge.tsx          # High / Medium / Low badge

constants/
  colors.ts                    # App color palette
  user.ts                      # Hardcoded local user UUID + profile defaults
```

---

## 4. Navigation Architecture

Bottom tab bar (persistent):
- **Left tab:** History (Screen 6)
- **Center tab:** Camera button — styled as a raised center action button, navigates to Camera screen as a modal
- **Right tab:** Profile (Screen 9)

Home screen (Screen 1) is the default tab (`index.tsx`).

Camera, Portion, Review, and Save Confirmation are a sequential modal stack — user moves forward through them and returns to Home on save.

Day Detail and Meal Detail are pushed from History.

---

## 5. GPT-4o Prompt Architecture

Two sequential API calls per meal log:

**Step 1 — Identification (`lib/ai/identify.ts`)**
- Input: base64 image (compressed to max 1200px)
- System prompt: Indian food context (dal, roti, rice, sabzi, idli, dosa etc.)
- Ask: identify dishes, flag uncertainty
- Output: `{ items: [{ name, confidence }] }`
- Config: `temperature: 0.1`, `response_format: json_object`, `detail: high`

**Step 2 — Estimation (`lib/ai/estimate.ts`)**
- Input: base64 image + Step 1 item list
- Ask: weight per item, carb/protein/fat/cal ranges (low + high), typical Indian home-cooking portions
- Output: `{ items: [{ name, weight_g, carbs_low, carbs_high, protein, fat, calories, notes }], overall_confidence, image_quality }`
- Config: same as Step 1

Portion multiplier (from Screen 3) is applied client-side after Step 2 — AI always estimates for full plate.

---

## 6. Data Flow

```
Camera capture
  → compress to 1200px (in memory, never written to disk)
  → Portion screen: user selects portion multiplier
  → "Analyse" tap:
      → Step 1 GPT-4o call (identify)
      → Step 2 GPT-4o call (estimate)
      → apply portion multiplier to all nutrition values
  → Review screen: user edits/confirms
  → Save Confirmation: user names + tags meal
  → "Save" tap:
      → write to SQLite (meals + meal_items + daily_summaries)
      → background Supabase sync
      → discard photo
      → navigate to Home
```

---

## 7. Environment Variables

Stored in `.env.local` (gitignored). Accessed via `expo-constants` or `process.env`:

```
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The OpenAI key is client-side (acceptable for v1 single-user; move to edge function in v2).

---

## 8. Local User

Hardcoded in `constants/user.ts`:
```ts
export const LOCAL_USER_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'; // generated once via expo-crypto at scaffold time
export const LOCAL_USER = { id: LOCAL_USER_ID, name: 'User', age: 46, weight_kg: 70 };
```

DB schema is multi-user ready (all tables have `user_id`). Adding auth later = adding an auth layer, no schema migration needed.

---

## 9. What's Out of Scope for Scaffold

- Auth / login
- Actual screen UI implementation (content of each screen)
- GPT-4o prompt tuning
- Supabase table creation (handled separately via Supabase dashboard)
- Any v2 features
