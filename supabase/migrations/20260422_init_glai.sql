create table if not exists public.users (
  id text primary key,
  name text not null,
  age integer,
  weight_kg real,
  created_at timestamptz not null
);

create table if not exists public.meals (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null,
  logged_on_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name text not null,
  portion_size text not null,
  portion_multiplier real not null,
  total_carbs_low_g real not null,
  total_carbs_high_g real not null,
  total_protein_g real not null,
  total_fat_g real not null,
  total_calories_kcal real not null,
  ai_confidence integer not null,
  image_quality text not null check (image_quality in ('good', 'acceptable', 'poor')),
  notes text,
  synced_to_cloud boolean not null default true
);

create table if not exists public.meal_items (
  id text primary key,
  meal_id text not null references public.meals(id) on delete cascade,
  ai_identified_name text not null,
  corrected_name text,
  estimated_weight_g real not null,
  carbs_low_g real not null,
  carbs_high_g real not null,
  protein_g real not null,
  fat_g real not null,
  calories_kcal real not null,
  ai_notes text
);

create table if not exists public.daily_summaries (
  date date not null,
  user_id text not null references public.users(id) on delete cascade,
  total_carbs_g real not null default 0,
  total_protein_g real not null default 0,
  total_fat_g real not null default 0,
  total_calories_kcal real not null default 0,
  meal_count integer not null default 0,
  primary key (date, user_id)
);

create index if not exists idx_meals_user_logged_on_date
  on public.meals (user_id, logged_on_date desc);

create index if not exists idx_meal_items_meal_id
  on public.meal_items (meal_id);

create index if not exists idx_daily_summaries_user_date
  on public.daily_summaries (user_id, date desc);
