import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { NutritionItem } from '../lib/ai/types';

interface MealItemRowProps {
  item: NutritionItem;
  onEdit: () => void;
  onRemove: () => void;
}

export function MealItemRow({ item, onEdit, onRemove }: MealItemRowProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.main} onPress={onEdit}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.weight}>~{item.estimated_weight_g}g</Text>
        <Text style={styles.carbs}>{item.carbs_low_g}–{item.carbs_high_g}g carbs</Text>
        <Text style={styles.macros}>
          P {item.protein_g}g · F {item.fat_g}g · {item.calories_kcal} kcal
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.remove}>
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  weight: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  carbs: { fontSize: 15, fontWeight: '700', color: Colors.carbs, marginTop: 4 },
  macros: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  remove: { padding: 8 },
  removeText: { fontSize: 16, color: Colors.error },
});
