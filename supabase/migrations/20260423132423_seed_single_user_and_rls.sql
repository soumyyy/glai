insert into public.users (id, name, age, weight_kg, created_at)
values ('6d3feca9-001f-40b8-baf0-089a1950c4ba', 'User', 46, 70, now())
on conflict (id) do update set
  name = excluded.name,
  age = excluded.age,
  weight_kg = excluded.weight_kg;

alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.users enable row level security;

drop policy if exists "prototype_all_users" on public.users;
drop policy if exists "prototype_all_meals" on public.meals;
drop policy if exists "prototype_all_meal_items" on public.meal_items;
drop policy if exists "prototype_all_daily_summaries" on public.daily_summaries;

create policy "prototype_all_users"
on public.users
for all
to anon
using (true)
with check (true);

create policy "prototype_all_meals"
on public.meals
for all
to anon
using (true)
with check (true);

create policy "prototype_all_meal_items"
on public.meal_items
for all
to anon
using (true)
with check (true);

create policy "prototype_all_daily_summaries"
on public.daily_summaries
for all
to anon
using (true)
with check (true);
