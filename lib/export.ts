import { Share } from 'react-native';
import { getDb } from './db/schema';
import { getActiveUserId } from './store/profileStore';

interface ExportMealRow {
  created_at: string;
  logged_on_date: string;
  meal_name: string;
  meal_type: string;
  portion_size: string;
  portion_multiplier: number;
  total_carbs_low_g: number;
  total_carbs_high_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_calories_kcal: number;
  ai_confidence: number;
  image_quality: string;
  notes: string | null;
}

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export async function exportMealsCSV(): Promise<void> {
  const db = getDb();
  const meals = db.getAllSync<ExportMealRow>(
    `SELECT * FROM meals WHERE user_id = ? ORDER BY logged_on_date ASC, created_at ASC`,
    [getActiveUserId()],
  );

  if (meals.length === 0) {
    throw new Error('No meals to export yet. Log a meal first.');
  }

  const headers = [
    'Date', 'Time', 'Meal Name', 'Meal Type', 'Portion', 'Multiplier',
    'Carbs Low (g)', 'Carbs High (g)', 'Protein (g)', 'Fat (g)',
    'Calories (kcal)', 'AI Confidence', 'Image Quality', 'Notes',
  ].join(',');

  const rows = meals.map((m) =>
    [
      escape(m.logged_on_date),
      escape(formatTime(m.created_at)),
      escape(m.meal_name),
      escape(m.meal_type),
      escape(m.portion_size),
      escape(m.portion_multiplier),
      escape(Math.round(m.total_carbs_low_g)),
      escape(Math.round(m.total_carbs_high_g)),
      escape(Math.round(m.total_protein_g)),
      escape(Math.round(m.total_fat_g)),
      escape(Math.round(m.total_calories_kcal)),
      escape(m.ai_confidence),
      escape(m.image_quality),
      escape(m.notes),
    ].join(','),
  );

  const csv = [headers, ...rows].join('\n');

  await Share.share({
    message: csv,
    title: `Glai export · ${meals.length} meals`,
  });
}
