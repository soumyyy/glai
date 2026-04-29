import { getDb } from './schema';
import { deleteSetting, deleteSettingsByPrefix } from './settings';

export function deleteLocalAccountData(accountId: string): void {
  const db = getDb();

  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(
      `DELETE FROM meal_items
       WHERE meal_id IN (
         SELECT meals.id
         FROM meals
         INNER JOIN users ON users.id = meals.user_id
         WHERE users.account_id = ?
       )`,
      [accountId],
    );
    db.runSync(
      `DELETE FROM meals
       WHERE user_id IN (SELECT id FROM users WHERE account_id = ?)`,
      [accountId],
    );
    db.runSync(
      `DELETE FROM daily_summaries
       WHERE user_id IN (SELECT id FROM users WHERE account_id = ?)`,
      [accountId],
    );
    db.runSync(`DELETE FROM pending_deletes WHERE account_id = ?`, [accountId]);
    db.runSync(`DELETE FROM users WHERE account_id = ?`, [accountId]);
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }

  deleteSetting('active_user_id');
  deleteSetting(`active_user_id:${accountId}`);
  deleteSetting('auth_migrated');
  deleteSetting(`auth_migrated:${accountId}`);
  deleteSetting('onboarded');
  deleteSettingsByPrefix(`active_user_id:${accountId}:`);
  deleteSettingsByPrefix(`auth_migrated:${accountId}:`);
}
