// app/save-confirmation.tsx
import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMealStore } from '../lib/store/mealStore';
import { saveMeal } from '../lib/db/meals';
import { upsertDailySummary } from '../lib/db/summaries';
import { syncPendingMeals } from '../lib/supabase/sync';
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

export default function SaveConfirmationScreen() {
  const router = useRouter();
  const { draft, reset } = useMealStore();

  const [mealName, setMealName] = useState(() => generateMealName(draft.items));
  const [mealType, setMealType] = useState<MealType>(suggestMealType);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Compute read-only totals from draft items
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
    if (saving) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      saveMeal({
        mealType,
        mealName: mealName.trim() || 'Meal',
        portionSize: draft.portionSize,
        portionMultiplier: draft.portionMultiplier,
        items: draft.items,
        aiConfidence: draft.overallConfidence,
        imageQuality: draft.imageQuality,
        notes: notes.trim() || undefined,
      });

      upsertDailySummary(today);

      // Background sync — don't block navigation
      syncPendingMeals().catch(() => {});

      reset();
      router.replace('/');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Macro summary — read only */}
        <View style={styles.macroCard}>
          <Text style={styles.macroHeading}>Meal summary</Text>
          <View style={styles.macroRow}>
            <MacroItem label="Carbs" value={`${totals.carbsLow.toFixed(0)}–${totals.carbsHigh.toFixed(0)}g`} color={Colors.carbs} />
            <MacroItem label="Protein" value={`${totals.protein.toFixed(0)}g`} color={Colors.protein} />
            <MacroItem label="Fat" value={`${totals.fat.toFixed(0)}g`} color={Colors.fat} />
            <MacroItem label="kcal" value={`${totals.calories.toFixed(0)}`} color={Colors.calories} />
          </View>
        </View>

        {/* Meal name */}
        <View style={styles.field}>
          <Text style={styles.label}>Meal name</Text>
          <TextInput
            style={styles.input}
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g. Dal Chawal"
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="done"
          />
        </View>

        {/* Meal type */}
        <View style={styles.field}>
          <Text style={styles.label}>Meal type</Text>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, mealType === type && styles.typeChipActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.typeText, mealType === type && styles.typeTextActive]}>
                  {MEAL_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this meal…"
            placeholderTextColor={Colors.textSecondary}
            multiline
            returnKeyType="done"
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveText}>Save meal</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MacroItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={macroStyles.item}>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, gap: 24, paddingBottom: 8 },

  macroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  macroHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroRow: { flexDirection: 'row' },

  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  typeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeTextActive: { color: Colors.primary },

  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
