import { getSummaryForDate } from '../db/summaries';
import { getLocalUser } from '../db/users';
import { getUnsynced, getMealItems, markSynced } from '../db/meals';
import { getSupabaseClient } from './client';

export async function syncPendingMeals(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const unsynced = getUnsynced();
  if (unsynced.length === 0) return;

  const user = getLocalUser();
  if (user) {
    const { error: userError } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'id' });

    if (userError) {
      throw userError;
    }
  }

  for (const meal of unsynced) {
    try {
      const items = getMealItems(meal.id);
      const summary = getSummaryForDate(meal.logged_on_date);

      const { error: mealError } = await supabase.from('meals').upsert(
        {
          ...meal,
          synced_to_cloud: true,
        },
        { onConflict: 'id' },
      );
      if (mealError) throw mealError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('meal_items')
          .upsert(items, { onConflict: 'id' });
        if (itemsError) throw itemsError;
      }

      if (summary) {
        const { error: summaryError } = await supabase
          .from('daily_summaries')
          .upsert(summary, { onConflict: 'date,user_id' });
        if (summaryError) throw summaryError;
      }

      markSynced(meal.id);
    } catch (err) {
      // Non-blocking — failed syncs retry on next call
      console.warn(`Sync failed for meal ${meal.id}:`, err);
    }
  }
}
