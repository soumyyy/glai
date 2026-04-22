import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { Colors } from '../../constants/colors';
import { formatLocalDate } from '../../lib/date';
import { getSummariesForRange, type DailySummaryRow } from '../../lib/db/summaries';

interface HistoryPoint {
  date: string;
  label: string;
  carbs: number;
  calories: number;
  meals: number;
}

function formatLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatDateLine(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

function buildLastWeekPoints(summaries: DailySummaryRow[]): HistoryPoint[] {
  const summaryMap = new Map(summaries.map((summary) => [summary.date, summary]));
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const date = formatLocalDate(day);
    const summary = summaryMap.get(date);

    return {
      date,
      label: formatLabel(date),
      carbs: summary?.total_carbs_g ?? 0,
      calories: summary?.total_calories_kcal ?? 0,
      meals: summary?.meal_count ?? 0,
    };
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [points, setPoints] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    if (!isFocused) return;

    const end = formatLocalDate(new Date());
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const start = formatLocalDate(startDate);

    setPoints(buildLastWeekPoints(getSummariesForRange(start, end)));
  }, [isFocused]);

  const maxCarbs = Math.max(...points.map((point) => point.carbs), 1);

  return (
    <View style={styles.screen}>
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.overline}>HISTORY</Text>
          <Text style={styles.title}>Your last seven days</Text>
          <Text style={styles.subtitle}>
            Daily carb totals with a direct path into each saved day.
          </Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>7-day carb view</Text>
            <Text style={styles.chartCaption}>midpoint grams</Text>
          </View>

          <View style={styles.chart}>
            {points.map((point) => {
              const height = 44 + (point.carbs / maxCarbs) * 106;

              return (
                <View key={point.date} style={styles.barGroup}>
                  <Text style={styles.barValue}>{Math.round(point.carbs)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height }]} />
                  </View>
                  <Text style={styles.barLabel}>{point.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse by day</Text>
          <Text style={styles.sectionCaption}>Open any day for totals and meal-by-meal detail.</Text>
        </View>

        {points
          .slice()
          .reverse()
          .map((point) => (
            <TouchableOpacity
              key={point.date}
              activeOpacity={0.78}
              onPress={() => router.push(`/day/${point.date}`)}
              style={styles.dayCard}
            >
              <View style={styles.dayCardTop}>
                <Text style={styles.dayDate}>{formatDateLine(point.date)}</Text>
                <Text style={styles.dayCarbs}>{Math.round(point.carbs)}g</Text>
              </View>
              <View style={styles.dayMetaRow}>
                <Text style={styles.dayMeta}>
                  {point.meals} meal{point.meals === 1 ? '' : 's'}
                </Text>
                <View style={styles.metaDot} />
                <Text style={styles.dayMeta}>{Math.round(point.calories)} kcal</Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  overline: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    gap: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  chartCaption: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barValue: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: 152,
    borderRadius: 999,
    backgroundColor: Colors.surfaceStrong,
    justifyContent: 'flex-end',
    padding: 4,
  },
  barFill: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: Colors.carbs,
    minHeight: 12,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  sectionCaption: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 10,
  },
  dayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayDate: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: Colors.text,
  },
  dayCarbs: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.carbs,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
});
