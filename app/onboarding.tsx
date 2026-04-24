import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { getAllProfiles, createProfile, type UserRow } from '../lib/db/users';
import { setSetting } from '../lib/db/settings';
import { useProfileStore } from '../lib/store/profileStore';
import { restoreAllProfiles } from '../lib/supabase/sync';

type Mode = 'list' | 'create';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setActiveUser, reloadProfiles } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserRow[]>([]);
  const [mode, setMode] = useState<Mode>('list');

  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await restoreAllProfiles();
      } catch {
        // offline — fall through to local profiles
      } finally {
        setProfiles(getAllProfiles());
        setLoading(false);
      }
    })();
  }, []);

  function selectProfile(profile: UserRow) {
    setActiveUser(profile.id);
    setSetting('onboarded', 'true');
    router.replace('/(tabs)');
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const age = newAge ? parseInt(newAge, 10) : null;
      const weight = newWeight ? parseFloat(newWeight) : null;
      const profile = createProfile(name, age, weight, 16);
      reloadProfiles();
      setActiveUser(profile.id);
      setSetting('onboarded', 'true');
      router.replace('/(tabs)');
    } catch (err) {
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
      <View style={[s.topPad, { height: insets.top + 24 }]} />

      <View style={s.hero}>
        <Text style={s.appName}>glai</Text>
        <Text style={s.tagline}>Who&apos;s tracking today?</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={s.loadingText}>Fetching profiles…</Text>
        </View>
      ) : mode === 'list' ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {profiles.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Select a profile</Text>
              {profiles.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={s.profileCard}
                  onPress={() => selectProfile(p)}
                  activeOpacity={0.75}
                >
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.profileInfo}>
                    <Text style={s.profileName}>{p.name}</Text>
                    {(p.age || p.weight_kg) ? (
                      <Text style={s.profileMeta}>
                        {[p.age ? `${p.age} yrs` : null, p.weight_kg ? `${p.weight_kg} kg` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))}
              <View style={s.divider} />
            </>
          )}

          <TouchableOpacity
            style={s.addCard}
            onPress={() => setMode('create')}
            activeOpacity={0.75}
          >
            <Text style={s.addIcon}>+</Text>
            <Text style={s.addText}>
              {profiles.length === 0 ? 'Create your profile' : 'Add new profile'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={s.backRow} onPress={() => setMode('list')}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={s.sectionLabel}>New profile</Text>

          <View style={s.field}>
            <Text style={s.label}>Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={s.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Nani"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              returnKeyType="next"
            />
          </View>

          <View style={s.row}>
            <View style={[s.field, s.rowField]}>
              <Text style={s.label}>Age</Text>
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
            <View style={[s.field, s.rowField]}>
              <Text style={s.label}>Weight (kg)</Text>
              <TextInput
                style={s.input}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="65"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.cta, !canCreate && s.ctaDim]}
            onPress={handleCreate}
            disabled={!canCreate || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.ctaText}>Continue</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  topPad: {},
  hero: { paddingHorizontal: 28, paddingBottom: 32 },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textMuted },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 10 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  profileMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted, marginRight: 2 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 14,
  },
  addIcon: { fontSize: 22, color: Colors.primary, fontWeight: '600', width: 40, textAlign: 'center' },
  addText: { fontSize: 15, fontWeight: '600', color: Colors.primary },

  backRow: { marginBottom: 8 },
  backText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },

  field: { gap: 7, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
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
    fontWeight: '500',
  },

  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDim: { opacity: 0.38 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
