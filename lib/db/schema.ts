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
