import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import type { MealType } from "../lib/db/meals";
import { saveMeal } from "../lib/db/meals";
import { upsertDailySummary } from "../lib/db/summaries";
import { getSyncErrorMessage } from "../lib/errors/userMessages";
import { syncPendingMeals } from "../lib/supabase/sync";

function deriveMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h >= 12 && h < 15) return "lunch";
  if (h >= 19 && h < 22) return "dinner";
  return "snack";
}

export default function ManualEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    name.trim().length > 0 &&
    carbs.trim().length > 0 &&
    !isNaN(parseFloat(carbs));

  async function handleSave() {
    if (saving || !canSave) return;
    setSaving(true);
    try {
      const carbsVal = parseFloat(carbs) || 0;
      const saved = saveMeal({
        mealType: deriveMealType(),
        mealName: name.trim(),
        portionSize: "custom",
        portionMultiplier: 1.0,
        items: [
          {
            name: name.trim(),
            ai_identified_name: name.trim(),
            estimated_weight_g: 0,
            carbs_low_g: carbsVal,
            carbs_high_g: carbsVal,
            protein_g: parseFloat(protein) || 0,
            fat_g: parseFloat(fat) || 0,
            calories_kcal: parseFloat(calories) || 0,
            ai_notes: "",
          },
        ],
        aiConfidence: 1.0,
        imageQuality: "acceptable",
      });
      upsertDailySummary(saved.loggedOnDate);
      syncPendingMeals().catch((e) => {
        const msg = getSyncErrorMessage(e);
        console.warn("[sync]", e);
        Alert.alert(msg.title, msg.message);
      });
      router.dismissAll();
    } catch (err) {
      Alert.alert(
        "Could not save",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Log manually</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Meal name */}
        <View style={s.field}>
          <Text style={s.label}>
            Meal name <Text style={s.req}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rice bowl"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="next"
            autoFocus
          />
        </View>

        {/* Carbs */}
        <View style={s.field}>
          <Text style={s.label}>
            Carbs (g) <Text style={s.req}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={carbs}
            onChangeText={setCarbs}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>

        <View style={s.divider} />
        <Text style={s.optionalHint}>Optional</Text>

        {/* Protein + Fat side by side */}
        <View style={s.row}>
          <View style={[s.field, s.rowField]}>
            <Text style={s.label}>Protein (g)</Text>
            <TextInput
              style={s.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
          <View style={[s.field, s.rowField]}>
            <Text style={s.label}>Fat (g)</Text>
            <TextInput
              style={s.input}
              value={fat}
              onChangeText={setFat}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Calories */}
        <View style={s.field}>
          <Text style={s.label}>Calories (kcal)</Text>
          <TextInput
            style={s.input}
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
      >
        <TouchableOpacity
          style={[s.cta, !canSave && s.ctaDim]}
          onPress={handleSave}
          disabled={saving || !canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.ctaText}>Save meal</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cancel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 4 },

  field: { gap: 7, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  req: { color: Colors.carbs },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  optionalHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceStrong,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaDim: { opacity: 0.38 },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
