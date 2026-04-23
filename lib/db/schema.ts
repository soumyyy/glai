import * as SQLite from 'expo-sqlite';
import { LOCAL_USER } from '../../constants/user';

let db: SQLite.SQLiteDatabase | null = null;
let schemaInitialized = false;

interface TableInfoRow {
  name: string;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('glai.db');
  }
  return db;
}

function hasColumn(database: SQLite.SQLiteDatabase, table: string, column: string): boolean {
  const rows = database.getAllSync<TableInfoRow>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

export function initSchema(): void {
  if (schemaInitialized) {
    return;
  }

  const database = getDb();
  const createdAt = new Date().toISOString();

  database.execSync('PRAGMA foreign_keys = ON;');

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
      logged_on_date TEXT,
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

    CREATE TABLE IF NOT EXISTS pending_deletes (
      meal_id TEXT PRIMARY KEY,
      logged_on_date TEXT NOT NULL,
      deleted_at TEXT NOT NULL
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

  if (!hasColumn(database, 'meals', 'logged_on_date')) {
    database.execSync(`ALTER TABLE meals ADD COLUMN logged_on_date TEXT`);
  }

  database.runSync(
    `UPDATE meals
     SET logged_on_date = COALESCE(NULLIF(logged_on_date, ''), substr(created_at, 1, 10))
     WHERE logged_on_date IS NULL OR logged_on_date = ''`,
  );

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_meals_user_logged_on_date
      ON meals(user_id, logged_on_date, created_at);

    CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id
      ON meal_items(meal_id);

    CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date
      ON daily_summaries(user_id, date);
  `);

  database.runSync(
    `INSERT INTO users (id, name, age, weight_kg, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       age = excluded.age,
       weight_kg = excluded.weight_kg`,
    [LOCAL_USER.id, LOCAL_USER.name, LOCAL_USER.age, LOCAL_USER.weight_kg, createdAt],
  );

  schemaInitialized = true;
}

initSchema();
