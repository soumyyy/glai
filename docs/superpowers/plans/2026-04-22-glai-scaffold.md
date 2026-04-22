# Glai — Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete Glai React Native Expo project with all 9 screen placeholders, lib architecture (ai, db, supabase, store), SQLite schema, Zustand stores, shared components, and environment setup — every file valid TypeScript with a real export.

**Architecture:** Bootstrap with `create-expo-app@latest` (Expo Router + TypeScript), remove default boilerplate, then layer in the full file structure. All screens are valid placeholder components. All lib files export real types and stubs. Navigation is wired up in `_layout.tsx` files. SQLite schema is initialised at app startup.

**Tech Stack:** React Native (Expo managed), Expo Router, TypeScript, Zustand, expo-sqlite, @supabase/supabase-js, expo-camera, expo-image-picker, expo-crypto, expo-secure-store, react-native-gifted-charts, react-native-svg, react-native-url-polyfill

---

## File Map

**Created / replaced by this plan:**

```
app/_layout.tsx                   Root layout — init DB, declare Stack screens
app/(tabs)/_layout.tsx            Tab bar: History | [Camera center] | Profile
app/(tabs)/index.tsx              Screen 1: Home / Today (placeholder)
app/(tabs)/history.tsx            Screen 6: History (placeholder)
app/(tabs)/profile.tsx            Screen 9: Profile / Settings (placeholder)
app/camera.tsx                    Screen 2: Camera (modal placeholder)
app/portion.tsx                   Screen 3: Portion Selection (modal placeholder)
app/review.tsx                    Screen 4: Review (modal placeholder)
app/save-confirmation.tsx         Screen 5: Save Confirmation (modal placeholder)
app/day/[date].tsx                Screen 7: Day Detail (placeholder)
app/meal/[id].tsx                 Screen 8: Meal Detail (placeholder)

constants/colors.ts               App color palette
constants/user.ts                 Hardcoded local user UUID + profile

lib/ai/types.ts                   Shared AI response types
lib/ai/identify.ts                GPT-4o Step 1 stub
lib/ai/estimate.ts                GPT-4o Step 2 stub

lib/db/schema.ts                  SQLite openDb + initSchema
lib/db/meals.ts                   Meal CRUD query stubs
lib/db/summaries.ts               Daily summary query stubs

lib/supabase/client.ts            Supabase client init
lib/supabase/sync.ts              Background sync stub

lib/store/mealStore.ts            Zustand: in-progress meal draft
lib/store/summaryStore.ts         Zustand: today's summary cache

components/MacroCard.tsx          Placeholder component
components/MealListItem.tsx       Placeholder component
components/MealItemRow.tsx        Placeholder component
components/PortionPicker.tsx      Placeholder component
components/TotalBar.tsx           Placeholder component
components/ConfidenceBadge.tsx    Placeholder component

.env.local                        Gitignored env var template
.gitignore (modify)               Ensure .env.local is ignored
```

---

## Task 1: Scaffold Expo project

**Files:** All Expo boilerplate in `/Users/soumya/Desktop/glai/`

- [ ] **Step 1: Run create-expo-app in the project directory**

```bash
cd /Users/soumya/Desktop/glai
npx create-expo-app@latest . --yes
```

If prompted about existing files, confirm to continue. The existing `prd.md` and `docs/` will not be touched.

Expected output: `Your project is ready!` message with the installed Expo SDK version.

- [ ] **Step 2: Verify scaffold succeeded**

```bash
ls /Users/soumya/Desktop/glai/
```

Expected: `app/`, `assets/`, `package.json`, `tsconfig.json`, `app.json` are present alongside the existing `prd.md` and `docs/`.

- [ ] **Step 3: Remove default boilerplate screens that conflict with our structure**

```bash
cd /Users/soumya/Desktop/glai
rm -f app/\(tabs\)/explore.tsx
rm -f components/Collapsible.tsx components/ExternalLink.tsx components/HelloWave.tsx components/ParallaxScrollView.tsx components/ThemedText.tsx components/ThemedView.tsx components/HapticTab.tsx
rm -rf components/__tests__ app/+not-found.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit
```

