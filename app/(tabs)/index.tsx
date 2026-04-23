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

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatScreenDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function whole(value: number) {
  return Math.round(value).toString();
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [summary, setSummary] = useState<DailySummaryRow | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);

  useEffect(() => {
    if (!isFocused) return;
    const today = formatLocalDate(new Date());
    setSummary(getSummaryForDate(today));
    setMeals(getMealsForDate(today).reverse());
  }, [isFocused]);

  const today = new Date();
  const carbs = summary ? whole(summary.total_carbs_g) : '0';
  const protein = summary ? whole(summary.total_protein_g) : '0';
  const fat = summary ? whole(summary.total_fat_g) : '0';
  const calories = summary ? whole(summary.total_calories_kcal) : '0';
  const mealCount = summary?.meal_count ?? 0;

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
        {/* Date + greeting */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.overline}>DAILY CHECK-IN</Text>
            <Text style={styles.greeting}>{getGreeting(today)}</Text>
            <Text style={styles.date}>{formatScreenDate(today)}</Text>
          </View>
          <View style={styles.mealCountBadge}>
            <Text style={styles.mealCountNumber}>{mealCount}</Text>
            <Text style={styles.mealCountLabel}>meal{mealCount === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* Hero: carb number */}
        <View style={styles.heroSection}>
          <Text style={styles.carbsLabel}>TODAY&apos;S CARBS</Text>
          <Text style={styles.carbsNumber}>{carbs}<Text style={styles.carbsUnit}>g</Text></Text>
          <View style={styles.carbsUnderline} />
        </View>

        {/* Secondary macros strip */}
        <View style={styles.macroStrip}>
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroStripValue, { color: Colors.protein }]}>{protein}g</Text>
            <Text style={styles.macroStripLabel}>Protein</Text>
          </View>
          <View style={styles.macroStripDivider} />
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroStripValue, { color: Colors.fat }]}>{fat}g</Text>
            <Text style={styles.macroStripLabel}>Fat</Text>
          </View>
          <View style={styles.macroStripDivider} />
          <View style={styles.macroStripItem}>
            <Text style={[styles.macroStripValue, { color: Colors.calories }]}>{calories}</Text>
            <Text style={styles.macroStripLabel}>kcal</Text>
          </View>
        </View>

        {/* Meals section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logged today</Text>
          <Text style={styles.sectionCaption}>Most recent meals, tap to expand.</Text>
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
            <View style={styles.emptyText}>
              <Text style={styles.emptyTitle}>Nothing logged yet today.</Text>
              <Text style={styles.emptyCopy}>
                Use the camera to photograph a meal. Glai identifies the food and builds the nutrition record.
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
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 1.8,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  mealCountBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 56,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  mealCountNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  mealCountLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },

  // Hero carb number
  heroSection: {
    paddingVertical: 8,
    gap: 6,
  },
  carbsLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  carbsNumber: {
    fontSize: 88,
    lineHeight: 88,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: -4,
  },
  carbsUnit: {
    fontSize: 42,
    letterSpacing: -2,
    color: Colors.carbs,
  },
  carbsUnderline: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.carbs,
    opacity: 0.35,
    marginTop: 4,
  },

  // Macro strip
  macroStrip: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    paddingVertical: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  macroStripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  macroStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  macroStripValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  macroStripLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Section
  sectionHeader: {
    gap: 3,
    marginTop: 4,
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

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  emptyIconRing: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: Colors.textMuted,
  },
  emptyText: {
    gap: 6,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
