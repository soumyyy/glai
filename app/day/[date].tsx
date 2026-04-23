import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { MealListItem } from '../../components/MealListItem';
import { Colors } from '../../constants/colors';
import { getMealsForDate, type MealRow } from '../../lib/db/meals';
import { getSummaryForDate, type DailySummaryRow } from '../../lib/db/summaries';

function formatDateLine(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

function whole(n: number) { return Math.round(n).toString(); }

export default function DayDetailScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { date }  = useLocalSearchParams<{ date: string }>();
  const [summary, setSummary] = useState<DailySummaryRow | null>(null);
  const [meals,   setMeals]   = useState<MealRow[]>([]);

  useEffect(() => {
    if (!isFocused || !date) return;
    setSummary(getSummaryForDate(date));
    setMeals(getMealsForDate(date));
  }, [date, isFocused]);

  const macros = [
    { label: 'Carbs',   value: summary ? `${whole(summary.total_carbs_g)}g`        : '—', color: Colors.carbs },
    { label: 'Protein', value: summary ? `${whole(summary.total_protein_g)}g`      : '—', color: Colors.protein },
    { label: 'Fat',     value: summary ? `${whole(summary.total_fat_g)}g`          : '—', color: Colors.fat },
    { label: 'kcal',    value: summary ? whole(summary.total_calories_kcal)         : '—', color: Colors.calories },
  ];

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{date ? formatDateLine(date) : 'Day detail'}</Text>
          <Text style={s.subtitle}>
            {summary?.meal_count ?? 0} meal{summary?.meal_count === 1 ? '' : 's'}
          </Text>
        </View>

        {/* Macro strip */}
        <View style={s.macroStrip}>
          {macros.map((m, i) => (
            <View key={m.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <View style={s.macroDiv} />}
              <View style={s.macroItem}>
                <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Meals */}
        <Text style={s.sectionTitle}>Meals</Text>

        {meals.length > 0 ? (
          meals.reverse().map((meal) => (
            <MealListItem
              key={meal.id}
              meal={meal}
              onPress={() => router.push(`/meal/${meal.id}`)}
            />
          ))
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No meals logged on this day.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 14 },

  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: { fontSize: 13, fontWeight: '600', color: Colors.text },

  titleBlock: { gap: 3 },
  title: {
    fontSize: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.7,
  },
  subtitle: { fontSize: 13, color: Colors.textMuted },

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
  macroValue: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  macroLabel: {
    fontSize: 9, color: Colors.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },

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
