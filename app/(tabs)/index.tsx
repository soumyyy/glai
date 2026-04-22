import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { MacroCard } from '../../components/MacroCard';
import { MealListItem } from '../../components/MealListItem';
import { Colors } from '../../constants/colors';
import { formatLocalDate } from '../../lib/date';
import { getMealsForDate, type MealRow } from '../../lib/db/meals';
import { getSummaryForDate, type DailySummaryRow } from '../../lib/db/summaries';
import { hasSupabaseConfig } from '../../lib/config';

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
  const totalCarbs = summary ? `${whole(summary.total_carbs_g)}g` : '0g';
  const totalProtein = summary ? `${whole(summary.total_protein_g)}g` : '0g';
  const totalFat = summary ? `${whole(summary.total_fat_g)}g` : '0g';
  const totalCalories = summary ? `${whole(summary.total_calories_kcal)}` : '0';

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
        <View style={styles.hero}>
          <Text style={styles.overline}>DAILY CHECK-IN</Text>
          <Text style={styles.title}>{getGreeting(today)}</Text>
          <Text style={styles.subtitle}>{formatScreenDate(today)}</Text>

          <View style={styles.heroCard}>
            <View style={styles.heroCardTop}>
              <View>
                <Text style={styles.heroCardLabel}>Today&apos;s balance</Text>
                <Text style={styles.heroCarbs}>{totalCarbs}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  {summary?.meal_count ?? 0} meal{summary?.meal_count === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroCopy}>
              Range-based nutrition tracking for meals you have already confirmed.
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Local-first logs</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {hasSupabaseConfig() ? 'Cloud sync ready' : 'Local mode'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <MacroCard label="Carbs" value={totalCarbs} color={Colors.carbs} />
          <MacroCard label="Protein" value={totalProtein} color={Colors.protein} />
          <MacroCard label="Fat" value={totalFat} color={Colors.fat} />
          <MacroCard label="Calories" value={totalCalories} color={Colors.calories} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Logged today</Text>
            <Text style={styles.sectionCaption}>Your most recent meals stay one tap away.</Text>
          </View>
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
            <Text style={styles.emptyTitle}>Nothing logged yet today.</Text>
            <Text style={styles.emptyCopy}>
              Use the camera to analyse a meal and Glai will build the rest of the record.
            </Text>
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
    gap: 18,
  },
  hero: {
    gap: 10,
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
    color: Colors.textSecondary,
  },
  heroCard: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 18,
  },
  heroCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroCardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroCarbs: {
    marginTop: 8,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -2,
  },
  heroBadge: {
    backgroundColor: Colors.surfaceStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusPillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  emptyButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: Colors.surfaceStrong,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
