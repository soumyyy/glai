import { supabase } from './client';
import { getUnsynced, getMealItems, markSynced } from '../db/meals';

export async function syncPendingMeals(): Promise<void> {
  const unsynced = getUnsynced();
  if (unsynced.length === 0) return;

  for (const meal of unsynced) {
    try {
      const items = getMealItems(meal.id);

      const { error: mealError } = await supabase.from('meals').upsert({
        ...meal,
        synced_to_cloud: true,
      });
      if (mealError) throw mealError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('meal_items').upsert(items);
        if (itemsError) throw itemsError;
      }

      markSynced(meal.id);
    } catch (err) {
      // Non-blocking — failed syncs retry on next call
      console.warn(`Sync failed for meal ${meal.id}:`, err);
    }
  }
}
