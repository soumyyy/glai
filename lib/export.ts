import { Share } from 'react-native';
import { getDb } from './db/schema';
import { getActiveUserId, useProfileStore } from './store/profileStore';

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

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function fmtDose(n: number): string {
  return n % 1 === 0 ? `${n}u` : `${n.toFixed(1)}u`;
}

export async function exportMealsCSV(): Promise<void> {
  const db = getDb();
  const userId = getActiveUserId();

  const { profiles, activeUserId } = useProfileStore.getState();
  const activeProfile = profiles.find(p => p.id === activeUserId);
  const icr = activeProfile?.insulin_to_carb_ratio ?? null;
  const hasICR = icr !== null && icr >= 5 && icr <= 50;

  const meals = db.getAllSync<ExportMealRow>(
    `SELECT created_at, logged_on_date, meal_name, meal_type, portion_size,
            portion_multiplier, total_carbs_low_g, total_carbs_high_g,
            total_protein_g, total_fat_g, total_calories_kcal, notes
     FROM meals WHERE user_id = ? ORDER BY logged_on_date ASC, created_at ASC`,
    [userId],
  );

  if (meals.length === 0) {
    throw new Error('No meals to export yet. Log a meal first.');
  }

  const baseHeaders = [
    'Date', 'Time', 'Meal', 'Type',
    'Carbs Low (g)', 'Carbs High (g)',
    'Protein (g)', 'Fat (g)', 'Calories (kcal)',
  ];
  const insulinHeaders = hasICR ? [`Fiasp Low (u)`, `Fiasp High (u)`, `Fiasp Dose`] : [];
  const trailingHeaders = ['Portion', 'Multiplier', 'Notes'];

  const headers = [...baseHeaders, ...insulinHeaders, ...trailingHeaders].join(',');

  const rows = meals.map((m) => {
    const carbsLow  = Math.round(m.total_carbs_low_g);
    const carbsHigh = Math.round(m.total_carbs_high_g);

    const baseFields = [
      escape(m.logged_on_date),
      escape(formatTime(m.created_at)),
      escape(m.meal_name),
      escape(m.meal_type),
      escape(carbsLow),
      escape(carbsHigh),
      escape(Math.round(m.total_protein_g)),
      escape(Math.round(m.total_fat_g)),
      escape(Math.round(m.total_calories_kcal)),
    ];

    const insulinFields = hasICR ? (() => {
      const low  = roundHalf(m.total_carbs_low_g  / icr!);
      const high = roundHalf(m.total_carbs_high_g / icr!);
      const display = low === high ? fmtDose(low) : `${fmtDose(low)}–${fmtDose(high)}`;
      return [escape(low), escape(high), escape(display)];
    })() : [];

    const trailingFields = [
      escape(m.portion_size),
      escape(m.portion_multiplier),
      escape(m.notes),
    ];

    return [...baseFields, ...insulinFields, ...trailingFields].join(',');
  });

  const profileName = activeProfile?.name ?? 'export';
  const dateRange = meals.length > 0
    ? `${meals[0].logged_on_date} to ${meals[meals.length - 1].logged_on_date}`
    : '';

  const csv = [headers, ...rows].join('\n');

  await Share.share({
    message: csv,
    title: `Glai · ${profileName} · ${meals.length} meals · ${dateRange}`,
  });
}