Expected: No errors (or only errors about the removed default files, which is fine — we replace them next).

- [ ] **Step 5: Commit baseline**

```bash
cd /Users/soumya/Desktop/glai
git init
git add .
git commit -m "feat: bootstrap Expo project with create-expo-app"
```

---

## Task 2: Install all dependencies

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install Expo-managed packages**

These must be installed with `npx expo install` so Expo picks compatible versions:

```bash
cd /Users/soumya/Desktop/glai
npx expo install expo-camera expo-image-picker expo-sqlite expo-secure-store expo-crypto expo-file-system react-native-svg
```

- [ ] **Step 2: Install non-Expo packages**

```bash
cd /Users/soumya/Desktop/glai
npm install zustand @supabase/supabase-js react-native-gifted-charts react-native-url-polyfill
```

- [ ] **Step 3: Verify no peer dependency errors**

```bash
cd /Users/soumya/Desktop/glai && npm ls --depth=0 2>&1 | grep -i "peer\|unmet\|error" || echo "No peer issues"
```

Expected: `No peer issues` or only warnings (not errors).

- [ ] **Step 4: Commit dependencies**

```bash
cd /Users/soumya/Desktop/glai
git add package.json package-lock.json
git commit -m "feat: install all project dependencies"
```

---

## Task 3: Set up constants/

**Files:**
- Create: `constants/colors.ts`
- Create: `constants/user.ts`

- [ ] **Step 1: Create constants/colors.ts**

```typescript
// constants/colors.ts
export const Colors = {
  primary: '#2563EB',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  carbs: '#F59E0B',
  protein: '#10B981',
  fat: '#EF4444',
  calories: '#8B5CF6',
  warning: '#FCD34D',
  error: '#DC2626',
  success: '#16A34A',
  tabBar: '#FFFFFF',
  tabIcon: '#9CA3AF',
  tabIconActive: '#2563EB',
};
```

- [ ] **Step 2: Create constants/user.ts**

```typescript
// constants/user.ts
export const LOCAL_USER_ID = '6d3feca9-001f-40b8-baf0-089a1950c4ba';

export const LOCAL_USER = {
  id: LOCAL_USER_ID,
  name: 'User',
  age: 46,
  weight_kg: 70,
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors in constants files.

- [ ] **Step 4: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add constants/
git commit -m "feat: add colors and local user constants"
```

---

## Task 4: Set up lib/ai/

**Files:**
- Create: `lib/ai/types.ts`
- Create: `lib/ai/identify.ts`
- Create: `lib/ai/estimate.ts`

- [ ] **Step 1: Create lib/ai/types.ts**

```typescript
// lib/ai/types.ts
export interface IdentifiedItem {
  name: string;
  confidence: number; // 0–100
}

export interface IdentifyResponse {
  items: IdentifiedItem[];
}

export interface NutritionItem {
  name: string;
  ai_identified_name: string;
  estimated_weight_g: number;
  carbs_low_g: number;
  carbs_high_g: number;
  protein_g: number;
  fat_g: number;
  calories_kcal: number;
  ai_notes: string;
}

export interface EstimateResponse {
  items: NutritionItem[];
  overall_confidence: number; // 0–100
  image_quality: 'good' | 'acceptable' | 'poor';
}
```

- [ ] **Step 2: Create lib/ai/identify.ts**

```typescript
// lib/ai/identify.ts
import type { IdentifyResponse } from './types';

const SYSTEM_PROMPT = `You are a food identification expert specialising in Indian home-cooked cuisine.
Common dishes include: dal, roti, rice (steamed/fried), sabzi, idli, dosa, sambar, chutney, paratha, khichdi, biryani, rajma, chole, poha, upma, and more.
Identify each dish separately and precisely — not "rice" but "steamed white rice".
Flag anything you are uncertain about with a lower confidence score.`;

export async function identifyFoods(imageBase64: string): Promise<IdentifyResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: 'What dishes are visible in this photo? List each item separately. Return JSON: { "items": [{ "name": string, "confidence": number (0-100) }] }',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI identify failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return JSON.parse(content) as IdentifyResponse;
}
```

- [ ] **Step 3: Create lib/ai/estimate.ts**

