import { getSummaryForDate } from '../db/summaries';
import { getUnsynced, getMealItems, markSynced } from '../db/meals';
import { getSupabaseClient } from './client';

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function syncPendingMeals(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[Sync] skipped:no-client');
    return;
  }

  const unsynced = getUnsynced();
  if (unsynced.length === 0) {
    console.log('[Sync] skipped:no-pending-meals');
    return;
  }

  console.log('[Sync] start', { mealCount: unsynced.length });

  for (const meal of unsynced) {
    try {
      const items = getMealItems(meal.id);
      const summary = getSummaryForDate(meal.logged_on_date);

      console.log('[Sync] meal:start', {
        mealId: meal.id,
        itemCount: items.length,
        date: meal.logged_on_date,
      });

      const { error: mealError } = await supabase.from('meals').upsert(
        {
          ...meal,
          synced_to_cloud: true,
        },
        { onConflict: 'id' },
      );
      if (mealError) throw mealError;

      if (items.length > 0) {
        console.log('[Sync] meal:items-upsert:start', {
          mealId: meal.id,
          itemCount: items.length,
        });
        const { error: itemsError } = await supabase
          .from('meal_items')
          .upsert(items, { onConflict: 'id' });
        if (itemsError) throw itemsError;
        console.log('[Sync] meal:items-upsert:completed', {
          mealId: meal.id,
          itemCount: items.length,
        });
      }

      if (summary) {
        console.log('[Sync] meal:summary-upsert:start', {
          mealId: meal.id,
          date: summary.date,
          mealCount: summary.meal_count,
        });
        const { error: summaryError } = await supabase
          .from('daily_summaries')
          .upsert(summary, { onConflict: 'date,user_id' });
        if (summaryError) throw summaryError;
        console.log('[Sync] meal:summary-upsert:completed', {
          mealId: meal.id,
          date: summary.date,
        });
      } else {
        console.warn('[Sync] meal:summary-missing', {
          mealId: meal.id,
          date: meal.logged_on_date,
        });
      }

      markSynced(meal.id);
      console.log('[Sync] meal:completed', { mealId: meal.id });
    } catch (err) {
      // Non-blocking — failed syncs retry on next call
      console.warn('[Sync] meal:failed', {
        mealId: meal.id,
        error: describeError(err),
      });
    }
  }

  console.log('[Sync] completed');
}
