import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { getAllProfiles, createProfile, type UserRow } from '../lib/db/users';
import { setSetting } from '../lib/db/settings';
import { useAuthStore } from '../lib/store/authStore';
import { useProfileStore } from '../lib/store/profileStore';
import { restoreAllProfiles } from '../lib/supabase/sync';

type Mode = 'list' | 'create';

const AVATAR_COLORS = [
  Colors.primary,
  Colors.carbs,
  Colors.protein,
  '#7A6550',
  '#4A6E65',
];

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, isMigrating, session } = useAuthStore();
  const { setActiveUser, reloadProfiles } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserRow[]>([]);
  const [mode, setMode] = useState<Mode>('list');

  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newICR, setNewICR] = useState('');
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        await restoreAllProfiles();
      } catch {
        // offline — use local profiles
      } finally {
        setProfiles(getAllProfiles());
        setLoading(false);
      }
    })();
  }, [session]);

  if (!isReady || isMigrating) return null;
  if (!session) return <Redirect href="/sign-in" />;

  function selectProfile(profile: UserRow) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveUser(profile.id);
    setSetting('onboarded', 'true');
    router.replace('/(tabs)');
  }

  function enterCreate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMode('create');
    setTimeout(() => nameRef.current?.focus(), 80);
  }

  function exitCreate() {
    Haptics.selectionAsync().catch(() => {});
    setMode('list');
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSaving(true);
    try {
      const age = newAge ? parseInt(newAge, 10) : null;
      const weight = newWeight ? parseFloat(newWeight) : null;
      const icr = newICR ? parseFloat(newICR) : 16;
      const profile = createProfile(name, age, weight, icr);
      reloadProfiles();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setActiveUser(profile.id);
      setSetting('onboarded', 'true');
      router.replace('/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create profile.');
      setSaving(false);
    }
  }

  const canCreate = newName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Blobs */}
      <View style={s.blobTop} />
      <View style={s.blobBottom} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(500).springify()}
        style={[s.header, { paddingTop: insets.top + 32 }]}
      >
        <Text style={s.appName}>glai</Text>
        <Text style={s.tagline}>
          {mode === 'create' ? 'New profile' : 'Who\'s logging today?'}
        </Text>
        {mode === 'list' && profiles.length > 0 && (
          <Animated.Text entering={FadeIn.delay(200).duration(400)} style={s.taglineSub}>
            Select a profile or add someone new.
          </Animated.Text>
        )}
      </Animated.View>

      {loading ? (
        <Animated.View entering={FadeIn.duration(400)} style={s.loadingBlock}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadingText}>Fetching profiles…</Text>
        </Animated.View>
      ) : mode === 'list' ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {profiles.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(120 + i * 70).duration(500).springify()}
              layout={LinearTransition}
            >
              <TouchableOpacity
                style={s.profileCard}
                onPress={() => selectProfile(p)}
                activeOpacity={0.72}
              >
                <View style={[s.avatar, { backgroundColor: avatarColor(p.name) + '22' }]}>
                  <Text style={[s.avatarLetter, { color: avatarColor(p.name) }]}>
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.profileMeta}>
                  <Text style={s.profileName}>{p.name}</Text>
                  {(p.age || p.weight_kg || p.insulin_to_carb_ratio) ? (
                    <Text style={s.profileDetail}>
                      {[
                        p.age ? `${p.age} yrs` : null,
                        p.weight_kg ? `${p.weight_kg} kg` : null,
                        p.insulin_to_carb_ratio ? `1:${p.insulin_to_carb_ratio} ICR` : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <View style={s.chevronWrap}>
                  <Text style={s.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          <Animated.View
            entering={FadeInDown.delay(120 + profiles.length * 70).duration(500).springify()}
          >
            <TouchableOpacity
              style={s.addCard}
              onPress={enterCreate}
              activeOpacity={0.75}
            >
              <View style={s.addIconWrap}>
                <Text style={s.addPlus}>+</Text>
              </View>
              <Text style={s.addLabel}>
                {profiles.length === 0 ? 'Create your first profile' : 'Add another person'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      ) : (
        <Animated.ScrollView
          entering={FadeInUp.duration(380).springify()}
          exiting={FadeOut.duration(200)}
          style={s.scroll}
          contentContainerStyle={[s.formContent, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={s.backRow} onPress={exitCreate} activeOpacity={0.7}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={s.formCard}>
            {/* Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Name <Text style={s.req}>*</Text></Text>
              <TextInput
                ref={nameRef}
                style={s.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Nani"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
            </View>

            <View style={s.fieldDivider} />

            {/* Age + Weight */}
            <View style={s.twoCol}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>Age</Text>
                <TextInput
                  style={s.input}
                  value={newAge}
                  onChangeText={setNewAge}
                  placeholder="60"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={s.input}
                  value={newWeight}
                  onChangeText={setNewWeight}
                  placeholder="65"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={s.fieldDivider} />

            {/* ICR */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Insulin-to-carb ratio</Text>
              <View style={s.icrRow}>
                <Text style={s.icrPrefix}>1 unit per</Text>
                <TextInput
                  style={[s.input, s.icrInput]}
                  value={newICR}
                  onChangeText={setNewICR}
                  placeholder="16"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
                <Text style={s.icrSuffix}>g carbs</Text>
              </View>
              <Text style={s.icrHint}>Used to suggest Fiasp doses. Leave blank to skip.</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.ctaBtn, !canCreate && s.ctaBtnDim]}
            onPress={handleCreate}
            disabled={!canCreate || saving}
            activeOpacity={0.84}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.ctaBtnText}>Create profile</Text>
            )}
          </TouchableOpacity>
        </Animated.ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },

  blobTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.glowMint,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.glowPeach,
  },

  header: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 4,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.9,
    lineHeight: 35,
  },
  taglineSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 14, color: Colors.textMuted },

  scroll: { flex: 1 },

  // List mode
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileMeta: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  profileDetail: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 18, color: Colors.textMuted, lineHeight: 22 },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  addIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 24, color: Colors.primary, fontWeight: '600', lineHeight: 28 },
  addLabel: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  // Create mode
  formContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  backRow: { paddingVertical: 4 },
  backText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  formCard: {
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    fontWeight: '500',
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: -4,
  },
  twoCol: { flexDirection: 'row', gap: 12 },

  icrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icrPrefix: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  icrInput: { flex: 1 },
  icrSuffix: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  icrHint: { fontSize: 12, color: Colors.textMuted, lineHeight: 17, marginTop: 2 },

  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaBtnDim: { opacity: 0.38, shadowOpacity: 0 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
});
