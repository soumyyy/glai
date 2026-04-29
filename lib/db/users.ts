import * as Crypto from 'expo-crypto';
import { getDb } from './schema';
import { getCurrentAccountId } from '../store/authStore';

export interface UserRow {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  insulin_to_carb_ratio: number | null;
  created_at: string;
  account_id: string | null;
  updated_at: string;
}

export function getAllProfiles(): UserRow[] {
  const db = getDb();
  const accountId = getCurrentAccountId();
  if (!accountId) {
    return [];
  }
  return db.getAllSync<UserRow>(
    `SELECT id, name, age, weight_kg, insulin_to_carb_ratio, created_at, account_id, updated_at
     FROM users
     WHERE account_id = ?
     ORDER BY created_at ASC`,
    [accountId],
  );
}

export function createProfile(
  name: string,
  age: number | null,
  weight_kg: number | null,
  insulin_to_carb_ratio: number | null = null,
): UserRow {
  const db = getDb();
  const accountId = getCurrentAccountId();
  if (!accountId) {
    throw new Error('Cannot create a profile without an authenticated account.');
  }
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  const updated_at = created_at;
  db.runSync(
    `INSERT INTO users (id, name, age, weight_kg, insulin_to_carb_ratio, created_at, account_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), age ?? null, weight_kg ?? null, insulin_to_carb_ratio ?? null, created_at, accountId, updated_at],
  );
  return { id, name: name.trim(), age, weight_kg, insulin_to_carb_ratio, created_at, account_id: accountId, updated_at };
}

export function updateProfile(
  id: string,
  patch: { name?: string; age?: number | null; weight_kg?: number | null; insulin_to_carb_ratio?: number | null },
): void {
  const db = getDb();
  const accountId = getCurrentAccountId();
  if (!accountId) {
    throw new Error('Cannot update a profile without an authenticated account.');
  }
  db.runSync(
    `UPDATE users SET
      name = COALESCE(?, name),
      age = ?,
      weight_kg = ?,
      insulin_to_carb_ratio = ?,
      updated_at = ?
     WHERE id = ? AND account_id = ?`,
    [
      patch.name?.trim() ?? null,
      patch.age ?? null,
      patch.weight_kg ?? null,
      patch.insulin_to_carb_ratio ?? null,
      new Date().toISOString(),
      id,
      accountId,
    ],
  );
}

export function upsertCloudProfile(profile: UserRow): boolean {
  const db = getDb();
  const existing = db.getFirstSync<{ updated_at: string }>(
    `SELECT updated_at FROM users WHERE id = ?`,
    [profile.id],
  );

  if (existing?.updated_at && existing.updated_at > profile.updated_at) {
    return false;
  }

  db.runSync(
    `INSERT INTO users (id, name, age, weight_kg, insulin_to_carb_ratio, created_at, account_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name                  = excluded.name,
       age                   = excluded.age,
       weight_kg             = excluded.weight_kg,
       insulin_to_carb_ratio = excluded.insulin_to_carb_ratio,
       account_id            = excluded.account_id,
       updated_at            = excluded.updated_at`,
    [
      profile.id,
      profile.name,
      profile.age ?? null,
      profile.weight_kg ?? null,
      profile.insulin_to_carb_ratio ?? null,
      profile.created_at,
      profile.account_id,
      profile.updated_at,
    ],
  );
  return true;
}

export function deleteProfile(id: string): void {
  const db = getDb();
  const accountId = getCurrentAccountId();
  if (!accountId) {
    throw new Error('Cannot delete a profile without an authenticated account.');
  }
  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(
      `DELETE FROM meal_items
       WHERE meal_id IN (
         SELECT meals.id
         FROM meals
         INNER JOIN users ON users.id = meals.user_id
         WHERE meals.user_id = ? AND users.account_id = ?
       )`,
      [id, accountId],
    );
    db.runSync(`DELETE FROM meals WHERE user_id = ? AND user_id IN (SELECT id FROM users WHERE account_id = ?)`, [id, accountId]);
    db.runSync(`DELETE FROM daily_summaries WHERE user_id = ? AND user_id IN (SELECT id FROM users WHERE account_id = ?)`, [id, accountId]);
    db.runSync(`DELETE FROM users WHERE id = ? AND account_id = ?`, [id, accountId]);
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}
