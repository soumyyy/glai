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
  fullLabel: string;
  carbs: number;
  calories: number;
  meals: number;
  isToday: boolean;
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

function buildPoints(summaries: DailySummaryRow[]): HistoryPoint[] {
  const map = new Map(summaries.map((s) => [s.date, s]));
  const today = new Date();
  const todayStr = formatLocalDate(today);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const date = formatLocalDate(day);
    const s = map.get(date);
    return {
      date,
      label: formatDayLabel(date),
      fullLabel: formatFullDate(date),
      carbs: s?.total_carbs_g ?? 0,
      calories: s?.total_calories_kcal ?? 0,
      meals: s?.meal_count ?? 0,
      isToday: date === todayStr,
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
    setPoints(buildPoints(getSummariesForRange(start, end)));
  }, [isFocused]);

  const maxCarbs = Math.max(...points.map((p) => p.carbs), 1);
  const weekTotal = Math.round(points.reduce((s, p) => s + p.carbs, 0));
  const weekAvg = Math.round(weekTotal / 7);
  const daysLogged = points.filter((p) => p.meals > 0).length;

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.overline}>HISTORY</Text>
          <Text style={styles.title}>Last 7 days</Text>
        </View>

        {/* Week summary pills */}
        <View style={styles.weekSummaryRow}>
          <View style={styles.weekCard}>
            <Text style={styles.weekCardValue}>{weekTotal}g</Text>
            <Text style={styles.weekCardLabel}>Week carbs</Text>
          </View>
          <View style={styles.weekCard}>
            <Text style={styles.weekCardValue}>{weekAvg}g</Text>
            <Text style={styles.weekCardLabel}>Daily avg</Text>
          </View>
          <View style={styles.weekCard}>
            <Text style={styles.weekCardValue}>{daysLogged}</Text>
            <Text style={styles.weekCardLabel}>Days logged</Text>
          </View>
        </View>

        {/* 7-day bar chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Carbs by day</Text>
            <Text style={styles.chartCaption}>grams</Text>
          </View>

          <View style={styles.chart}>
            {points.map((point) => {
              const fillRatio = maxCarbs > 0 ? point.carbs / maxCarbs : 0;
              const fillHeight = Math.max(fillRatio * 120, point.carbs > 0 ? 12 : 4);
              const isToday = point.isToday;

              return (
                <TouchableOpacity
                  key={point.date}
                  style={styles.barGroup}
                  onPress={() => router.push(`/day/${point.date}`)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.barValue, isToday && styles.barValueToday]}>
                    {point.carbs > 0 ? Math.round(point.carbs) : '–'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: fillHeight },
                        isToday && styles.barFillToday,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                    {point.label}
                  </Text>
                  {isToday ? <View style={styles.todayDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Browse by day */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse by day</Text>
          <Text style={styles.sectionCaption}>Tap any day for the full meal breakdown.</Text>
        </View>

        {points
          .slice()
          .reverse()
          .map((point) => {
            const barWidth = maxCarbs > 0 ? (point.carbs / maxCarbs) * 100 : 0;
            return (
              <TouchableOpacity
                key={point.date}
                activeOpacity={0.78}
                onPress={() => router.push(`/day/${point.date}`)}
                style={[styles.dayCard, point.isToday && styles.dayCardToday]}
              >
                <View style={styles.dayCardTop}>
                  <View style={styles.dayCardLeft}>
                    {point.isToday ? (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>Today</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.dayDate, point.isToday && styles.dayDateToday]}>
                      {point.fullLabel}
                    </Text>
                  </View>
                  <Text style={[styles.dayCarbs, point.carbs === 0 && styles.dayCarbsZero]}>
                    {point.carbs > 0 ? `${Math.round(point.carbs)}g` : '–'}
                  </Text>
                </View>

                {/* Mini progress bar */}
                <View style={styles.miniBarTrack}>
                  <View style={[styles.miniBarFill, { width: `${barWidth}%` }]} />
                </View>

                <View style={styles.dayMetaRow}>
                  <Text style={styles.dayMeta}>
                    {point.meals} meal{point.meals === 1 ? '' : 's'}
                  </Text>
                  {point.calories > 0 ? (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={styles.dayMeta}>{Math.round(point.calories)} kcal</Text>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
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
    gap: 6,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 1.8,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1.4,
  },

  // Week summary
  weekSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  weekCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  weekCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  weekCardLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    gap: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  chartCaption: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  barValue: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  barValueToday: {
    color: Colors.carbs,
  },
  barTrack: {
    width: '100%',
    height: 130,
    borderRadius: 999,
    backgroundColor: Colors.surfaceStrong,
    justifyContent: 'flex-end',
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barFill: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: Colors.carbs,
    opacity: 0.7,
    minHeight: 4,
  },
  barFillToday: {
    opacity: 1,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  barLabelToday: {
    color: Colors.carbs,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.carbs,
  },

  // Section header
  sectionHeader: {
    marginTop: 4,
    gap: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.7,
  },
  sectionCaption: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Day cards
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  dayCardToday: {
    borderColor: Colors.carbs + '40',
    backgroundColor: Colors.surface,
  },
  dayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  dayCardLeft: {
    flex: 1,
    gap: 4,
  },
  todayPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.carbs + '18',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.carbs + '40',
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 21,
  },
  dayDateToday: {
    color: Colors.text,
  },
  dayCarbs: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: -0.5,
  },
  dayCarbsZero: {
    color: Colors.textMuted,
    fontSize: 20,
  },
  miniBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.carbs,
    opacity: 0.6,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.textMuted,
  },
});
