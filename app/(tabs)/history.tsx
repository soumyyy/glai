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
    weekday: 'long', day: 'numeric', month: 'long',
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

function whole(n: number) { return Math.round(n).toString(); }

export default function HistoryScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
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

  const maxCarbs   = Math.max(...points.map((p) => p.carbs), 1);
  const weekTotal  = Math.round(points.reduce((s, p) => s + p.carbs, 0));
  const weekAvg    = Math.round(points.filter(p => p.meals > 0).reduce((s, p) => s + p.carbs, 0) / Math.max(points.filter(p => p.meals > 0).length, 1));
  const daysLogged = points.filter((p) => p.meals > 0).length;
  const loggedDays = points.filter((p) => p.meals > 0).slice().reverse();

  return (
    <View style={s.screen}>
      <Atmosphere />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 132 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Last 7 days</Text>
        </View>

        {/* Summary strip */}
        <View style={s.macroStrip}>
          {[
            { label: 'Total carbs', value: `${weekTotal}g` },
            { label: 'Daily avg',   value: `${weekAvg}g` },
            { label: 'Days logged', value: `${daysLogged}` },
          ].map((m, i) => (
            <View key={m.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <View style={s.macroDiv} />}
              <View style={s.macroItem}>
                <Text style={s.macroValue}>{m.value}</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Carbs by day</Text>
            <Text style={s.chartUnit}>g</Text>
          </View>
          <View style={s.chart}>
            {points.map((point) => {
              const ratio  = maxCarbs > 0 ? point.carbs / maxCarbs : 0;
              const fillH  = point.carbs > 0 ? Math.max(ratio * 100, 8) : 0;

              return (
                <TouchableOpacity
                  key={point.date}
                  style={s.barGroup}
                  onPress={() => point.meals > 0 && router.push(`/day/${point.date}`)}
                  activeOpacity={point.meals > 0 ? 0.7 : 1}
                >
                  <Text style={[s.barValue, point.isToday && s.barValueToday]}>
                    {point.carbs > 0 ? whole(point.carbs) : ''}
                  </Text>
                  <View style={s.barTrack}>
                    {point.carbs > 0 && (
                      <View style={[s.barFill, { height: fillH }, point.isToday && s.barFillToday]} />
                    )}
                  </View>
                  <Text style={[s.barLabel, point.isToday && s.barLabelToday]}>
                    {point.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logged days list — only days with data */}
        {loggedDays.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Logged days</Text>
            <View style={s.listCard}>
              {loggedDays.map((point, i) => (
                <View key={point.date}>
                  {i > 0 && <View style={s.rowDivider} />}
                  <TouchableOpacity
                    style={s.dayRow}
                    onPress={() => router.push(`/day/${point.date}`)}
                    activeOpacity={0.72}
                  >
                    <View style={s.dayLeft}>
                      <Text style={s.dayDate}>
                        {point.fullLabel}
                        {point.isToday ? '  ·  Today' : ''}
                      </Text>
                      <Text style={s.dayMeta}>
                        {point.meals} meal{point.meals === 1 ? '' : 's'}
                        {point.calories > 0 ? `  ·  ${whole(point.calories)} kcal` : ''}
                      </Text>
                    </View>
                    <Text style={s.dayCarbs}>{whole(point.carbs)}g</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {daysLogged === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No meals logged this week yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 14 },

  header: { marginBottom: 2 },
  title: {
    fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.8,
  },

  // Summary strip — matches home screen
  macroStrip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  macroItem:  { flex: 1, alignItems: 'center', gap: 3 },
  macroDiv:   { width: 1, height: 24, backgroundColor: Colors.border, alignSelf: 'center' },
  macroValue: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  macroLabel: {
    fontSize: 9, color: Colors.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 16,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  chartUnit:  { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 130,
  },
  barGroup: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  barValue: {
    fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.1, height: 14,
  },
  barValueToday: { color: Colors.carbs },
  barTrack: {
    width: '100%',
    flex: 1,
    borderRadius: 6,
    backgroundColor: Colors.surfaceStrong,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: Colors.carbs,
    opacity: 0.55,
  },
  barFillToday: { opacity: 1 },
  barLabel: {
    fontSize: 10, color: Colors.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  barLabelToday: { color: Colors.carbs },

  // Logged days list
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  dayLeft:  { flex: 1, gap: 2 },
  dayDate:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  dayMeta:  { fontSize: 11, color: Colors.textMuted },
  dayCarbs: { fontSize: 17, fontWeight: '700', color: Colors.carbs, letterSpacing: -0.3 },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