```typescript
// lib/ai/estimate.ts
import type { IdentifiedItem, EstimateResponse } from './types';

const SYSTEM_PROMPT = `You are a nutrition expert specialising in Indian home-cooked cuisine.
Given identified dishes, estimate weights and nutrition ranges. Always return LOW and HIGH estimates — never a single number.
Account for typical Indian home-cooking portion sizes.
For mixed dishes (biryani, khichdi), use wider uncertainty ranges.`;

export async function estimateNutrition(
  imageBase64: string,
  identifiedItems: IdentifiedItem[],
): Promise<EstimateResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const itemList = identifiedItems.map((i) => `- ${i.name}`).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `The following dishes are in this photo:\n${itemList}\n\nFor each dish, estimate weight and nutrition. Return JSON:\n{\n  "items": [{\n    "name": string,\n    "ai_identified_name": string,\n    "estimated_weight_g": number,\n    "carbs_low_g": number,\n    "carbs_high_g": number,\n    "protein_g": number,\n    "fat_g": number,\n    "calories_kcal": number,\n    "ai_notes": string\n  }],\n  "overall_confidence": number (0-100),\n  "image_quality": "good" | "acceptable" | "poor"\n}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI estimate failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return JSON.parse(content) as EstimateResponse;
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors in lib/ai files.

- [ ] **Step 5: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add lib/ai/
git commit -m "feat: add GPT-4o two-step AI layer (identify + estimate)"
```

---

## Task 5: Set up lib/db/ SQLite schema

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/meals.ts`
- Create: `lib/db/summaries.ts`

- [ ] **Step 1: Create lib/db/schema.ts**

```typescript
// lib/db/schema.ts
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('glai.db');
  }
  return db;
}

export function initSchema(): void {
  const database = getDb();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER,
      weight_kg REAL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      meal_name TEXT NOT NULL,
      portion_size TEXT NOT NULL,
      portion_multiplier REAL NOT NULL,
      total_carbs_low_g REAL NOT NULL,
      total_carbs_high_g REAL NOT NULL,
      total_protein_g REAL NOT NULL,
      total_fat_g REAL NOT NULL,
      total_calories_kcal REAL NOT NULL,
      ai_confidence INTEGER NOT NULL,
      image_quality TEXT NOT NULL CHECK(image_quality IN ('good','acceptable','poor')),
      notes TEXT,
      synced_to_cloud INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meal_items (
      id TEXT PRIMARY KEY,
      meal_id TEXT NOT NULL,
      ai_identified_name TEXT NOT NULL,
      corrected_name TEXT,
      estimated_weight_g REAL NOT NULL,
      carbs_low_g REAL NOT NULL,
      carbs_high_g REAL NOT NULL,
      protein_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      calories_kcal REAL NOT NULL,
      ai_notes TEXT,
      FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_summaries (
      date TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_carbs_g REAL NOT NULL DEFAULT 0,
      total_protein_g REAL NOT NULL DEFAULT 0,
      total_fat_g REAL NOT NULL DEFAULT 0,
      total_calories_kcal REAL NOT NULL DEFAULT 0,
      meal_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, user_id)
    );
  `);
}
```

- [ ] **Step 2: Create lib/db/meals.ts**

```typescript
// lib/db/meals.ts
import * as Crypto from 'expo-crypto';
import { getDb } from './schema';
import type { NutritionItem } from '../ai/types';
import { LOCAL_USER_ID } from '../../constants/user';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PortionSize = 'quarter' | 'half' | 'three-quarters' | 'full' | 'custom';

export interface MealRow {
  id: string;
  user_id: string;
  created_at: string;
  meal_type: MealType;
  meal_name: string;
  portion_size: PortionSize;
  portion_multiplier: number;
  total_carbs_low_g: number;
  total_carbs_high_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_calories_kcal: number;
  ai_confidence: number;
  image_quality: 'good' | 'acceptable' | 'poor';
  notes: string | null;
  synced_to_cloud: number;
}

