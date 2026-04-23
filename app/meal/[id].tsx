import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { Colors } from '../../constants/colors';
import { deleteMeal, getMealById, getMealItems, updateMealItem, updateMealName, recalculateMealTotals, type MealItemRow, type MealRow } from '../../lib/db/meals';
import { reestimateItem } from '../../lib/ai/reestimate';
import { upsertDailySummary } from '../../lib/db/summaries';
import { syncPendingMeals } from '../../lib/supabase/sync';
import { useProfileStore } from '../../lib/store/profileStore';

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function fmtDose(n: number): string {
  return n % 1 === 0 ? `${n}u` : `${n}u`;
}

function formatMealTime(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString));
}

function whole(n: number) { return Math.round(n).toString(); }

export default function MealDetailScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { id }    = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal]   = useState<MealRow | null>(null);
  const [items, setItems] = useState<MealItemRow[]>([]);
  const [editingItemId,   setEditingItemId]   = useState<string | null>(null);
  const [editingName,     setEditingName]     = useState('');
  const [reestimatingId,  setReestimatingId]  = useState<string | null>(null);
  const editInputRef = useRef<TextInput>(null);

  const { activeUserId, profiles } = useProfileStore();
  const activeProfile = profiles.find(p => p.id === activeUserId);
  const icr = activeProfile?.insulin_to_carb_ratio ?? null;

  useEffect(() => {
    if (!isFocused || !id) return;
    setMeal(getMealById(id));
    setItems(getMealItems(id));
  }, [id, isFocused]);

  function startEditItem(item: MealItemRow) {
    setEditingItemId(item.id);
    setEditingName(item.corrected_name ?? item.ai_identified_name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  async function commitEditItem(item: MealItemRow) {
    const name = editingName.trim();
    setEditingItemId(null);

    if (!name || name === (item.corrected_name ?? item.ai_identified_name)) return;

    // Optimistically update the name
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, corrected_name: name } : i));
    setReestimatingId(item.id);

    try {
      const nutrition = await reestimateItem(name, item.estimated_weight_g);
      updateMealItem(item.id, { corrected_name: name, ...nutrition });
      if (meal) {
        recalculateMealTotals(meal.id);
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, corrected_name: name, ...nutrition } : i,
        );
        const newMealName = updatedItems
          .slice(0, 3)
          .map(i => i.corrected_name ?? i.ai_identified_name)
          .filter(Boolean)
          .join(', ') || meal.meal_name;
        updateMealName(meal.id, newMealName);
        setMeal({ ...getMealById(meal.id)!, meal_name: newMealName });
        setItems(updatedItems);
      }
    } catch (err) {
      console.warn('[reestimate] failed', err);
    } finally {
      setReestimatingId(null);
    }
  }

  function handleDelete() {
    if (!meal) return;
    Alert.alert(
      'Delete meal',
      `Remove "${meal.meal_name}" permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            deleteMeal(meal.id);
            upsertDailySummary(meal.logged_on_date);
            syncPendingMeals().catch(e => console.warn('[Delete] sync failed', e));
            router.back();
          },
        },
      ],
    );
  }

  if (!meal) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Atmosphere />
        <View style={[s.empty, { paddingTop: insets.top + 24 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.emptyTitle}>Meal not found</Text>
        </View>
      </View>
    );
  }

  const macros = [
    { label: 'Carbs',   value: `${whole(meal.total_carbs_low_g)}–${whole(meal.total_carbs_high_g)}g`, color: Colors.carbs },
    { label: 'Protein', value: `${whole(meal.total_protein_g)}g`,   color: Colors.protein },
    { label: 'Fat',     value: `${whole(meal.total_fat_g)}g`,        color: Colors.fat },
    { label: 'kcal',    value: whole(meal.total_calories_kcal),       color: Colors.calories },
  ];

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.titleBlock}>
          <View style={s.titleRow}>
            <Text style={s.mealType}>{meal.meal_type}</Text>
            {meal.notes ? null : null}
          </View>
          <Text style={s.mealName}>{meal.meal_name}</Text>
          <Text style={s.mealTime}>{formatMealTime(meal.created_at)}</Text>
        </View>

        {/* Note */}
        {meal.notes ? (
          <View style={s.noteCard}>
            <Text style={s.noteText}>{meal.notes}</Text>
          </View>
        ) : null}

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

        {/* Fiasp suggestion */}
        {icr && icr >= 5 && icr <= 50 && (() => {
          const low  = roundHalf(meal.total_carbs_low_g  / icr);
          const high = roundHalf(meal.total_carbs_high_g / icr);
          const display = low === high ? fmtDose(low) : `${fmtDose(low)}–${fmtDose(high)}`;
          return (
            <View style={s.insulinCard}>
              <View style={s.insulinRow}>
                <Text style={s.insulinLabel}>Fiasp</Text>
                <Text style={s.insulinDose}>{display}</Text>
              </View>
              <View style={s.insulinDivider} />
              <Text style={s.insulinDisclaimer}>
                Suggested dose only — always confirm before administering insulin.
              </Text>
            </View>
          );
        })()}

        {/* Items */}
        <Text style={s.sectionTitle}>Items</Text>
        <View style={s.itemsCard}>
          {items.map((item, i) => {
            const isEditing = editingItemId === item.id;
            const displayName = item.corrected_name ?? item.ai_identified_name;
            return (
              <View key={item.id}>
                {i > 0 && <View style={s.itemDivider} />}
                {isEditing ? (
                  <View style={s.itemRowEditing}>
                    <View style={s.itemLeft}>
                      <TextInput
                        ref={editInputRef}
                        style={s.itemNameInput}
                        value={editingName}
                        onChangeText={setEditingName}
                        onSubmitEditing={() => commitEditItem(item)}
                        returnKeyType="done"
                        selectTextOnFocus
                      />
                      <Text style={s.itemMacros}>
                        {whole(item.protein_g)}g protein · {whole(item.fat_g)}g fat · {whole(item.calories_kcal)} kcal
                      </Text>
                    </View>
                    <TouchableOpacity style={s.saveBtn} onPress={() => commitEditItem(item)}>
                      <Text style={s.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.itemRow}
                    onPress={() => reestimatingId !== item.id && startEditItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={s.itemLeft}>
                      <Text style={s.itemName}>{displayName}</Text>
                      {reestimatingId === item.id ? (
                        <Text style={s.itemMacrosLoading}>Recalculating…</Text>
                      ) : (
                        <Text style={s.itemMacros}>
                          {whole(item.protein_g)}g protein · {whole(item.fat_g)}g fat · {whole(item.calories_kcal)} kcal
                        </Text>
                      )}
                    </View>
                    {reestimatingId === item.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={s.itemCarbs}>
                        {whole(item.carbs_low_g)}–{whole(item.carbs_high_g)}g
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Delete */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.78}>
          <Text style={s.deleteText}>Delete meal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 14 },

  empty: { flex: 1, paddingHorizontal: 20, gap: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },

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

  titleBlock: { gap: 4 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealType: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
    lineHeight: 33,
  },
  mealTime: { fontSize: 13, color: Colors.textSecondary },

  noteCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

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

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3,
  },

  itemsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemLeft:   { flex: 1, gap: 2 },
  itemName:   { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemRowEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemNameInput: {
    fontSize: 14, fontWeight: '600', color: Colors.text,
    borderBottomWidth: 1.5, borderBottomColor: Colors.primary,
    paddingVertical: 0, marginBottom: 2,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  itemMacros: { fontSize: 11, color: Colors.textMuted },
  itemMacrosLoading: { fontSize: 11, color: Colors.primary, fontStyle: 'italic' },
  itemCarbs:  { fontSize: 15, fontWeight: '700', color: Colors.carbs },

  insulinCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  insulinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insulinLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  insulinDose: { fontSize: 22, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5 },
  insulinDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  insulinDisclaimer: { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },

  deleteBtn: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '08',
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
});
