import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
import { Atmosphere } from '../components/Atmosphere';
import { Colors } from '../constants/colors';
import type { NutritionItem } from '../lib/ai/types';

const EMPTY_ITEM: NutritionItem = {
  name: '',
  ai_identified_name: '',
  estimated_weight_g: 0,
  carbs_low_g: 0,
  carbs_high_g: 0,
  protein_g: 0,
  fat_g: 0,
  calories_kcal: 0,
  ai_notes: '',
};

interface EditState {
  index: number | null;
  name: string;
}

function whole(n: number) {
  return Math.round(n).toString();
}

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, updateItem, removeItem, addItem } = useMealStore();
  const [editState, setEditState] = useState<EditState | null>(null);

  const canSave = draft.items.length > 0;

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

  function openEdit(index: number) {
    setEditState({ index, name: draft.items[index].name });
  }

  function openAdd() {
    setEditState({ index: null, name: '' });
  }

  function closeEdit() {
    setEditState(null);
  }

  function commitEdit() {
    if (!editState) return;
    const trimmed = editState.name.trim();
    if (!trimmed) { closeEdit(); return; }
    if (editState.index === null) {
      addItem({ ...EMPTY_ITEM, name: trimmed, ai_identified_name: trimmed });
    } else {
      updateItem(editState.index, { name: trimmed });
    }
    closeEdit();
  }

  function handleRemove(index: number) {
    Alert.alert('Remove item', `Remove "${draft.items[index].name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(index) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Review your meal</Text>
          <Text style={styles.subtitle}>Tap any item to correct the name.</Text>
        </View>

        {/* Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Identified items</Text>
          <Text style={styles.sectionCaption}>{draft.items.length} item{draft.items.length === 1 ? '' : 's'} detected</Text>
        </View>

        {draft.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No items detected.</Text>
            <Text style={styles.emptySubtext}>Tap &quot;Add an item&quot; below to add one manually.</Text>
          </View>
        ) : null}

        {draft.items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <TouchableOpacity style={styles.itemNameButton} onPress={() => openEdit(index)}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemEditHint}>tap to edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.itemCarbs}>
              {whole(item.carbs_low_g)}–{whole(item.carbs_high_g)}g carbs
            </Text>

            <View style={styles.itemMacroRow}>
              <View style={styles.itemMacro}>
                <Text style={styles.itemMacroValue}>{whole(item.protein_g)}g</Text>
                <Text style={styles.itemMacroLabel}>Protein</Text>
              </View>
              <View style={styles.itemMacroDivider} />
              <View style={styles.itemMacro}>
                <Text style={styles.itemMacroValue}>{whole(item.fat_g)}g</Text>
                <Text style={styles.itemMacroLabel}>Fat</Text>
              </View>
              <View style={styles.itemMacroDivider} />
              <View style={styles.itemMacro}>
                <Text style={styles.itemMacroValue}>{whole(item.calories_kcal)}</Text>
                <Text style={styles.itemMacroLabel}>kcal</Text>
              </View>
              <View style={styles.itemMacroDivider} />
              <View style={styles.itemMacro}>
                <Text style={styles.itemMacroValue}>~{whole(item.estimated_weight_g)}g</Text>
                <Text style={styles.itemMacroLabel}>Weight</Text>
              </View>
            </View>

            {item.ai_notes ? (
              <Text style={styles.itemNotes}>{item.ai_notes}</Text>
            ) : null}
          </View>
        ))}

        {/* Add item */}
        <TouchableOpacity style={styles.addCard} onPress={openAdd} activeOpacity={0.78}>
          <Text style={styles.addText}>+ Add an item</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Total bar + CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>
              {whole(totals.carbsLow)}–{whole(totals.carbsHigh)}g
            </Text>
            <Text style={styles.totalLabel}>Carbs</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.protein)}g</Text>
            <Text style={styles.totalLabel}>Protein</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.fat)}g</Text>
            <Text style={styles.totalLabel}>Fat</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.calories)}</Text>
            <Text style={styles.totalLabel}>kcal</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !canSave && styles.confirmDisabled]}
          onPress={() => router.push('/save-confirmation')}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmText}>Confirm &amp; Save</Text>
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={editState !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeEdit} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {editState?.index === null ? 'Add item' : 'Edit item name'}
          </Text>
          <TextInput
            style={styles.sheetInput}
            value={editState?.name ?? ''}
            onChangeText={(text) => setEditState((s) => s ? { ...s, name: text } : s)}
            placeholder="e.g. Steamed white rice"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={commitEdit}
          />
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancel} onPress={closeEdit}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetSave} onPress={commitEdit}>
              <Text style={styles.sheetSaveText}>
                {editState?.index === null ? 'Add' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    gap: 14,
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
  title: {
    fontSize: 28,
    lineHeight: 33,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionHeader: {
    marginTop: 4,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  sectionCaption: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemNameButton: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 23,
  },
  itemEditHint: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceStrong,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  itemCarbs: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: -0.4,
  },
  itemMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMacro: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  itemMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  itemMacroValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  itemMacroLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  addCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
  },
  addText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
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
    gap: 14,
  },
  totalRow: {
    flexDirection: 'row',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  totalLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheet: {
    backgroundColor: Colors.surfaceStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetCancel: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surfaceStrong,
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  sheetSave: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  sheetSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
