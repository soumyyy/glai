import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
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
  const { width: screenWidth } = useWindowDimensions();
  const { draft, updateItem, removeItem, addItem } = useMealStore();
  const [editState, setEditState] = useState<EditState | null>(null);

  const canSave = draft.items.length > 0;
  const imageUri = draft.imageBase64 ? `data:image/jpeg;base64,${draft.imageBase64}` : null;
  const photoHeight = screenWidth * 0.56; // 16:9-ish ratio

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 148 }}
      >
        {/* Photo */}
        {imageUri ? (
          <View style={[styles.photoWrap, { height: photoHeight }]}>
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <TouchableOpacity
              style={[styles.backBtn, { top: insets.top + 14 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.photoWrap, styles.photoPlaceholder, { height: 80, marginTop: insets.top }]}>
            <TouchableOpacity style={styles.backBtnDark} onPress={() => router.back()}>
              <Text style={styles.backBtnDarkText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header strip */}
        <View style={styles.headerStrip}>
          <Text style={styles.headerTitle}>Review your meal</Text>
          <Text style={styles.headerCount}>
            {draft.items.length} item{draft.items.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Items list */}
        <View style={styles.list}>
          {draft.items.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No items detected — add one below.</Text>
            </View>
          ) : null}

          {draft.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TouchableOpacity
                style={styles.itemMain}
                onPress={() => openEdit(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCarbs}>
                  {whole(item.carbs_low_g)}–{whole(item.carbs_high_g)}g carbs
                </Text>
                <Text style={styles.itemMacros}>
                  {whole(item.protein_g)}g protein · {whole(item.fat_g)}g fat · {whole(item.calories_kcal)} kcal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(index)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add row */}
        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addScanBtn}
            onPress={() => router.push('/camera?mode=addmore')}
            activeOpacity={0.78}
          >
            <Text style={styles.addScanText}>Scan another dish</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addManualBtn}
            onPress={openAdd}
            activeOpacity={0.78}
          >
            <Text style={styles.addManualText}>Add manually</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>
              {whole(totals.carbsLow)}–{whole(totals.carbsHigh)}g
            </Text>
            <Text style={styles.totalLabel}>Carbs</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.protein)}g</Text>
            <Text style={styles.totalLabel}>Protein</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.fat)}g</Text>
            <Text style={styles.totalLabel}>Fat</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{whole(totals.calories)}</Text>
            <Text style={styles.totalLabel}>kcal</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, !canSave && styles.confirmBtnDim]}
          onPress={() => router.push('/save-confirmation')}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Confirm &amp; Save</Text>
        </TouchableOpacity>
      </View>

      {/* Edit sheet */}
      <Modal visible={editState !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeEdit} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {editState?.index === null ? 'Add item' : 'Edit name'}
          </Text>
          <TextInput
            style={styles.sheetInput}
            value={editState?.name ?? ''}
            onChangeText={(t) => setEditState((s) => s ? { ...s, name: t } : s)}
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
  screen: { flex: 1, backgroundColor: Colors.background },

  // Photo
  photoWrap: {
    width: '100%',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    backgroundColor: Colors.surfaceStrong,
    paddingHorizontal: 18,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  backBtnDark: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtnDarkText: { color: Colors.text, fontSize: 13, fontWeight: '600' },

  // Header strip
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Items
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  emptyRow: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  itemMain: { flex: 1, gap: 4 },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.border,
  },
  itemCarbs: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.carbs,
    letterSpacing: -0.2,
  },
  itemMacros: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  removeBtn: {
    paddingTop: 2,
  },
  removeBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '400',
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  addScanBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addScanText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addManualBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  addManualText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: Colors.surfaceStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalItem: { flex: 1, alignItems: 'center', gap: 2 },
  totalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: Colors.border,
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
    letterSpacing: 0.5,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnDim: { opacity: 0.4 },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Edit sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.surfaceStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
    gap: 14,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sheetCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  sheetSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  sheetSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
