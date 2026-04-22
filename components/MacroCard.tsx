import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface MacroCardProps {
  label: string;
  value: string;
  color: string;
}

export function MacroCard({ label, value, color }: MacroCardProps) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    alignItems: 'center',
  },
  value: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});