export interface MealItemRow {
  id: string;
  meal_id: string;
  ai_identified_name: string;
  corrected_name: string | null;
  estimated_weight_g: number;
  carbs_low_g: number;
  carbs_high_g: number;
  protein_g: number;
  fat_g: number;
  calories_kcal: number;
  ai_notes: string | null;
}

export interface SaveMealParams {
  mealType: MealType;
  mealName: string;
  portionSize: PortionSize;
  portionMultiplier: number;
  items: NutritionItem[];
  aiConfidence: number;
  imageQuality: 'good' | 'acceptable' | 'poor';
  notes?: string;
}

export function saveMeal(params: SaveMealParams): string {
  const db = getDb();
  const mealId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const totals = params.items.reduce(
    (acc, item) => ({
      carbs_low: acc.carbs_low + item.carbs_low_g,
      carbs_high: acc.carbs_high + item.carbs_high_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories_kcal,
    }),
    { carbs_low: 0, carbs_high: 0, protein: 0, fat: 0, calories: 0 },
  );

  db.runSync(
    `INSERT INTO meals (id, user_id, created_at, meal_type, meal_name, portion_size, portion_multiplier,
      total_carbs_low_g, total_carbs_high_g, total_protein_g, total_fat_g, total_calories_kcal,
      ai_confidence, image_quality, notes, synced_to_cloud)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      mealId, LOCAL_USER_ID, now, params.mealType, params.mealName,
      params.portionSize, params.portionMultiplier,
      totals.carbs_low, totals.carbs_high, totals.protein, totals.fat, totals.calories,
      params.aiConfidence, params.imageQuality, params.notes ?? null,
    ],
  );

  for (const item of params.items) {
    db.runSync(
      `INSERT INTO meal_items (id, meal_id, ai_identified_name, corrected_name, estimated_weight_g,
        carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal, ai_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(), mealId, item.ai_identified_name, item.name !== item.ai_identified_name ? item.name : null,
        item.estimated_weight_g, item.carbs_low_g, item.carbs_high_g,
        item.protein_g, item.fat_g, item.calories_kcal, item.ai_notes || null,
      ],
    );
  }

  return mealId;
}

export function getMealsForDate(date: string): MealRow[] {
  const db = getDb();
  return db.getAllSync<MealRow>(
    `SELECT * FROM meals WHERE user_id = ? AND date(created_at) = ? ORDER BY created_at ASC`,
    [LOCAL_USER_ID, date],
  );
}

export function getMealById(mealId: string): MealRow | null {
  const db = getDb();
  return db.getFirstSync<MealRow>(`SELECT * FROM meals WHERE id = ?`, [mealId]);
}

export function getMealItems(mealId: string): MealItemRow[] {
  const db = getDb();
  return db.getAllSync<MealItemRow>(`SELECT * FROM meal_items WHERE meal_id = ?`, [mealId]);
}

export function deleteMeal(mealId: string): void {
  const db = getDb();
  db.runSync(`DELETE FROM meals WHERE id = ?`, [mealId]);
}

export function getUnsynced(): MealRow[] {
  const db = getDb();
  return db.getAllSync<MealRow>(
    `SELECT * FROM meals WHERE user_id = ? AND synced_to_cloud = 0`,
    [LOCAL_USER_ID],
  );
}

export function markSynced(mealId: string): void {
  const db = getDb();
  db.runSync(`UPDATE meals SET synced_to_cloud = 1 WHERE id = ?`, [mealId]);
}
```

- [ ] **Step 3: Create lib/db/summaries.ts**

```typescript
// lib/db/summaries.ts
import { getDb } from './schema';
import { LOCAL_USER_ID } from '../../constants/user';

export interface DailySummaryRow {
  date: string;
  user_id: string;
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_calories_kcal: number;
  meal_count: number;
}

