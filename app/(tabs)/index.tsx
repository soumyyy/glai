import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { MealListItem } from '../../components/MealListItem';
import { Colors } from '../../constants/colors';
import { formatLocalDate } from '../../lib/date';
import { getMealsForDate, type MealRow } from '../../lib/db/meals';
import { getSummaryForDate, type DailySummaryRow } from '../../lib/db/summaries';
import { useSyncStore } from '../../lib/store/syncStore';
import { syncAndRestoreCloudMeals } from '../../lib/supabase/sync';

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatScreenDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(date);
}

function whole(value: number) { return Math.round(value).toString(); }

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [summary, setSummary] = useState<DailySummaryRow | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const lastSuccessfulSyncAt = useSyncStore((state) => state.lastSuccessfulSyncAt);

  function refreshToday() {
    const today = formatLocalDate(new Date());
    setSummary(getSummaryForDate(today));
    setMeals(getMealsForDate(today).reverse());
  }

  useEffect(() => {
    if (!isFocused) return;
    refreshToday();
    syncAndRestoreCloudMeals()
      .then(refreshToday)
      .catch((error) => {
        console.warn('[Restore] home refresh failed', error);
      });
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !lastSuccessfulSyncAt) return;
    refreshToday();
  }, [isFocused, lastSuccessfulSyncAt]);

  const today = new Date();
  const carbs   = summary ? whole(summary.total_carbs_g)        : '—';
  const protein = summary ? whole(summary.total_protein_g)      : '—';
  const fat     = summary ? whole(summary.total_fat_g)          : '—';
  const calories = summary ? whole(summary.total_calories_kcal) : '—';
  const mealCount = summary?.meal_count ?? 0;

  return (
    <View style={styles.screen}>
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting row */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.greeting}>{getGreeting(today)}</Text>
            <Text style={styles.date}>{formatScreenDate(today)}</Text>
          </View>
          <View style={styles.mealBadge}>
            <Text style={styles.mealBadgeNumber}>{mealCount}</Text>
            <Text style={styles.mealBadgeLabel}>meal{mealCount === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* Hero carb number */}
        <View style={styles.heroSection}>
          <Text style={styles.carbsLabel}>TODAY&apos;S CARBS</Text>
          <Text style={styles.carbsNumber}>
            {carbs}<Text style={styles.carbsUnit}>g</Text>
          </Text>
          <View style={styles.carbsUnderline} />
        </View>

        {/* Macro strip */}
        <View style={styles.macroStrip}>
          {[
            { label: 'Protein', value: `${protein}g`, color: Colors.protein },
            { label: 'Fat',     value: `${fat}g`,     color: Colors.fat },
            { label: 'kcal',    value: calories,       color: Colors.calories },
          ].map((m, i, arr) => (
            <View key={m.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <View style={styles.macroDiv} />}
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Meals list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logged today</Text>
          {mealCount > 0 && (
            <Text style={styles.sectionMeta}>{mealCount} meal{mealCount === 1 ? '' : 's'}</Text>
          )}
        </View>

        {meals.length > 0 ? (
          meals.map((meal) => (
            <MealListItem
              key={meal.id}
              meal={meal}
              onPress={() => router.push(`/meal/${meal.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconRing}>
              <View style={styles.emptyIconInner} />
            </View>
            <View style={styles.emptyTextBlock}>
              <Text style={styles.emptyTitle}>Nothing logged yet.</Text>
              <Text style={styles.emptyCopy}>
                Photograph a meal — Glai identifies the food and estimates carbs automatically.
              </Text>
            </View>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/camera')}>
              <Text style={styles.emptyButtonText}>Open camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 12 },

  // Greeting
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: { gap: 2 },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  mealBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  mealBadgeNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  mealBadgeLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Hero
  heroSection: { gap: 4 },
  carbsLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  carbsNumber: {
    fontSize: 80,
    lineHeight: 80,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: -3,
  },
  carbsUnit: { fontSize: 38, letterSpacing: -1 },
  carbsUnderline: {
    width: 40,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.carbs,
    opacity: 0.3,
    marginTop: 2,
  },

  // Macro strip
  macroStrip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  macroItem: { flex: 1, alignItems: 'center', gap: 3 },
  macroDiv: { width: 1, height: 24, backgroundColor: Colors.border, alignSelf: 'center' },
  macroValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  macroLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  sectionMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
  },
  emptyIconRing: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textMuted,
  },
  emptyTextBlock: { gap: 4 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
