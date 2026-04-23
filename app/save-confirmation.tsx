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
import { Colors } from '../constants/colors';
import type { MealType } from '../lib/db/meals';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function suggestMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h >= 12 && h < 15) return 'lunch';
  if (h >= 19 && h < 22) return 'dinner';
  return 'snack';
}

function generateMealName(items: { name: string }[]): string {
  return items.slice(0, 3).map((i) => i.name).filter(Boolean).join(', ') || 'Meal';
}

function whole(n: number) { return Math.round(n).toString(); }

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
    const finalName = mealName.trim() || generateMealName(draft.items) || 'Meal';
    setSaving(true);
    try {
      const saved = saveMeal({
        mealType,
        mealName: finalName,
        portionSize: draft.portionSize,
        portionMultiplier: draft.portionMultiplier,
        items: draft.items,
        aiConfidence: draft.overallConfidence,
        imageQuality: draft.imageQuality,
        notes: notes.trim() || undefined,
      });
      upsertDailySummary(saved.loggedOnDate);
      syncPendingMeals().catch((e) => console.warn('[Save] sync failed', e));
      reset();
      router.dismissAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Could not save meal', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + carb summary in one compact header */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.carbSummary}>
              <Text style={styles.carbValue}>
                {whole(totals.carbsLow)}–{whole(totals.carbsHigh)}g
              </Text>
              <Text style={styles.carbLabel}>carbs</Text>
            </View>
          </View>

          {/* Macro sub-line */}
          <Text style={styles.macroLine}>
            {whole(totals.protein)}g protein · {whole(totals.fat)}g fat · {whole(totals.calories)} kcal
          </Text>
          <Text style={styles.itemLine}>
            {draft.items.length} item{draft.items.length !== 1 ? 's' : ''} · {draft.portionSize} portion
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Name field */}
          <View style={styles.field}>
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
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Meal type</Text>
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, mealType === t && styles.typeChipActive]}
                  onPress={() => setMealType(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.typeChipText, mealType === t && styles.typeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes…"
              placeholderTextColor={Colors.textMuted}
              multiline
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDim]}
            onPress={handleSave}
            disabled={saving || !canSave}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save meal</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 18, gap: 14 },

  // Top
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtnText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  carbSummary: { alignItems: 'flex-end' },
  carbValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
    lineHeight: 32,
  },
  carbLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'right',
  },
  macroLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -4,
  },
  itemLine: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'capitalize',
    marginTop: -6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },

  // Fields
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optional: {
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },

  // Meal type
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeChipTextActive: { color: Colors.primary },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDim: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
});
