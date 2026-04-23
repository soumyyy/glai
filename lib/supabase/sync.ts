import { getSummaryForDate } from '../db/summaries';
import { getUnsynced, getMealItems, markSynced, getPendingDeletes, clearPendingDelete } from '../db/meals';
import { getSupabaseClient } from './client';

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message, code, details } = error as Record<string, unknown>;
    return [code, message, details].filter(Boolean).join(' | ');
  }
  return JSON.stringify(error);
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
