import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
import { saveMeal } from '../lib/db/meals';
import { upsertDailySummary } from '../lib/db/summaries';
import { syncPendingMeals } from '../lib/supabase/sync';
import { Atmosphere } from '../components/Atmosphere';
import { Colors } from '../constants/colors';
import type { MealType } from '../lib/db/meals';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function suggestMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour >= 12 && hour < 15) return 'lunch';
  if (hour >= 19 && hour < 22) return 'dinner';
  return 'snack';
}

function generateMealName(items: { name: string }[]): string {
  const names = items.slice(0, 3).map((i) => i.name).filter(Boolean);
  return names.join(', ') || 'Meal';
}

function whole(n: number) {
  return Math.round(n).toString();
}

export default function SaveConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, reset } = useMealStore();
  const canSave = draft.items.length > 0;

  const [mealName, setMealName] = useState(() => generateMealName(draft.items));
  const [mealType, setMealType] = useState<MealType>(suggestMealType);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totals = draft.items.reduce(
    (acc, item) => ({
      carbsLow: acc.carbsLow + item.carbs_low_g,
      carbsHigh: acc.carbsHigh + item.carbs_high_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories_kcal,
    }),
    { carbsLow: 0, carbsHigh: 0, protein: 0, fat: 0, calories: 0 },
  );

  async function handleSave() {
    if (saving || !canSave) return;
    const finalMealName = mealName.trim() || generateMealName(draft.items) || 'Meal';
    setSaving(true);
    try {
      const savedMeal = saveMeal({
        mealType,
        mealName: finalMealName,
        portionSize: draft.portionSize,
        portionMultiplier: draft.portionMultiplier,
        items: draft.items,
        aiConfidence: draft.overallConfidence,
        imageQuality: draft.imageQuality,
        notes: notes.trim() || undefined,
      });
      upsertDailySummary(savedMeal.loggedOnDate);
      syncPendingMeals().catch((err) => console.warn('[Save] sync:failed', err));
      reset();
      router.dismissAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Could not save meal', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Atmosphere />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.overline}>SAVE MEAL</Text>
            <Text style={styles.title}>Name &amp; tag your meal</Text>
            <Text style={styles.subtitle}>
              Confirm the details before saving to your log.
            </Text>
          </View>

          {/* Macro summary */}
          <View style={styles.macroCard}>
            <Text style={styles.macroCardLabel}>Meal totals</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.carbs }]}>
                  {whole(totals.carbsLow)}–{whole(totals.carbsHigh)}g
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.protein }]}>{whole(totals.protein)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.fat }]}>{whole(totals.fat)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.calories }]}>{whole(totals.calories)}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
            </View>
            <Text style={styles.macroSubnote}>{draft.items.length} item{draft.items.length === 1 ? '' : 's'} · {draft.portionSize} portion</Text>
          </View>

          {/* Meal name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Meal name</Text>
            <TextInput
              style={styles.fieldInput}
              value={mealName}
              onChangeText={setMealName}
              placeholder="e.g. Dal Chawal"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
            />
          </View>

          {/* Meal type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Meal type</Text>
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, mealType === type && styles.typeChipActive]}
                  onPress={() => setMealType(type)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.typeChipText, mealType === type && styles.typeChipTextActive]}>
                    {MEAL_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes <Text style={styles.fieldOptional}>(optional)</Text></Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about this meal…"
              placeholderTextColor={Colors.textMuted}
              multiline
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        {/* Save footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || saving) && styles.saveDisabled]}
            onPress={handleSave}
            disabled={saving || !canSave}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveText}>Save meal</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    fontSize: 14,
  },
  overline: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 4,
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
  macroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    gap: 16,
  },
  macroCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  macroDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroSubnote: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  fieldOptional: {
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.success,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
