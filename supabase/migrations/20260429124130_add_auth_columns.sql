-- Step 4: Add auth columns

-- Add account_id and updated_at to users (profiles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- Add updated_at to meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- Create pending_deletes if it doesn't exist, otherwise add account_id
CREATE TABLE IF NOT EXISTS pending_deletes (
  meal_id TEXT PRIMARY KEY,
  logged_on_date TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  account_id TEXT
);
ALTER TABLE pending_deletes ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Backfill updated_at from created_at
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE meals SET updated_at = created_at WHERE updated_at IS NULL;

-- Step 5: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_deletes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users: own account only" ON users
  FOR ALL USING (account_id = auth.uid()::text);

CREATE POLICY "meals: own account only" ON meals
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE account_id = auth.uid()::text)
  );

CREATE POLICY "meal_items: own account only" ON meal_items
  FOR ALL USING (
    meal_id IN (
      SELECT id FROM meals WHERE user_id IN (
        SELECT id FROM users WHERE account_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "daily_summaries: own account only" ON daily_summaries
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE account_id = auth.uid()::text)
  );

CREATE POLICY "pending_deletes: own account only" ON pending_deletes
  FOR ALL USING (account_id = auth.uid()::text);
