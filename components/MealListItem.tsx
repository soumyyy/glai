import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { MealRow } from '../lib/db/meals';

interface MealListItemProps {
  meal: MealRow;
  onPress: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const time = new Date(meal.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const carbLow = Math.round(meal.total_carbs_low_g);
  const carbHigh = Math.round(meal.total_carbs_high_g);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{time}</Text>
          <View style={styles.dot} />
          <Text style={styles.meta}>{meal.meal_type}</Text>
        </View>
        <Text style={styles.name}>{meal.meal_name}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.carbs}>{carbLow}–{carbHigh}g</Text>
        <Text style={styles.carbsLabel}>carbs</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  left: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  name: { fontSize: 17, fontWeight: '600', color: Colors.text, lineHeight: 22 },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  carbs: { fontSize: 20, fontWeight: '700', color: Colors.carbs },
  carbsLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
