import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { estimateNutrition } from "../lib/ai/estimate";
import { identifyFoods } from "../lib/ai/identify";
import type { NutritionItem } from "../lib/ai/types";
import type { MealType, PortionSize } from "../lib/db/meals";
import { saveMeal } from "../lib/db/meals";
import { upsertDailySummary } from "../lib/db/summaries";
import { useMealStore } from "../lib/store/mealStore";
import { syncPendingMeals } from "../lib/supabase/sync";

// ─── types ───────────────────────────────────────────────────────────────────

type AnalysingStep = "identifying" | "estimating" | null;
interface EditState {
  index: number | null;
  name: string;
}

// ─── constants ───────────────────────────────────────────────────────────────

const PORTIONS: { sub: string; size: PortionSize; multiplier: number }[] = [
  { sub: "Quarter", size: "quarter", multiplier: 0.25 },
  { sub: "Half", size: "half", multiplier: 0.5 },
  { sub: "¾ plate", size: "three-quarters", multiplier: 0.75 },
  { sub: "Full", size: "full", multiplier: 1.0 },
];

const EMPTY_ITEM: NutritionItem = {
  name: "",
  ai_identified_name: "",
  estimated_weight_g: 0,
  carbs_low_g: 0,
  carbs_high_g: 0,
  protein_g: 0,
  fat_g: 0,
  calories_kcal: 0,
  ai_notes: "",
};

// Two pages only
const STEPS = ["Portion", "Review"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function whole(n: number) {
  return Math.round(n).toString();
}

function applyMultiplier(items: NutritionItem[], m: number): NutritionItem[] {
  return items.map((item) => ({
    ...item,
    estimated_weight_g: Math.round(item.estimated_weight_g * m),
    carbs_low_g: Math.round(item.carbs_low_g * m * 10) / 10,
    carbs_high_g: Math.round(item.carbs_high_g * m * 10) / 10,
    protein_g: Math.round(item.protein_g * m * 10) / 10,
    fat_g: Math.round(item.fat_g * m * 10) / 10,
    calories_kcal: Math.round(item.calories_kcal * m),
  }));
}

function deriveMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h >= 12 && h < 15) return "lunch";
  if (h >= 19 && h < 22) return "dinner";
  return "snack";
}

