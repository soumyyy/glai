# Glai — Review Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Review screen (Screen 4) — shows AI-identified items, lets user edit names/remove items/add missed items, live-updating totals bar, and "Confirm & Save" navigates to /save-confirmation. No confidence shown anywhere in UI.

**Architecture:** Read `draft.items` from mealStore. Render each item with `MealItemRow`. Tapping an item opens an inline edit modal (bottom sheet style) to edit the dish name. Remove removes from store. "Add an item" opens the same modal with a blank name. TotalBar updates live as items change. "Confirm & Save" disabled when items list is empty. Navigate to /save-confirmation on confirm.

**Tech Stack:** expo-router, Zustand (mealStore), components/MealItemRow, components/TotalBar

---

## File Map

```
app/review.tsx        Replace: full Review screen implementation
```

---

## Task 1: Build the Review screen

**Files:**
- Replace: `app/review.tsx`

- [ ] **Step 1: Read existing app/review.tsx first**

```bash
cat /Users/soumya/Desktop/glai/app/review.tsx
```

- [ ] **Step 2: Replace app/review.tsx**

```typescript
// app/review.tsx
import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMealStore } from '../lib/store/mealStore';
import { MealItemRow } from '../components/MealItemRow';
import { TotalBar } from '../components/TotalBar';
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
  index: number | null; // null = adding new item
  name: string;
}

export default function ReviewScreen() {
  const router = useRouter();
  const { draft, updateItem, removeItem, addItem } = useMealStore();
  const [editState, setEditState] = useState<EditState | null>(null);

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
    if (!trimmed) {
      closeEdit();
      return;
    }
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

  const canSave = draft.items.length > 0;

  return (
    <View style={styles.container}>
      {/* Items list */}
      <FlatList
        data={draft.items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.heading}>Review your meal</Text>
        }
        renderItem={({ item, index }) => (
          <MealItemRow
            item={item}
            onEdit={() => openEdit(index)}
            onRemove={() => handleRemove(index)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No items. Tap "Add an item" below.</Text>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addButton} onPress={openAdd}>
            <Text style={styles.addText}>+ Add an item</Text>
          </TouchableOpacity>
        }
      />

      {/* Live totals */}
      <TotalBar items={draft.items} />

      {/* Confirm & Save */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !canSave && styles.confirmDisabled]}
          onPress={() => router.push('/save-confirmation')}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmText}>Confirm &amp; Save</Text>
        </TouchableOpacity>
      </View>

      {/* Edit / Add modal */}
      <Modal visible={editState !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeEdit} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          <Text style={styles.sheetTitle}>
            {editState?.index === null ? 'Add item' : 'Edit item name'}
          </Text>
          <TextInput
            style={styles.input}
            value={editState?.name ?? ''}
            onChangeText={(text) => setEditState((s) => s ? { ...s, name: text } : s)}
            placeholder="e.g. Steamed white rice"
            placeholderTextColor={Colors.textSecondary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={commitEdit}
          />
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={commitEdit}>
              <Text style={styles.saveBtnText}>
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
  container: { flex: 1, backgroundColor: Colors.background },

  list: { padding: 16, paddingBottom: 8 },

  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },

  empty: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 32,
  },

  addButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Modal / sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 4: Commit and push**

```bash
cd /Users/soumya/Desktop/glai
git add app/review.tsx
git commit -m "feat: build Review screen with live totals, item edit/remove/add, and Confirm & Save"
git push
```