export function upsertDailySummary(date: string): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO daily_summaries (date, user_id, total_carbs_g, total_protein_g, total_fat_g, total_calories_kcal, meal_count)
     SELECT ?, ?, 
       COALESCE(SUM((total_carbs_low_g + total_carbs_high_g) / 2), 0),
       COALESCE(SUM(total_protein_g), 0),
       COALESCE(SUM(total_fat_g), 0),
       COALESCE(SUM(total_calories_kcal), 0),
       COUNT(*)
     FROM meals WHERE user_id = ? AND date(created_at) = ?
     ON CONFLICT(date, user_id) DO UPDATE SET
       total_carbs_g = excluded.total_carbs_g,
       total_protein_g = excluded.total_protein_g,
       total_fat_g = excluded.total_fat_g,
       total_calories_kcal = excluded.total_calories_kcal,
       meal_count = excluded.meal_count`,
    [date, LOCAL_USER_ID, LOCAL_USER_ID, date],
  );
}

export function getSummaryForDate(date: string): DailySummaryRow | null {
  const db = getDb();
  return db.getFirstSync<DailySummaryRow>(
    `SELECT * FROM daily_summaries WHERE date = ? AND user_id = ?`,
    [date, LOCAL_USER_ID],
  );
}

export function getSummariesForRange(startDate: string, endDate: string): DailySummaryRow[] {
  const db = getDb();
  return db.getAllSync<DailySummaryRow>(
    `SELECT * FROM daily_summaries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC`,
    [LOCAL_USER_ID, startDate, endDate],
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors in lib/db files.

- [ ] **Step 5: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add lib/db/
git commit -m "feat: add SQLite schema and meal/summary query layer"
```

---

## Task 6: Set up lib/supabase/

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/sync.ts`

- [ ] **Step 1: Create lib/supabase/client.ts**

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Create lib/supabase/sync.ts**

```typescript
// lib/supabase/sync.ts
import { supabase } from './client';
import { getUnsynced, getMealItems, markSynced } from '../db/meals';

