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
     FROM meals WHERE user_id = ? AND logged_on_date = ?
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
