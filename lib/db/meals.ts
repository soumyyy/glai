import * as Crypto from 'expo-crypto';
import { getDb } from './schema';
import type { NutritionItem } from '../ai/types';
import { formatLocalDate } from '../date';
import { getActiveUserId } from '../store/profileStore';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PortionSize = 'quarter' | 'half' | 'three-quarters' | 'full' | 'custom';

export interface MealRow {
  id: string;
  user_id: string;
  created_at: string;
  logged_on_date: string;
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
  loggedOnDate?: string; // YYYY-MM-DD, defaults to today
}

export interface SaveMealResult {
  id: string;
  createdAt: string;
  loggedOnDate: string;
}

export function saveMeal(params: SaveMealParams): SaveMealResult {
  const db = getDb();
  const mealId = Crypto.randomUUID();
  const createdAt = new Date();
  const createdAtIso = createdAt.toISOString();
  const loggedOnDate = params.loggedOnDate ?? formatLocalDate(createdAt);

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

  db.execSync('BEGIN IMMEDIATE TRANSACTION');

  try {
    db.runSync(
      `INSERT INTO meals (id, user_id, created_at, logged_on_date, meal_type, meal_name, portion_size, portion_multiplier,
        total_carbs_low_g, total_carbs_high_g, total_protein_g, total_fat_g, total_calories_kcal,
        ai_confidence, image_quality, notes, synced_to_cloud)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        mealId,
        getActiveUserId(),
        createdAtIso,
        loggedOnDate,
        params.mealType,
        params.mealName,
        params.portionSize,
        params.portionMultiplier,
        totals.carbs_low,
        totals.carbs_high,
        totals.protein,
        totals.fat,
        totals.calories,
        params.aiConfidence,
        params.imageQuality,
        params.notes ?? null,
      ],
    );

    for (const item of params.items) {
      db.runSync(
        `INSERT INTO meal_items (id, meal_id, ai_identified_name, corrected_name, estimated_weight_g,
          carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal, ai_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Crypto.randomUUID(),
          mealId,
          item.ai_identified_name,
          item.name !== item.ai_identified_name ? item.name : null,
          item.estimated_weight_g,
          item.carbs_low_g,
          item.carbs_high_g,
          item.protein_g,
          item.fat_g,
          item.calories_kcal,
          item.ai_notes || null,
        ],
      );
    }

    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }

  return { id: mealId, createdAt: createdAtIso, loggedOnDate };
}