export async function syncPendingMeals(): Promise<void> {
  const unsynced = getUnsynced();
  if (unsynced.length === 0) return;

  for (const meal of unsynced) {
    try {
      const items = getMealItems(meal.id);

      const { error: mealError } = await supabase.from('meals').upsert({
        ...meal,
        synced_to_cloud: true,
      });
      if (mealError) throw mealError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('meal_items').upsert(items);
        if (itemsError) throw itemsError;
      }

      markSynced(meal.id);
    } catch (err) {
      // Non-blocking — failed syncs will retry on next call
      console.warn(`Sync failed for meal ${meal.id}:`, err);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add lib/supabase/
git commit -m "feat: add Supabase client and background sync layer"
```

---

## Task 7: Set up lib/store/ Zustand stores

**Files:**
- Create: `lib/store/mealStore.ts`
- Create: `lib/store/summaryStore.ts`

- [ ] **Step 1: Create lib/store/mealStore.ts**

```typescript
// lib/store/mealStore.ts
import { create } from 'zustand';
import type { NutritionItem } from '../ai/types';
import type { PortionSize } from '../db/meals';

export type { PortionSize };

interface MealDraft {
  imageBase64: string | null;
  portionSize: PortionSize;
  portionMultiplier: number;
  items: NutritionItem[];
  overallConfidence: number;
  imageQuality: 'good' | 'acceptable' | 'poor';
}

interface MealStore {
  draft: MealDraft;
  setImage: (base64: string) => void;
  setPortion: (size: PortionSize, multiplier: number) => void;
  setAIResults: (
    items: NutritionItem[],
    confidence: number,
    quality: 'good' | 'acceptable' | 'poor',
  ) => void;
  updateItem: (index: number, patch: Partial<NutritionItem>) => void;
  removeItem: (index: number) => void;
  addItem: (item: NutritionItem) => void;
  reset: () => void;
}

const defaultDraft: MealDraft = {
  imageBase64: null,
  portionSize: 'full',
  portionMultiplier: 1.0,
  items: [],
  overallConfidence: 0,
  imageQuality: 'good',
};

export const useMealStore = create<MealStore>((set) => ({
  draft: defaultDraft,

  setImage: (base64) =>
    set((s) => ({ draft: { ...s.draft, imageBase64: base64 } })),

  setPortion: (size, multiplier) =>
    set((s) => ({ draft: { ...s.draft, portionSize: size, portionMultiplier: multiplier } })),

  setAIResults: (items, confidence, quality) =>
    set((s) => ({
      draft: { ...s.draft, items, overallConfidence: confidence, imageQuality: quality },
    })),

  updateItem: (index, patch) =>
    set((s) => {
      const items = [...s.draft.items];
      items[index] = { ...items[index], ...patch };
      return { draft: { ...s.draft, items } };
    }),

  removeItem: (index) =>
    set((s) => ({
      draft: { ...s.draft, items: s.draft.items.filter((_, i) => i !== index) },
    })),

  addItem: (item) =>
    set((s) => ({ draft: { ...s.draft, items: [...s.draft.items, item] } })),

  reset: () => set({ draft: defaultDraft }),
}));
```

- [ ] **Step 2: Create lib/store/summaryStore.ts**

```typescript
// lib/store/summaryStore.ts
import { create } from 'zustand';
import type { DailySummaryRow } from '../db/summaries';

interface SummaryStore {
  todaySummary: DailySummaryRow | null;
  setTodaySummary: (summary: DailySummaryRow | null) => void;
}

export const useSummaryStore = create<SummaryStore>((set) => ({
  todaySummary: null,
  setTodaySummary: (summary) => set({ todaySummary: summary }),
}));
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors in lib/store files.

- [ ] **Step 4: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add lib/store/
git commit -m "feat: add Zustand stores for meal draft and daily summary"
```

---

## Task 8: Set up app/ layouts and all 9 screens

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/history.tsx`
- Create: `app/(tabs)/profile.tsx`
- Create: `app/camera.tsx`
- Create: `app/portion.tsx`
- Create: `app/review.tsx`
- Create: `app/save-confirmation.tsx`
- Create: `app/day/[date].tsx`
- Create: `app/meal/[id].tsx`

- [ ] **Step 1: Write app/_layout.tsx**

```typescript
// app/_layout.tsx
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initSchema } from '../lib/db/schema';

export default function RootLayout() {
  useEffect(() => {
    initSchema();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="portion" options={{ presentation: 'modal', title: 'Portion Size' }} />
      <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Review' }} />
      <Stack.Screen name="save-confirmation" options={{ presentation: 'modal', title: 'Save Meal' }} />
      <Stack.Screen name="day/[date]" options={{ title: 'Day Detail' }} />
      <Stack.Screen name="meal/[id]" options={{ title: 'Meal Detail' }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Write app/(tabs)/_layout.tsx**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/colors';

function CameraTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.cameraButton} activeOpacity={0.8}>
      <View style={styles.cameraCircle} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconActive,
        tabBarInactiveTintColor: Colors.tabIcon,
        tabBarStyle: styles.tabBar,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="history"
        options={{ title: 'History' }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarButton: () => (
            <CameraTabButton onPress={() => router.push('/camera')} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    height: 64,
    borderTopColor: Colors.border,
  },
  cameraButton: {
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
});
```

- [ ] **Step 3: Write app/(tabs)/index.tsx (Screen 1 — Home / Today)**

```typescript
// app/(tabs)/index.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home / Today</Text>
      <Text style={styles.subtitle}>Daily summary goes here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
```

- [ ] **Step 4: Write app/(tabs)/history.tsx (Screen 6 — History)**

```typescript
// app/(tabs)/history.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>7-day chart + past days go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
```

- [ ] **Step 5: Write app/(tabs)/profile.tsx (Screen 9 — Profile / Settings)**

```typescript
// app/(tabs)/profile.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Settings and data export go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
```

- [ ] **Step 6: Write app/camera.tsx (Screen 2 — Camera)**

```typescript
// app/camera.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function CameraScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.subtitle}>Full-screen camera viewfinder goes here</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/portion')}>
        <Text style={styles.buttonText}>→ Portion (dev nav)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 8 },
  button: { marginTop: 32, padding: 16, backgroundColor: Colors.primary, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  close: { marginTop: 16, padding: 12 },
  closeText: { color: '#999' },
});
```

- [ ] **Step 7: Write app/portion.tsx (Screen 3 — Portion Selection)**

```typescript
// app/portion.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function PortionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portion Selection</Text>
      <Text style={styles.subtitle}>Quarter / Half / Full / Custom picker goes here</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/review')}>
        <Text style={styles.buttonText}>→ Review (dev nav)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  button: { marginTop: 32, padding: 16, backgroundColor: Colors.primary, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 8: Write app/review.tsx (Screen 4 — Review)**

```typescript
// app/review.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function ReviewScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review</Text>
      <Text style={styles.subtitle}>AI-identified items, edit/confirm, live totals go here</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/save-confirmation')}>
        <Text style={styles.buttonText}>→ Save Confirmation (dev nav)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  button: { marginTop: 32, padding: 16, backgroundColor: Colors.primary, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 9: Write app/save-confirmation.tsx (Screen 5 — Save Confirmation)**

```typescript
// app/save-confirmation.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function SaveConfirmationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save Meal</Text>
      <Text style={styles.subtitle}>Meal name, type tag, notes, final macros go here</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Save → Home (dev nav)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  button: { marginTop: 32, padding: 16, backgroundColor: Colors.success, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 10: Write app/day/[date].tsx (Screen 7 — Day Detail)**

```typescript
// app/day/[date].tsx
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{date}</Text>
      <Text style={styles.subtitle}>Daily totals + meal list go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
```

- [ ] **Step 11: Write app/meal/[id].tsx (Screen 8 — Meal Detail)**

```typescript
// app/meal/[id].tsx
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Detail</Text>
      <Text style={styles.subtitle}>Full meal breakdown for {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
```

- [ ] **Step 12: Verify TypeScript compiles clean**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 13: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add app/
git commit -m "feat: add all 9 screen placeholders with Expo Router navigation"
```

---

## Task 9: Set up shared components

**Files:**
- Create: `components/MacroCard.tsx`
- Create: `components/MealListItem.tsx`
- Create: `components/MealItemRow.tsx`
- Create: `components/PortionPicker.tsx`
- Create: `components/TotalBar.tsx`
- Create: `components/ConfidenceBadge.tsx`

- [ ] **Step 1: Create components/MacroCard.tsx**

```typescript
// components/MacroCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface MacroCardProps {
  label: string;
  value: string;
  color: string;
}

export function MacroCard({ label, value, color }: MacroCardProps) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    alignItems: 'center',
  },
  value: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});
```

- [ ] **Step 2: Create components/MealListItem.tsx**

```typescript
// components/MealListItem.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { MealRow } from '../lib/db/meals';

interface MealListItemProps {
  meal: MealRow;
  onPress: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const time = new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const carbMid = ((meal.total_carbs_low_g + meal.total_carbs_high_g) / 2).toFixed(0);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.name}>{meal.meal_name}</Text>
        <Text style={styles.meta}>{time} · {meal.meal_type}</Text>
      </View>
      <Text style={styles.carbs}>{carbMid}g</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  left: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  carbs: { fontSize: 16, fontWeight: '700', color: Colors.carbs },
});
```

- [ ] **Step 3: Create components/MealItemRow.tsx**

```typescript
// components/MealItemRow.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { NutritionItem } from '../lib/ai/types';

interface MealItemRowProps {
  item: NutritionItem;
  onEdit: () => void;
  onRemove: () => void;
}

export function MealItemRow({ item, onEdit, onRemove }: MealItemRowProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.main} onPress={onEdit}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.weight}>~{item.estimated_weight_g}g</Text>
        <Text style={styles.carbs}>{item.carbs_low_g}–{item.carbs_high_g}g carbs</Text>
        <Text style={styles.macros}>
          P {item.protein_g}g · F {item.fat_g}g · {item.calories_kcal} kcal
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.remove}>
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  weight: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  carbs: { fontSize: 15, fontWeight: '700', color: Colors.carbs, marginTop: 4 },
  macros: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  remove: { padding: 8 },
  removeText: { fontSize: 16, color: Colors.error },
});
```

- [ ] **Step 4: Create components/PortionPicker.tsx**

```typescript
// components/PortionPicker.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { PortionSize } from '../lib/store/mealStore';

const OPTIONS: { label: string; size: PortionSize; multiplier: number }[] = [
  { label: '¼', size: 'quarter', multiplier: 0.25 },
  { label: '½', size: 'half', multiplier: 0.5 },
  { label: '¾', size: 'three-quarters', multiplier: 0.75 },
  { label: 'Full', size: 'full', multiplier: 1.0 },
];

interface PortionPickerProps {
  selected: PortionSize;
  onSelect: (size: PortionSize, multiplier: number) => void;
}

export function PortionPicker({ selected, onSelect }: PortionPickerProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.size}
          style={[styles.option, selected === opt.size && styles.selected]}
          onPress={() => onSelect(opt.size, opt.multiplier)}
        >
          <Text style={[styles.label, selected === opt.size && styles.selectedLabel]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  label: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  selectedLabel: { color: Colors.primary },
});
```

- [ ] **Step 5: Create components/TotalBar.tsx**

```typescript
// components/TotalBar.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { NutritionItem } from '../lib/ai/types';

interface TotalBarProps {
  items: NutritionItem[];
}

export function TotalBar({ items }: TotalBarProps) {
  const totals = items.reduce(
    (acc, item) => ({
      carbsLow: acc.carbsLow + item.carbs_low_g,
      carbsHigh: acc.carbsHigh + item.carbs_high_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories_kcal,
    }),
    { carbsLow: 0, carbsHigh: 0, protein: 0, fat: 0, calories: 0 },
  );

  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Text style={styles.value}>
          {totals.carbsLow.toFixed(0)}–{totals.carbsHigh.toFixed(0)}g
        </Text>
        <Text style={styles.label}>Carbs</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.protein.toFixed(0)}g</Text>
        <Text style={styles.label}>Protein</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.fat.toFixed(0)}g</Text>
        <Text style={styles.label}>Fat</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.calories.toFixed(0)}</Text>
        <Text style={styles.label}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '700', color: Colors.text },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
```

- [ ] **Step 6: Create components/ConfidenceBadge.tsx**

```typescript
// components/ConfidenceBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type Level = 'high' | 'medium' | 'low';

function getLevel(confidence: number): Level {
  if (confidence >= 80) return 'high';
  if (confidence >= 60) return 'medium';
  return 'low';
}

const BADGE_COLORS: Record<Level, string> = {
  high: Colors.success,
  medium: Colors.warning,
  low: Colors.error,
};

const BADGE_LABELS: Record<Level, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

interface ConfidenceBadgeProps {
  confidence: number; // 0–100
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = getLevel(confidence);
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_COLORS[level] + '20', borderColor: BADGE_COLORS[level] }]}>
      <Text style={[styles.text, { color: BADGE_COLORS[level] }]}>{BADGE_LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add components/
git commit -m "feat: add shared component stubs (MacroCard, MealListItem, MealItemRow, PortionPicker, TotalBar, ConfidenceBadge)"
```

---

## Task 10: Environment setup

**Files:**
- Create: `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Verify .gitignore covers .env.local**

```bash
grep -n "env" /Users/soumya/Desktop/glai/.gitignore || echo "not found"
```

If `.env.local` is not already listed, add it:

```bash
echo "\n# Local environment variables\n.env.local\n.env*.local" >> /Users/soumya/Desktop/glai/.gitignore
```

- [ ] **Step 2: Create .env.local template**

Create `.env.local` (gitignored — fill in real values before running the app):

```bash
# .env.local — never commit this file
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 3: Commit gitignore update (not .env.local)**

```bash
cd /Users/soumya/Desktop/glai
git add .gitignore
git commit -m "chore: ensure .env.local is gitignored"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 2: Start the dev server**

```bash
cd /Users/soumya/Desktop/glai && npx expo start --clear
```

Expected: QR code displayed, no immediate crash errors in the terminal. Press `w` for web preview or scan QR with Expo Go. Verify that:
- Home screen renders ("Home / Today" text visible)
- Tab bar shows History | [blue circle] | Profile
- Tapping the blue circle opens the Camera modal
- "→ Portion (dev nav)" button works from Camera
- "→ Review (dev nav)" works from Portion
- "→ Save Confirmation (dev nav)" works from Review
- "Save → Home" navigates back to Home

- [ ] **Step 3: Final commit**

```bash
cd /Users/soumya/Desktop/glai
git add -A
git commit -m "chore: finalize scaffold — all 9 screens, lib/, components/, constants/ in place"
```
