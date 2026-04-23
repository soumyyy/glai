import { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { Colors } from '../../constants/colors';
import { LOCAL_USER } from '../../constants/user';
import { getOpenAIConfig, hasSupabaseConfig } from '../../lib/config';
import { exportMealsCSV } from '../../lib/export';
import { getDb } from '../../lib/db/schema';
import { syncAndRestoreCloudMeals } from '../../lib/supabase/sync';

function isOpenAIConfigured() {
  try { getOpenAIConfig(); return true; } catch { return false; }
}

function clearAllData() {
  const db = getDb();
  db.execSync('DELETE FROM meal_items; DELETE FROM meals; DELETE FROM daily_summaries;');
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const openAIConfigured = isOpenAIConfigured();
  const supabaseConfigured = hasSupabaseConfig();
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportMealsCSV();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed.';
      Alert.alert('Export failed', msg);
    } finally {
      setExporting(false);
    }
  }

  function handleClearAll() {
    Alert.alert(
      'Clear all data?',
      'This permanently deletes every meal, item, and daily summary from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your logged meals will be gone. Your Supabase cloud data is not affected.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, clear everything',
                  style: 'destructive',
                  onPress: clearAllData,
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    try {
      await syncAndRestoreCloudMeals();
      Alert.alert('Cloud restore complete', 'Meals saved in Supabase are now available on this device.');
    } catch (error) {
      Alert.alert(
        'Cloud restore failed',
        'Could not restore from cloud right now. Check your connection and try again.',
      );
      console.warn('[Restore] manual restore failed', error);
    } finally {
      setRestoring(false);
    }
  }

  const initial = LOCAL_USER.name.slice(0, 1).toUpperCase();

  return (
    <View style={styles.screen}>
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.overline}>PROFILE</Text>
          <Text style={styles.title}>Your health record</Text>
        </View>

        {/* Identity card */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.identityName}>{LOCAL_USER.name}</Text>
            <Text style={styles.identityMeta}>Local profile · single-user v1</Text>
            <View style={styles.identityStats}>
              <View style={styles.identityStat}>
                <Text style={styles.identityStatValue}>{LOCAL_USER.age}</Text>
                <Text style={styles.identityStatLabel}>Age</Text>
              </View>
              <View style={styles.identityStatDivider} />
              <View style={styles.identityStat}>
                <Text style={styles.identityStatValue}>{LOCAL_USER.weight_kg}kg</Text>
                <Text style={styles.identityStatLabel}>Weight</Text>
              </View>
              <View style={styles.identityStatDivider} />
              <View style={styles.identityStat}>
                <Text style={styles.identityStatValue}>Metric</Text>
                <Text style={styles.identityStatLabel}>Units</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Backend status */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Connections</Text>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, openAIConfigured ? styles.dotGreen : styles.dotAmber]} />
            <View style={styles.statusText}>
              <Text style={styles.statusName}>OpenAI meal analysis</Text>
              <Text style={styles.statusDetail}>{openAIConfigured ? 'Connected · GPT-4o Vision' : 'Missing API key'}</Text>
            </View>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, supabaseConfigured ? styles.dotGreen : styles.dotGrey]} />
            <View style={styles.statusText}>
              <Text style={styles.statusName}>Supabase cloud sync</Text>
              <Text style={styles.statusDetail}>{supabaseConfigured ? 'Connected · syncing in background' : 'Local-only mode'}</Text>
            </View>
          </View>
        </View>

        {/* Export */}
        <TouchableOpacity
          style={styles.exportCard}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.78}
        >
          <View style={styles.exportLeft}>
            <View style={styles.exportIcon}>
              <View style={styles.exportIconArrow} />
            </View>
            <View>
              <Text style={styles.exportTitle}>Export to CSV</Text>
              <Text style={styles.exportSubtitle}>All meals · all macros · carb ranges</Text>
            </View>
          </View>
          {exporting ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={styles.exportChevron}>
              <View style={styles.exportChevronLine1} />
              <View style={styles.exportChevronLine2} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportCard}
          onPress={handleRestore}
          disabled={restoring || !supabaseConfigured}
          activeOpacity={0.78}
        >
          <View style={styles.exportLeft}>
            <View style={styles.exportIcon}>
              <View style={styles.exportIconArrow} />
            </View>
            <View>
              <Text style={styles.exportTitle}>Restore from cloud</Text>
              <Text style={styles.exportSubtitle}>
                Pull meals from Supabase after reinstall
              </Text>
            </View>
          </View>
          {restoring ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={styles.exportChevron}>
              <View style={styles.exportChevronLine1} />
              <View style={styles.exportChevronLine2} />
            </View>
          )}
        </TouchableOpacity>

        {/* Danger zone */}
        <View style={styles.dangerPanel}>
          <Text style={styles.dangerTitle}>Danger zone</Text>
          <Text style={styles.dangerCopy}>
            Clears all local meal data from this device. Your cloud data in Supabase is not affected.
          </Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearAll} activeOpacity={0.78}>
            <Text style={styles.dangerButtonText}>Clear all local data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    gap: 18,
  },
  header: {
    gap: 6,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 1.8,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1.4,
  },

  // Identity card
  identityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  identityBody: {
    gap: 10,
  },
  identityName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  identityMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  identityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  identityStat: {
    flex: 1,
    gap: 2,
  },
  identityStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  identityStatValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  identityStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Connections panel
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  dotGreen: { backgroundColor: Colors.success },
  dotAmber: { backgroundColor: Colors.warning },
  dotGrey: { backgroundColor: Colors.textMuted },
  statusText: { flex: 1, gap: 2 },
  statusName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  statusDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // Export card
  exportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  exportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  exportIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primary + '14',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportIconArrow: {
    width: 16,
    height: 16,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    marginLeft: -4,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  exportSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  exportChevron: {
    width: 10,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportChevronLine1: {
    position: 'absolute',
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textMuted,
    transform: [{ rotate: '45deg' }, { translateY: -3 }],
  },
  exportChevronLine2: {
    position: 'absolute',
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textMuted,
    transform: [{ rotate: '-45deg' }, { translateY: 3 }],
  },

  // Danger zone
  dangerPanel: {
    backgroundColor: Colors.error + '08',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.error + '25',
    padding: 20,
    gap: 12,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: -0.2,
  },
  dangerCopy: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.error + '50',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.error + '0C',
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
  },
});