function generateMealName(items: { name: string }[]): string {
  return (
    items
      .slice(0, 3)
      .map((i) => i.name)
      .filter(Boolean)
      .join(", ") || "Meal"
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const {
    draft,
    setPortion,
    setAIResults,
    updateItem,
    removeItem,
    addItem,
    reset,
  } = useMealStore();

  // Slide animation — two absoluteFill layers
  const enterAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(0)).current;
  const photoAnim = useRef(new Animated.Value(H * 0.46)).current;

  const [page, setPage] = useState(0);
  const [exitingPage, setExitingPage] = useState<number | null>(null);

  // Page 0
  const [portionSize, setPortionSize] = useState<PortionSize>("full");
  const [analysingStep, setAnalysingStep] = useState<AnalysingStep>(null);

  // Page 1
  const [mealName, setMealName] = useState(() => generateMealName(draft.items));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const imageUri = draft.imageBase64
    ? `data:image/jpeg;base64,${draft.imageBase64}`
    : null;

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

  // ── navigation ──────────────────────────────────────────────────────────────

  function goTo(target: number) {
    const direction = target > page ? 1 : -1;
    const outgoing = page;

    enterAnim.setValue(direction * W);
    exitAnim.setValue(0);

    setPage(target);
    setExitingPage(outgoing);

    Animated.parallel([
      Animated.spring(enterAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 15,
      }),
      Animated.spring(exitAnim, {
        toValue: -direction * W,
        useNativeDriver: true,
        tension: 100,
        friction: 15,
      }),
      Animated.spring(photoAnim, {
        toValue: target === 0 ? H * 0.46 : H * 0.22,
        useNativeDriver: false,
        tension: 90,
        friction: 14,
      }),
    ]).start(({ finished }) => {
      if (finished) setExitingPage(null);
    });
  }

  function handleBack() {
    if (page === 0) router.back();
    else goTo(0);
  }

  // ── page 0: portion + analyse ───────────────────────────────────────────────

  function handlePortionSelect(size: PortionSize, multiplier: number) {
    setPortionSize(size);
    setPortion(size, multiplier);
  }

  async function handleAnalyse() {
    if (!draft.imageBase64) {
      Alert.alert("No image", "Go back and take a photo first.");
      return;
    }
    setAnalysingStep("identifying");
    try {
      const identified = await identifyFoods(draft.imageBase64);
      if (!identified.items.length)
        throw new Error("No food detected. Try retaking the photo.");
      setAnalysingStep("estimating");
      const result = await estimateNutrition(
        draft.imageBase64,
        identified.items,
      );
      const adjusted = applyMultiplier(
        result.items,
        draft.portionMultiplier || 1.0,
      );
      setAIResults(adjusted, result.overall_confidence, result.image_quality);
      setMealName(generateMealName(adjusted));
      setAnalysingStep(null);
      goTo(1);
    } catch (err) {
      setAnalysingStep(null);
      Alert.alert(
        "Analysis failed",
        err instanceof Error ? err.message : "Unknown error",
        [
          { text: "Retake", onPress: () => router.back() },
          { text: "Retry", onPress: handleAnalyse },
        ],
      );
    }
  }

  // ── page 1: review + save ───────────────────────────────────────────────────

  function openEdit(i: number) {
    setEditState({ index: i, name: draft.items[i].name });
  }
  function openAdd() {
    setEditState({ index: null, name: "" });
  }
  function closeEdit() {
    setEditState(null);
  }

  function commitEdit() {
    if (!editState) return;
    const t = editState.name.trim();
    if (!t) {
      closeEdit();
      return;
    }
    if (editState.index === null) {
      addItem({ ...EMPTY_ITEM, name: t, ai_identified_name: t });
    } else {
      updateItem(editState.index, { name: t });
    }
    closeEdit();
  }

  function handleRemove(i: number) {
    Alert.alert("Remove item", `Remove "${draft.items[i].name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeItem(i) },
    ]);
  }

  function openNote() {
    setNoteDraft(notes);
    setNoteModalOpen(true);
  }

  function commitNote() {
    setNotes(noteDraft.trim());
    setNoteModalOpen(false);
  }

  async function handleSave() {
    if (saving || !draft.items.length) return;
    const finalName =
      mealName.trim() || generateMealName(draft.items) || "Meal";
    setSaving(true);
    try {
      const saved = saveMeal({
        mealType: deriveMealType(),
        mealName: finalName,
        portionSize: draft.portionSize,
        portionMultiplier: draft.portionMultiplier,
        items: draft.items,
        aiConfidence: draft.overallConfidence,
        imageQuality: draft.imageQuality,
        notes: notes.trim() || undefined,
      });
      upsertDailySummary(saved.loggedOnDate);
      syncPendingMeals().catch((e) => console.warn("[sync]", e));
      reset();
      router.dismissAll();
    } catch (err) {
      Alert.alert(
        "Could not save meal",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── page renderer ───────────────────────────────────────────────────────────

  function renderPage(p: number, style?: StyleProp<ViewStyle>) {
    if (p === 0) {
      return (
        <View style={[s.pageFill, style]}>
          <Text style={s.portionCaption}>How much did you eat?</Text>
          <View style={s.segmented}>
            {PORTIONS.map((opt) => {
              const active = portionSize === opt.size;
              return (
                <TouchableOpacity
                  key={opt.size}
                  style={[s.segItem, active && s.segItemActive]}
                  onPress={() => handlePortionSelect(opt.size, opt.multiplier)}
                  activeOpacity={0.72}
                >
                  <Text style={[s.segLabel, active && s.segLabelActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    // Page 1 — review
    return (
      <ScrollView
        style={[s.pageFill, style]}
        contentContainerStyle={s.reviewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Editable meal name */}
        <TextInput
          style={s.mealNameInput}
          value={mealName}
          onChangeText={setMealName}
          placeholder="Meal name"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
        />

        <View style={s.divider} />

        {/* Items */}
        {draft.items.length === 0 && (
          <Text style={s.emptyText}>No items detected — add one below.</Text>
        )}
        {draft.items.map((item, i) => (
          <View key={i} style={s.itemRow}>
            <TouchableOpacity
              style={s.itemMain}
              onPress={() => openEdit(i)}
              activeOpacity={0.7}
            >
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemCarbs}>
                {whole(item.carbs_low_g)}–{whole(item.carbs_high_g)}g carbs
              </Text>
              <Text style={s.itemMacros}>
                {whole(item.protein_g)}g protein · {whole(item.fat_g)}g fat ·{" "}
                {whole(item.calories_kcal)} kcal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemove(i)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add more */}
        <View style={s.addRow}>
          <TouchableOpacity
            style={s.addScanBtn}
            onPress={() => router.push("/camera?mode=addmore")}
            activeOpacity={0.78}
          >
            <Text style={s.addScanText}>Scan another dish</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.addManualBtn}
            onPress={openAdd}
            activeOpacity={0.78}
          >
            <Text style={s.addManualText}>Add manually</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <TouchableOpacity
          style={s.noteBtn}
          onPress={openNote}
          activeOpacity={0.7}
        >
          {notes ? (
            <View style={s.noteExisting}>
              <Text style={s.noteText} numberOfLines={2}>
                {notes}
              </Text>
              <Text style={s.noteEditHint}>Edit note</Text>
            </View>
          ) : (
            <Text style={s.noteAddText}>+ Add a note</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      {/* Photo with header overlay */}
      <Animated.View style={[s.photo, { height: photoAnim }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]}
          />
        )}

        <View style={[s.scrim, { paddingTop: 12 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={s.glassBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.glassBtnText}>
                {page === 0 ? "← Retake" : "← Back"}
              </Text>
            </TouchableOpacity>

            <View style={s.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[s.dot, i === page && s.dotActive]} />
              ))}
            </View>

            <View style={s.glassLabel}>
              <Text style={s.glassLabelText}>{STEPS[page]}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Page area */}
      <View style={s.pageArea}>
        {exitingPage !== null && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: exitAnim }] },
            ]}
          >
            {renderPage(exitingPage)}
          </Animated.View>
        )}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: enterAnim }] },
          ]}
        >
          {renderPage(page)}
        </Animated.View>
      </View>

      {/* Footer */}
      <View
        style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
      >
        {page === 0 && (
          <TouchableOpacity
            style={[s.cta, analysingStep !== null && s.ctaLoading]}
            onPress={handleAnalyse}
            disabled={analysingStep !== null}
            activeOpacity={0.85}
          >
            {analysingStep !== null ? (
              <View style={s.loadingRow}>
                <ActivityIndicator
                  color="rgba(255,255,255,0.75)"
                  size="small"
                />
                <Text style={s.ctaText}>
                  {analysingStep === "identifying"
                    ? "Identifying food…"
                    : "Estimating nutrition…"}
                </Text>
              </View>
            ) : (
              <Text style={s.ctaText}>Analyse meal</Text>
            )}
          </TouchableOpacity>
        )}

        {page === 1 && (
          <>
            <View style={s.totalRow}>
              {[
                {
                  label: "Carbs",
                  value: `${whole(totals.carbsLow)}–${whole(totals.carbsHigh)}g`,
                },
                { label: "Protein", value: `${whole(totals.protein)}g` },
                { label: "Fat", value: `${whole(totals.fat)}g` },
                { label: "kcal", value: whole(totals.calories) },
              ].map(({ label, value }, i) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {i > 0 && <View style={s.totalDiv} />}
                  <View style={s.totalItem}>
                    <Text style={s.totalValue}>{value}</Text>
                    <Text style={s.totalLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[s.cta, (!draft.items.length || saving) && s.ctaDim]}
              onPress={handleSave}
              disabled={saving || !draft.items.length}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.ctaText}>Save meal</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Edit item modal */}
      <Modal
        visible={editState !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={closeEdit}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.sheet}
        >
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>
            {editState?.index === null ? "Add item" : "Edit item name"}
          </Text>
          <TextInput
            style={s.sheetInput}
            value={editState?.name ?? ""}
            onChangeText={(t) =>
              setEditState((prev) => (prev ? { ...prev, name: t } : prev))
            }
            placeholder="e.g. Steamed white rice"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={commitEdit}
          />
          <View style={s.sheetActions}>
            <TouchableOpacity style={s.sheetCancel} onPress={closeEdit}>
              <Text style={s.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetSave} onPress={commitEdit}>
              <Text style={s.sheetSaveText}>
                {editState?.index === null ? "Add" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Note modal */}
      <Modal
        visible={noteModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalOpen(false)}
      >
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={() => setNoteModalOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.sheet}
        >
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Add a note</Text>
          <TextInput
            style={[s.sheetInput, s.noteSheetInput]}
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="e.g. Post-workout, felt full after half…"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            multiline
            returnKeyType="done"
          />
          <View style={s.sheetActions}>
            <TouchableOpacity
              style={s.sheetCancel}
              onPress={() => setNoteModalOpen(false)}
            >
              <Text style={s.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetSave} onPress={commitNote}>
              <Text style={s.sheetSaveText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // Photo
  photo: { width: "100%", backgroundColor: "#0a0a0a", overflow: "hidden" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  glassBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { width: 20, backgroundColor: "#fff" },
  glassLabel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassLabelText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Pages
  pageArea: { flex: 1 },
  pageFill: {
    flex: 1,
    paddingHorizontal: 18,
    backgroundColor: Colors.background,
  },

  // Page 0: Portion
  portionCaption: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 22,
    marginBottom: 14,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceStrong,
    borderRadius: 18,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: 3,
  },
  segItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  segItemActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segLabel: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  segLabelActive: { color: "#fff" },

  // Page 1: Review
  reviewContent: { paddingTop: 16, paddingBottom: 24 },

  mealNameInput: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
    paddingVertical: 4,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted, paddingVertical: 20 },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  itemMain: { flex: 1, gap: 4 },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    textDecorationLine: "underline",
    textDecorationColor: Colors.border,
  },
  itemCarbs: { fontSize: 13, fontWeight: "700", color: Colors.carbs },
  itemMacros: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  removeBtn: { paddingTop: 2 },
  removeBtnText: { fontSize: 14, color: Colors.textMuted },

  addRow: { flexDirection: "row", gap: 8, paddingTop: 14 },
  addScanBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    alignItems: "center",
  },
  addScanText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  addManualBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  addManualText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },

  // Note
  noteBtn: { marginTop: 14, paddingVertical: 10 },
  noteAddText: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },
  noteExisting: { gap: 2 },
  noteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  noteEditHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceStrong,
    gap: 10,
  },
  totalRow: { flexDirection: "row", alignItems: "center" },
  totalItem: { flex: 1, alignItems: "center", gap: 2 },
  totalDiv: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: Colors.border,
  },
  totalValue: { fontSize: 13, fontWeight: "700", color: Colors.text },
  totalLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaLoading: { opacity: 0.82 },
  ctaDim: { opacity: 0.38 },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Modals
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: Colors.surfaceStrong,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 38,
    gap: 14,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  noteSheetInput: { minHeight: 90, textAlignVertical: "top" },
  sheetActions: { flexDirection: "row", gap: 10 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  sheetSave: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  sheetSaveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
