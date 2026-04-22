import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { NutritionItem } from '../lib/ai/types';

interface TotalBarProps {
  items: NutritionItem[];
}

export function TotalBar({ items }: TotalBarProps) {
  const totals = items.reduce(
    (acc, item) => ({
      carbsLow: acc.carbsLow + item.carbs_low_g,
      carbsHigh: acc.carbsHigh + item.carbs_high_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories_kcal,
    }),
    { carbsLow: 0, carbsHigh: 0, protein: 0, fat: 0, calories: 0 },
  );

  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Text style={styles.value}>
          {totals.carbsLow.toFixed(0)}–{totals.carbsHigh.toFixed(0)}g
        </Text>
        <Text style={styles.label}>Carbs</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.protein.toFixed(0)}g</Text>
        <Text style={styles.label}>Protein</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.fat.toFixed(0)}g</Text>
        <Text style={styles.label}>Fat</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{totals.calories.toFixed(0)}</Text>
        <Text style={styles.label}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '700', color: Colors.text },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
