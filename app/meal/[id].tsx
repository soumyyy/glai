import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { MacroCard } from '../../components/MacroCard';
import { Colors } from '../../constants/colors';
import { getMealById, getMealItems, type MealItemRow, type MealRow } from '../../lib/db/meals';

function formatMealTime(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function whole(value: number) {
  return Math.round(value).toString();
}

export default function MealDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal] = useState<MealRow | null>(null);
  const [items, setItems] = useState<MealItemRow[]>([]);

  useEffect(() => {
    if (!isFocused || !id) return;

    setMeal(getMealById(id));
    setItems(getMealItems(id));
  }, [id, isFocused]);

  if (!meal) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Atmosphere />
        <View style={[styles.emptyState, { paddingTop: insets.top + 32 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.emptyTitle}>Meal not found.</Text>
          <Text style={styles.emptyCopy}>
            The record may have been removed locally or never saved on this device.
          </Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.overline}>MEAL DETAIL</Text>
          <Text style={styles.title}>{meal.meal_name}</Text>
          <Text style={styles.subtitle}>{formatMealTime(meal.created_at)}</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{meal.meal_type}</Text>
            </View>
            <View style={styles.syncPill}>
              <Text style={styles.syncPillText}>
                {meal.synced_to_cloud ? 'Synced' : 'Pending sync'}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <ConfidenceBadge confidence={meal.ai_confidence} />
            <View style={styles.imageQualityPill}>
              <Text style={styles.imageQualityText}>{meal.image_quality} image</Text>
            </View>
          </View>

          {meal.notes ? <Text style={styles.noteText}>{meal.notes}</Text> : null}
        </View>

        <View style={styles.grid}>
          <MacroCard
            label="Carbs"
            value={`${whole(meal.total_carbs_low_g)}-${whole(meal.total_carbs_high_g)}g`}
            color={Colors.carbs}
          />
          <MacroCard
            label="Protein"
            value={`${whole(meal.total_protein_g)}g`}
            color={Colors.protein}
          />
          <MacroCard
            label="Fat"
            value={`${whole(meal.total_fat_g)}g`}
            color={Colors.fat}
          />
          <MacroCard
            label="Calories"
            value={whole(meal.total_calories_kcal)}
            color={Colors.calories}
          />
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Log settings</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Portion</Text>
            <Text style={styles.metaValue}>
              {meal.portion_size} ({meal.portion_multiplier}x)
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.sectionCaption}>What the model recorded for this meal.</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.corrected_name ?? item.ai_identified_name}</Text>
              <Text style={styles.itemWeight}>{whole(item.estimated_weight_g)}g</Text>
            </View>

            {item.corrected_name ? (
              <Text style={styles.itemOriginal}>AI originally identified: {item.ai_identified_name}</Text>
            ) : null}

            <Text style={styles.itemCarbs}>
              {whole(item.carbs_low_g)}-{whole(item.carbs_high_g)}g carbs
            </Text>
            <Text style={styles.itemMacros}>
              Protein {whole(item.protein_g)}g · Fat {whole(item.fat_g)}g · Calories {whole(item.calories_kcal)}
            </Text>

            {item.ai_notes ? <Text style={styles.itemNotes}>{item.ai_notes}</Text> : null}
          </View>
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
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  typePill: {
    backgroundColor: Colors.surfaceStrong,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typePillText: {
    color: Colors.text,
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  syncPill: {
    backgroundColor: Colors.surfaceStrong,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncPillText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  imageQualityPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imageQualityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  noteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 10,
  },
  metaTitle: {
    fontSize: 19,
    color: Colors.text,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  itemName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 23,
    color: Colors.text,
    fontWeight: '700',
  },
  itemWeight: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  itemOriginal: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  itemCarbs: {
    fontSize: 17,
    color: Colors.carbs,
    fontWeight: '700',
  },
  itemMacros: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  itemNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyCopy: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
