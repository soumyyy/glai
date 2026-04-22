import { LOCAL_USER } from '../../constants/user';
import { getDb } from './schema';

export interface UserRow {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  created_at: string;
}

export function getLocalUser(): UserRow | null {
  const db = getDb();
  const existing = db.getFirstSync<UserRow>(
    `SELECT id, name, age, weight_kg, created_at FROM users WHERE id = ?`,
    [LOCAL_USER.id],
  );

  return existing ?? null;
}
