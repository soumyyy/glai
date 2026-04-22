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
        Crypto.randomUUID(), mealId, item.ai_identified_name,
        item.name !== item.ai_identified_name ? item.name : null,
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
