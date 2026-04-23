import { LOCAL_USER, LOCAL_USER_ID } from '../../constants/user';
import { getSummaryForDate, upsertCloudDailySummary, type DailySummaryRow } from '../db/summaries';
import {
  getUnsynced,
  getMealItems,
  markSynced,
  getPendingDeletes,
  clearPendingDelete,
  upsertCloudMeal,
  upsertCloudMealItems,
  type MealItemRow,
  type MealRow,
} from '../db/meals';
import { getSupabaseClient } from './client';

let cloudCycleInFlight: Promise<void> | null = null;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message, code, details } = error as Record<string, unknown>;
    return [code, message, details].filter(Boolean).join(' | ');
  }
  return JSON.stringify(error);
}

async function ensureCloudUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from('users').upsert(
    {
      ...LOCAL_USER,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function syncPendingMeals(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[Sync] skipped:no-client');
    return;
  }

  const unsynced = getUnsynced();
  const pendingDeletes = getPendingDeletes();

  if (unsynced.length === 0 && pendingDeletes.length === 0) {
    console.log('[Sync] skipped:nothing-pending');
    return;
  }

  console.log('[Sync] start', { upserts: unsynced.length, deletes: pendingDeletes.length });

  await ensureCloudUser();

  // ── upserts ──────────────────────────────────────────────────────────────────

  for (const meal of unsynced) {
    try {
      const items = getMealItems(meal.id);
      const summary = getSummaryForDate(meal.logged_on_date);

      console.log('[Sync] meal:start', { mealId: meal.id, itemCount: items.length, date: meal.logged_on_date });

      const { error: mealError } = await supabase
        .from('meals')
        .upsert({ ...meal, synced_to_cloud: true }, { onConflict: 'id' });
      if (mealError) throw mealError;

      if (items.length > 0) {
        console.log('[Sync] meal:items-upsert:start', { mealId: meal.id, itemCount: items.length });
        const { error: itemsError } = await supabase.from('meal_items').upsert(items, { onConflict: 'id' });
        if (itemsError) throw itemsError;
        console.log('[Sync] meal:items-upsert:done', { mealId: meal.id });
      }

      if (summary) {
        console.log('[Sync] meal:summary-upsert:start', { mealId: meal.id, date: summary.date });
        const { error: summaryError } = await supabase
          .from('daily_summaries')
          .upsert(summary, { onConflict: 'date,user_id' });
        if (summaryError) throw summaryError;
        console.log('[Sync] meal:summary-upsert:done', { mealId: meal.id });
      } else {
        console.warn('[Sync] meal:summary-missing', { mealId: meal.id, date: meal.logged_on_date });
      }

      markSynced(meal.id);
      console.log('[Sync] meal:done', { mealId: meal.id });
    } catch (err) {
      console.warn('[Sync] meal:failed', { mealId: meal.id, error: describeError(err) });
    }
  }

  // ── deletes ───────────────────────────────────────────────────────────────────

  for (const { meal_id, logged_on_date } of pendingDeletes) {
    try {
      console.log('[Sync] delete:start', { mealId: meal_id, date: logged_on_date });

      // meal_items first (Supabase may not have ON DELETE CASCADE)
      const { error: itemsError } = await supabase.from('meal_items').delete().eq('meal_id', meal_id);
      if (itemsError) throw itemsError;

      const { error: mealError } = await supabase.from('meals').delete().eq('id', meal_id);
      if (mealError) throw mealError;

      // Refresh the daily summary for that date
      const summary = getSummaryForDate(logged_on_date);
      if (summary) {
        const { error: summaryError } = await supabase
          .from('daily_summaries')
          .upsert(summary, { onConflict: 'date,user_id' });
        if (summaryError) throw summaryError;
      } else {
        // No meals left for that day — delete the summary row entirely
        const { error: summaryDeleteError } = await supabase
          .from('daily_summaries')
          .delete()
          .eq('date', logged_on_date);
        if (summaryDeleteError) throw summaryDeleteError;
      }

      clearPendingDelete(meal_id);
      console.log('[Sync] delete:done', { mealId: meal_id });
    } catch (err) {
      console.warn('[Sync] delete:failed', { mealId: meal_id, error: describeError(err) });
    }
  }

  console.log('[Sync] completed');
}

function normalizeMeal(row: Record<string, unknown>): MealRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    created_at: String(row.created_at),
    logged_on_date: String(row.logged_on_date),
    meal_type: row.meal_type as MealRow['meal_type'],
    meal_name: String(row.meal_name),
    portion_size: row.portion_size as MealRow['portion_size'],
    portion_multiplier: Number(row.portion_multiplier),
    total_carbs_low_g: Number(row.total_carbs_low_g),
    total_carbs_high_g: Number(row.total_carbs_high_g),
    total_protein_g: Number(row.total_protein_g),
    total_fat_g: Number(row.total_fat_g),
    total_calories_kcal: Number(row.total_calories_kcal),
    ai_confidence: Number(row.ai_confidence),
    image_quality: row.image_quality as MealRow['image_quality'],
    notes: typeof row.notes === 'string' ? row.notes : null,
    synced_to_cloud: 1,
  };
}