export function getMealsForDate(date: string): MealRow[] {
  const db = getDb();
  return db.getAllSync<MealRow>(
    `SELECT * FROM meals WHERE user_id = ? AND logged_on_date = ? ORDER BY created_at ASC`,
    [getActiveUserId(), date],
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

export function upsertCloudMeal(meal: MealRow): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO meals (id, user_id, created_at, logged_on_date, meal_type, meal_name, portion_size, portion_multiplier,
      total_carbs_low_g, total_carbs_high_g, total_protein_g, total_fat_g, total_calories_kcal,
      ai_confidence, image_quality, notes, synced_to_cloud)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       created_at = excluded.created_at,
       logged_on_date = excluded.logged_on_date,
       meal_type = excluded.meal_type,
       meal_name = excluded.meal_name,
       portion_size = excluded.portion_size,
       portion_multiplier = excluded.portion_multiplier,
       total_carbs_low_g = excluded.total_carbs_low_g,
       total_carbs_high_g = excluded.total_carbs_high_g,
       total_protein_g = excluded.total_protein_g,
       total_fat_g = excluded.total_fat_g,
       total_calories_kcal = excluded.total_calories_kcal,
       ai_confidence = excluded.ai_confidence,
       image_quality = excluded.image_quality,
       notes = excluded.notes,
       synced_to_cloud = 1`,
    [
      meal.id,
      meal.user_id,
      meal.created_at,
      meal.logged_on_date,
      meal.meal_type,
      meal.meal_name,
      meal.portion_size,
      meal.portion_multiplier,
      meal.total_carbs_low_g,
      meal.total_carbs_high_g,
      meal.total_protein_g,
      meal.total_fat_g,
      meal.total_calories_kcal,
      meal.ai_confidence,
      meal.image_quality,
      meal.notes,
    ],
  );
}

export function upsertCloudMealItems(items: MealItemRow[]): void {
  const db = getDb();
  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    for (const item of items) {
      db.runSync(
        `INSERT INTO meal_items (id, meal_id, ai_identified_name, corrected_name, estimated_weight_g,
          carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal, ai_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           meal_id = excluded.meal_id,
           ai_identified_name = excluded.ai_identified_name,
           corrected_name = excluded.corrected_name,
           estimated_weight_g = excluded.estimated_weight_g,
           carbs_low_g = excluded.carbs_low_g,
           carbs_high_g = excluded.carbs_high_g,
           protein_g = excluded.protein_g,
           fat_g = excluded.fat_g,
           calories_kcal = excluded.calories_kcal,
           ai_notes = excluded.ai_notes`,
        [
          item.id,
          item.meal_id,
          item.ai_identified_name,
          item.corrected_name,
          item.estimated_weight_g,
          item.carbs_low_g,
          item.carbs_high_g,
          item.protein_g,
          item.fat_g,
          item.calories_kcal,
          item.ai_notes,
        ],
      );
    }
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}

export function updateMealItemName(itemId: string, correctedName: string): void {
  const db = getDb();
  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(
      `UPDATE meal_items SET corrected_name = ? WHERE id = ?`,
      [correctedName.trim() || null, itemId],
    );
    db.runSync(
      `UPDATE meals
       SET synced_to_cloud = 0
       WHERE id = (SELECT meal_id FROM meal_items WHERE id = ?)`,
      [itemId],
    );
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}

export interface MealItemNutritionPatch {
  corrected_name?: string;
  carbs_low_g?: number;
  carbs_high_g?: number;
  protein_g?: number;
  fat_g?: number;
  calories_kcal?: number;
}

export function updateMealItem(itemId: string, patch: MealItemNutritionPatch): void {
  const db = getDb();
  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(
      `UPDATE meal_items SET
        corrected_name = COALESCE(?, corrected_name),
        carbs_low_g    = COALESCE(?, carbs_low_g),
        carbs_high_g   = COALESCE(?, carbs_high_g),
        protein_g      = COALESCE(?, protein_g),
        fat_g          = COALESCE(?, fat_g),
        calories_kcal  = COALESCE(?, calories_kcal)
       WHERE id = ?`,
      [
        patch.corrected_name ?? null,
        patch.carbs_low_g    ?? null,
        patch.carbs_high_g   ?? null,
        patch.protein_g      ?? null,
        patch.fat_g          ?? null,
        patch.calories_kcal  ?? null,
        itemId,
      ],
    );
    db.runSync(
      `UPDATE meals
       SET synced_to_cloud = 0
       WHERE id = (SELECT meal_id FROM meal_items WHERE id = ?)`,
      [itemId],
    );
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}

export function updateMealName(mealId: string, name: string): void {
  const db = getDb();
  db.runSync(
    `UPDATE meals SET meal_name = ?, synced_to_cloud = 0 WHERE id = ?`,
    [name.trim(), mealId],
  );
}

export function recalculateMealTotals(mealId: string): void {
  const db = getDb();
  db.runSync(
    `UPDATE meals SET
      total_carbs_low_g    = (SELECT COALESCE(SUM(carbs_low_g),  0) FROM meal_items WHERE meal_id = ?),
      total_carbs_high_g   = (SELECT COALESCE(SUM(carbs_high_g), 0) FROM meal_items WHERE meal_id = ?),
      total_protein_g      = (SELECT COALESCE(SUM(protein_g),    0) FROM meal_items WHERE meal_id = ?),
      total_fat_g          = (SELECT COALESCE(SUM(fat_g),        0) FROM meal_items WHERE meal_id = ?),
      total_calories_kcal  = (SELECT COALESCE(SUM(calories_kcal),0) FROM meal_items WHERE meal_id = ?),
      synced_to_cloud      = 0
     WHERE id = ?`,
    [mealId, mealId, mealId, mealId, mealId, mealId],
  );
}

export function deleteMeal(mealId: string): void {
  const db = getDb();
  const meal = db.getFirstSync<{ synced_to_cloud: number; logged_on_date: string }>(
    `SELECT synced_to_cloud, logged_on_date FROM meals WHERE id = ?`, [mealId],
  );
  if (meal?.synced_to_cloud) {
    db.runSync(
      `INSERT OR IGNORE INTO pending_deletes (meal_id, logged_on_date, deleted_at) VALUES (?, ?, ?)`,
      [mealId, meal.logged_on_date, new Date().toISOString()],
    );
    console.log('[Delete] queued for cloud sync', { mealId });
  }
  db.runSync(`DELETE FROM meals WHERE id = ?`, [mealId]);
}

export interface PendingDelete {
  meal_id: string;
  logged_on_date: string;
  deleted_at: string;
}

export function getPendingDeletes(): PendingDelete[] {
  const db = getDb();
  return db.getAllSync<PendingDelete>(`SELECT * FROM pending_deletes ORDER BY deleted_at ASC`);
}

export function clearPendingDelete(mealId: string): void {
  const db = getDb();
  db.runSync(`DELETE FROM pending_deletes WHERE meal_id = ?`, [mealId]);
}

export function getUnsynced(): MealRow[] {
  const db = getDb();
  return db.getAllSync<MealRow>(
    `SELECT * FROM meals WHERE synced_to_cloud = 0 ORDER BY created_at ASC`,
  );
}

export function markSynced(mealId: string): void {
  const db = getDb();
  db.runSync(`UPDATE meals SET synced_to_cloud = 1 WHERE id = ?`, [mealId]);
}
