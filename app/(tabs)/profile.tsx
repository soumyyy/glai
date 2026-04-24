import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Atmosphere } from "../../components/Atmosphere";
import { Colors } from "../../constants/colors";
import { getOpenAIConfig, hasSupabaseConfig } from "../../lib/config";
import { getDb } from "../../lib/db/schema";
import { createProfile, deleteProfile, updateProfile, type UserRow } from "../../lib/db/users";
import { exportMealsCSV } from "../../lib/export";
import { useProfileStore } from "../../lib/store/profileStore";
import { syncAllProfiles } from "../../lib/supabase/sync";

function isOpenAIConfigured() {
  try {
    getOpenAIConfig();
    return true;
  } catch {
    return false;
  }
}

function clearAllData() {
  const db = getDb();
  db.execSync(
    "DELETE FROM meal_items; DELETE FROM meals; DELETE FROM daily_summaries;",
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const openAIConfigured = isOpenAIConfigured();
  const supabaseConfigured = hasSupabaseConfig();
  const [exporting, setExporting] = useState(false);

  const { activeUserId, profiles, setActiveUser, reloadProfiles } =
    useProfileStore();
  const activeProfile =
    profiles.find((p) => p.id === activeUserId) ?? profiles[0];

  // Sheet state
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [addingNew,     setAddingNew]     = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserRow | null>(null);

  // Add form
  const [newName,   setNewName]   = useState('');
  const [newAge,    setNewAge]    = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newIcr,    setNewIcr]    = useState('');

  // Edit form
  const [editName,   setEditName]   = useState('');
  const [editAge,    setEditAge]    = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editIcr,    setEditIcr]    = useState('');

  function openSheet() { setSheetOpen(true); setAddingNew(false); setEditingProfile(null); }
  function closeSheet() {
    setSheetOpen(false); setAddingNew(false); setEditingProfile(null);
    setNewName(''); setNewAge(''); setNewWeight(''); setNewIcr('');
  }

  function openEdit(profile: UserRow) {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditAge(profile.age ? String(profile.age) : '');
    setEditWeight(profile.weight_kg ? String(profile.weight_kg) : '');
    setEditIcr(profile.insulin_to_carb_ratio ? String(profile.insulin_to_carb_ratio) : '');
  }

  function handleSelectProfile(id: string) {
    setActiveUser(id);
    closeSheet();
  }

  function handleAddProfile() {
    const name = newName.trim();
    if (!name) { Alert.alert('Name required'); return; }
    const profile = createProfile(
      name,
      newAge ? Number(newAge) : null,
      newWeight ? Number(newWeight) : null,
      newIcr ? Number(newIcr) : null,
    );
    reloadProfiles();
    setActiveUser(profile.id);
    closeSheet();
    syncAllProfiles().catch(e => console.warn('[Profile] push failed', e));
  }

  function handleSaveEdit() {
    if (!editingProfile) return;
    const name = editName.trim();
    if (!name) { Alert.alert('Name required'); return; }
    updateProfile(editingProfile.id, {
      name,
      age: editAge ? Number(editAge) : null,
      weight_kg: editWeight ? Number(editWeight) : null,
      insulin_to_carb_ratio: editIcr ? Number(editIcr) : null,
    });
    reloadProfiles();
    setEditingProfile(null);
    syncAllProfiles().catch(e => console.warn('[Profile] push failed', e));
  }

  function handleDeleteProfile(profile: UserRow) {
    if (profiles.length <= 1) {
      Alert.alert("Cannot delete", "You need at least one profile.");
      return;
    }
    Alert.alert(
      `Delete "${profile.name}"?`,
      "All meals logged under this profile will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteProfile(profile.id);
            if (activeUserId === profile.id) {
              const remaining = profiles.filter((p) => p.id !== profile.id);
              setActiveUser(remaining[0].id);
            }
            reloadProfiles();
          },
        },
      ],
    );
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportMealsCSV();
    } catch (err) {
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  function handleClearAll() {
    Alert.alert(
      "Clear all data?",
      "Permanently deletes every meal for this profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () =>
            Alert.alert("Are you sure?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Yes, clear everything",
                style: "destructive",
                onPress: clearAllData,
              },
            ]),
        },
      ],
    );
  }

  const connections = [
    { label: 'Vision', status: openAIConfigured ? 'Connected' : 'Not configured', ok: openAIConfigured, neutral: false },
    { label: 'Database', status: supabaseConfigured ? 'Connected' : 'Local only', ok: supabaseConfigured, neutral: !supabaseConfigured },
  ];

  return (
    <View style={s.screen}>
      <Atmosphere />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Profile</Text>

        {/* Identity — tap to switch */}
        <TouchableOpacity
          style={s.card}
          onPress={openSheet}
          activeOpacity={0.75}
        >
          <View style={s.identityRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(activeProfile?.name ?? "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={s.identityText}>
              <Text style={s.identityName}>
                {activeProfile?.name ?? "Unknown"}
              </Text>
              <Text style={s.identityMeta}>
                {profiles.length > 1
                  ? `${profiles.length} profiles · tap to switch`
                  : "Tap to manage profiles"}
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </View>

          <View style={s.cardDivider} />

          <View style={s.statsRow}>
            {[
              {
                label: "Age",
                value: activeProfile?.age ? String(activeProfile.age) : "—",
              },
              {
                label: "Weight",
                value: activeProfile?.weight_kg
                  ? `${activeProfile.weight_kg} kg`
                  : "—",
              },
            ].map((stat, i) => (
              <View
                key={stat.label}
                style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              >
                {i > 0 && <View style={s.statDiv} />}
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Connections */}
        <Text style={s.sectionTitle}>Connections</Text>
        <View style={s.card}>
          {connections.map((c, i) => (
            <View key={c.label}>
              {i > 0 && <View style={s.cardDivider} />}
              <View style={s.connectionRow}>
                <View style={[s.dot, c.ok ? s.dotGreen : c.neutral ? s.dotGrey : s.dotAmber]} />
                <Text style={s.connectionName}>{c.label}</Text>
                <Text style={s.connectionStatus}>{c.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Data actions */}
        <Text style={s.sectionTitle}>Data</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.actionRow}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <Text style={s.actionLabel}>Export to CSV</Text>
            {exporting ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={s.actionChevron}>›</Text>
            )}
          </TouchableOpacity>
          <View style={s.cardDivider} />
          <TouchableOpacity
            style={s.actionRow}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Text style={[s.actionLabel, s.actionDestructive]}>
              Clear all local data
            </Text>
            <Text style={[s.actionChevron, s.actionDestructive]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile switcher sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={closeSheet}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.sheet}
        >
          <View style={s.sheetHandle} />

          {editingProfile ? (
            <>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Edit profile</Text>
                <Text style={s.sheetSubtitle}>{editingProfile.name}</Text>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Name</Text>
                <TextInput
                  style={s.sheetInput} placeholder="Name"
                  placeholderTextColor={Colors.textMuted}
                  value={editName} onChangeText={setEditName}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.formRow}>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={s.formLabel}>Age</Text>
                  <TextInput
                    style={s.sheetInput} placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    value={editAge} onChangeText={setEditAge}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={s.formLabel}>Weight (kg)</Text>
                  <TextInput
                    style={s.sheetInput} placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    value={editWeight} onChangeText={setEditWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Insulin-to-carb ratio (ICR)</Text>
                <TextInput
                  style={s.sheetInput} placeholder="e.g. 16"
                  placeholderTextColor={Colors.textMuted}
                  value={editIcr} onChangeText={setEditIcr}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={s.sheetActions}>
                <TouchableOpacity style={s.sheetCancel} onPress={() => setEditingProfile(null)}>
                  <Text style={s.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetSave} onPress={handleSaveEdit}>
                  <Text style={s.sheetSaveText}>Save changes</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : !addingNew ? (
            <>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Profiles</Text>
                <Text style={s.sheetSubtitle}>
                  {profiles.length} {profiles.length === 1 ? 'member' : 'members'}
                </Text>
              </View>

              <View style={s.profileList}>
                {profiles.map((p, i) => {
                  const isActive = p.id === activeUserId;
                  const initial = p.name.slice(0, 1).toUpperCase();
                  return (
                    <View key={p.id}>
                      {i > 0 && <View style={s.profileDivider} />}
                      <TouchableOpacity
                        style={[s.profileRow, isActive && s.profileRowActive]}
                        onPress={() => isActive ? openEdit(p) : handleSelectProfile(p.id)}
                        activeOpacity={0.6}
                      >
                        <View style={[s.profileAvatar, isActive && s.profileAvatarActive]}>
                          <Text style={[s.profileAvatarText, isActive && s.profileAvatarTextActive]}>
                            {initial}
                          </Text>
                        </View>
                        <View style={s.profileInfo}>
                          <Text style={[s.profileName, isActive && s.profileNameActive]}>{p.name}</Text>
                          <Text style={s.profileMeta}>
                            {[p.age ? `Age ${p.age}` : null, p.weight_kg ? `${p.weight_kg} kg` : null]
                              .filter(Boolean).join(' · ') || 'No details set'}
                          </Text>
                        </View>
                        {isActive ? (
                          <View style={s.activeCheck}>
                            <Text style={s.activeCheckMark}>✓</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={s.deleteBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            onLongPress={() => handleDeleteProfile(p)}
                            delayLongPress={500}
                          >
                            <Text style={s.deleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity style={s.addProfileBtn} onPress={() => setAddingNew(true)} activeOpacity={0.75}>
                <Text style={s.addProfileIcon}>+</Text>
                <Text style={s.addProfileText}>Add profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>New profile</Text>
                <Text style={s.sheetSubtitle}>Fill in what you know</Text>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Name</Text>
                <TextInput
                  style={s.sheetInput} placeholder="e.g. Sarah"
                  placeholderTextColor={Colors.textMuted}
                  value={newName} onChangeText={setNewName}
                  autoFocus autoCapitalize="words"
                />
              </View>

              <View style={s.formRow}>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={s.formLabel}>Age</Text>
                  <TextInput
                    style={s.sheetInput} placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    value={newAge} onChangeText={setNewAge}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={s.formLabel}>Weight (kg)</Text>
                  <TextInput
                    style={s.sheetInput} placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    value={newWeight} onChangeText={setNewWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Insulin-to-carb ratio (ICR)</Text>
                <TextInput
                  style={s.sheetInput} placeholder="e.g. 16"
                  placeholderTextColor={Colors.textMuted}
                  value={newIcr} onChangeText={setNewIcr}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={s.sheetActions}>
                <TouchableOpacity style={s.sheetCancel} onPress={() => setAddingNew(false)}>
                  <Text style={s.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetSave} onPress={handleAddProfile}>
                  <Text style={s.sheetSaveText}>Create profile</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 12 },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 19, fontWeight: "700", color: "#fff" },
  identityText: { flex: 1, gap: 2 },
  identityName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  identityMeta: { fontSize: 12, color: Colors.textMuted },
  chevron: { fontSize: 20, color: Colors.textMuted, lineHeight: 22 },

  statsRow: { flexDirection: "row", paddingVertical: 14 },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statDiv: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    alignSelf: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: Colors.success },
  dotAmber: { backgroundColor: Colors.warning },
  dotGrey: { backgroundColor: Colors.textMuted },
  connectionName: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.text },
  connectionStatus: { fontSize: 13, color: Colors.textMuted },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  actionChevron: { fontSize: 20, color: Colors.textMuted, lineHeight: 22 },
  actionDestructive: { color: Colors.error },

  // Sheet
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: {
    backgroundColor: Colors.surfaceStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },
  sheetHeader: { gap: 2, marginBottom: 2 },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  sheetSubtitle: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },

  profileList: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 72,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  profileRowActive: { backgroundColor: "rgba(30, 108, 98, 0.05)" },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  profileAvatarTextActive: { color: "#fff" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  profileNameActive: { color: Colors.primary },
  profileMeta: { fontSize: 12, color: Colors.textMuted },
  activeCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCheckMark: { fontSize: 12, color: "#fff", fontWeight: "700" },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },

  addProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    backgroundColor: Colors.surface,
  },
  addProfileIcon: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: "300",
    lineHeight: 20,
  },
  addProfileText: { fontSize: 14, fontWeight: "600", color: Colors.primary },

  formGroup: { gap: 7 },
  formLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  formRow: { flexDirection: "row", gap: 12 },
  sheetInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  sheetSave: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  sheetSaveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
