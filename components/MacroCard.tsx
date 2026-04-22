import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface MacroCardProps {
  label: string;
  value: string;
  color: string;
}

export function MacroCard({ label, value, color }: MacroCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 122,
    backgroundColor: Colors.surface,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  accent: {
    width: 34,
    height: 6,
    borderRadius: 999,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
