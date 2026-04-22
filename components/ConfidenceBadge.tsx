import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

type Level = 'high' | 'medium' | 'low';

function getLevel(confidence: number): Level {
  if (confidence >= 80) return 'high';
  if (confidence >= 60) return 'medium';
  return 'low';
}

const BADGE_COLORS: Record<Level, string> = {
  high: Colors.success,
  medium: Colors.warning,
  low: Colors.error,
};

const BADGE_LABELS: Record<Level, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

interface ConfidenceBadgeProps {
  confidence: number; // 0–100
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = getLevel(confidence);
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: BADGE_COLORS[level] + '18', borderColor: BADGE_COLORS[level] + '50' },
      ]}
    >
      <Text style={[styles.text, { color: BADGE_COLORS[level] }]}>{BADGE_LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
