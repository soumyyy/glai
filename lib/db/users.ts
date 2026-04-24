import * as Crypto from 'expo-crypto';
import { getDb } from './schema';

export interface UserRow {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  insulin_to_carb_ratio: number | null;
  created_at: string;
}

export function getAllProfiles(): UserRow[] {
  const db = getDb();
  return db.getAllSync<UserRow>(
    `SELECT id, name, age, weight_kg, insulin_to_carb_ratio, created_at FROM users ORDER BY created_at ASC`,
  );
}

export function createProfile(
  name: string,
  age: number | null,
  weight_kg: number | null,
  insulin_to_carb_ratio: number | null = null,
): UserRow {
  const db = getDb();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.runSync(
    `INSERT INTO users (id, name, age, weight_kg, insulin_to_carb_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), age ?? null, weight_kg ?? null, insulin_to_carb_ratio ?? null, created_at],
  );
  return { id, name: name.trim(), age, weight_kg, insulin_to_carb_ratio, created_at };
}

export function updateProfile(
  id: string,
  patch: { name?: string; age?: number | null; weight_kg?: number | null; insulin_to_carb_ratio?: number | null },
): void {
  const db = getDb();
  db.runSync(
    `UPDATE users SET
      name = COALESCE(?, name),
      age = ?,
      weight_kg = ?,
      insulin_to_carb_ratio = ?
     WHERE id = ?`,
    [
      patch.name?.trim() ?? null,
      patch.age ?? null,
      patch.weight_kg ?? null,
      patch.insulin_to_carb_ratio ?? null,
      id,
    ],
  );
}

export function upsertCloudProfile(profile: UserRow): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO users (id, name, age, weight_kg, insulin_to_carb_ratio, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name                  = excluded.name,
       age                   = excluded.age,
       weight_kg             = excluded.weight_kg,
       insulin_to_carb_ratio = excluded.insulin_to_carb_ratio`,
    [profile.id, profile.name, profile.age ?? null, profile.weight_kg ?? null, profile.insulin_to_carb_ratio ?? null, profile.created_at],
  );
}

export function deleteProfile(id: string): void {
  const db = getDb();
  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(`DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ?)`, [id]);
    db.runSync(`DELETE FROM meals WHERE user_id = ?`, [id]);
    db.runSync(`DELETE FROM daily_summaries WHERE user_id = ?`, [id]);
    db.runSync(`DELETE FROM users WHERE id = ?`, [id]);
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}
