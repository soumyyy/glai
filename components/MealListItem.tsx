import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { MealRow } from '../lib/db/meals';

interface MealListItemProps {
  meal: MealRow;
  onPress: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const time = new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const carbMid = ((meal.total_carbs_low_g + meal.total_carbs_high_g) / 2).toFixed(0);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.name}>{meal.meal_name}</Text>
        <Text style={styles.meta}>{time} · {meal.meal_type}</Text>
      </View>
      <Text style={styles.carbs}>{carbMid}g</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  left: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  carbs: { fontSize: 16, fontWeight: '700', color: Colors.carbs },
});