function normalizeMealItem(row: Record<string, unknown>): MealItemRow {
  return {
    id: String(row.id),
    meal_id: String(row.meal_id),
    ai_identified_name: String(row.ai_identified_name),
    corrected_name: typeof row.corrected_name === 'string' ? row.corrected_name : null,
    estimated_weight_g: Number(row.estimated_weight_g),
    carbs_low_g: Number(row.carbs_low_g),
    carbs_high_g: Number(row.carbs_high_g),
    protein_g: Number(row.protein_g),
    fat_g: Number(row.fat_g),
    calories_kcal: Number(row.calories_kcal),
    ai_notes: typeof row.ai_notes === 'string' ? row.ai_notes : null,
  };
}

function normalizeSummary(row: Record<string, unknown>): DailySummaryRow {
  return {
    date: String(row.date),
    user_id: String(row.user_id),
    total_carbs_g: Number(row.total_carbs_g),
    total_protein_g: Number(row.total_protein_g),
    total_fat_g: Number(row.total_fat_g),
    total_calories_kcal: Number(row.total_calories_kcal),
    meal_count: Number(row.meal_count),
  };
}

export async function restoreCloudMeals(): Promise<{ meals: number; items: number; summaries: number }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[Restore] skipped:no-client');
    return { meals: 0, items: 0, summaries: 0 };
  }

  console.log('[Restore] start', { userId: LOCAL_USER_ID });

  const { data: mealsData, error: mealsError } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', LOCAL_USER_ID)
    .order('created_at', { ascending: true });
  if (mealsError) throw mealsError;

  const meals = (mealsData ?? []).map((row) => normalizeMeal(row as Record<string, unknown>));
  const mealIds = meals.map((meal) => meal.id);

  let items: MealItemRow[] = [];
  if (mealIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('meal_items')
      .select('*')
      .in('meal_id', mealIds);
    if (itemsError) throw itemsError;
    items = (itemsData ?? []).map((row) => normalizeMealItem(row as Record<string, unknown>));
  }

  const { data: summariesData, error: summariesError } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', LOCAL_USER_ID);
  if (summariesError) throw summariesError;

  const summaries = (summariesData ?? []).map((row) => normalizeSummary(row as Record<string, unknown>));

  for (const meal of meals) {
    upsertCloudMeal(meal);
  }
  upsertCloudMealItems(items);
  for (const summary of summaries) {
    upsertCloudDailySummary(summary);
  }

  console.log('[Restore] completed', {
    meals: meals.length,
    items: items.length,
    summaries: summaries.length,
  });

  return { meals: meals.length, items: items.length, summaries: summaries.length };
}

export async function syncAndRestoreCloudMeals(): Promise<void> {
  if (cloudCycleInFlight) {
    return cloudCycleInFlight;
  }

  cloudCycleInFlight = (async () => {
    await syncPendingMeals();
    await restoreCloudMeals();
  })();

  try {
    await cloudCycleInFlight;
  } finally {
    cloudCycleInFlight = null;
  }
}
