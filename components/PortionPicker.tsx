import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import type { PortionSize } from '../lib/store/mealStore';

const OPTIONS: { label: string; size: PortionSize; multiplier: number }[] = [
  { label: '¼', size: 'quarter', multiplier: 0.25 },
  { label: '½', size: 'half', multiplier: 0.5 },
  { label: '¾', size: 'three-quarters', multiplier: 0.75 },
  { label: 'Full', size: 'full', multiplier: 1.0 },
];

interface PortionPickerProps {
  selected: PortionSize;
  onSelect: (size: PortionSize, multiplier: number) => void;
}

export function PortionPicker({ selected, onSelect }: PortionPickerProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.size}
          style={[styles.option, selected === opt.size && styles.selected]}
          onPress={() => onSelect(opt.size, opt.multiplier)}
        >
          <Text style={[styles.label, selected === opt.size && styles.selectedLabel]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  label: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  selectedLabel: { color: Colors.primary },
});
