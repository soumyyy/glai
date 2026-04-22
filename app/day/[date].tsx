import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { MacroCard } from '../../components/MacroCard';
import { MealListItem } from '../../components/MealListItem';
import { Colors } from '../../constants/colors';
import { getMealsForDate, type MealRow } from '../../lib/db/meals';
import { getSummaryForDate, type DailySummaryRow } from '../../lib/db/summaries';

function formatDateLine(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));
}

function percentageText(summary: DailySummaryRow | null) {
  if (!summary) return 'No macro distribution yet.';

  const carbCalories = summary.total_carbs_g * 4;
  const proteinCalories = summary.total_protein_g * 4;
  const fatCalories = summary.total_fat_g * 9;
  const total = carbCalories + proteinCalories + fatCalories;

  if (total <= 0) return 'No macro distribution yet.';

  const carbs = Math.round((carbCalories / total) * 100);
  const protein = Math.round((proteinCalories / total) * 100);
  const fat = Math.round((fatCalories / total) * 100);

  return `Carbs ${carbs}% · Protein ${protein}% · Fat ${fat}%`;
}

function whole(value: number) {
  return Math.round(value).toString();
}

export default function DayDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [summary, setSummary] = useState<DailySummaryRow | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);

  useEffect(() => {
    if (!isFocused || !date) return;

    setSummary(getSummaryForDate(date));
    setMeals(getMealsForDate(date));
  }, [date, isFocused]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.overline}>DAY DETAIL</Text>
          <Text style={styles.title}>{date ? formatDateLine(date) : 'Day detail'}</Text>
          <Text style={styles.subtitle}>{percentageText(summary)}</Text>
        </View>

        <View style={styles.grid}>
          <MacroCard
            label="Carbs"
            value={summary ? `${whole(summary.total_carbs_g)}g` : '0g'}
            color={Colors.carbs}
          />
          <MacroCard
            label="Protein"
            value={summary ? `${whole(summary.total_protein_g)}g` : '0g'}
            color={Colors.protein}
          />
          <MacroCard
            label="Fat"
            value={summary ? `${whole(summary.total_fat_g)}g` : '0g'}
            color={Colors.fat}
          />
          <MacroCard
            label="Calories"
            value={summary ? `${whole(summary.total_calories_kcal)}` : '0'}
            color={Colors.calories}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meals</Text>
          <Text style={styles.sectionCaption}>
            {summary?.meal_count ?? 0} meal{summary?.meal_count === 1 ? '' : 's'} saved on this day.
          </Text>
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
            <Text style={styles.emptyTitle}>No saved meals for this day.</Text>
            <Text style={styles.emptyCopy}>
              Once you log meals, this view becomes the detailed archive for that date.
            </Text>
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
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: {
    color: Colors.text,
    fontWeight: '700',
  },
  overline: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
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
    gap: 10,
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
});
