import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Atmosphere } from '../../components/Atmosphere';
import { Colors } from '../../constants/colors';
import { LOCAL_USER } from '../../constants/user';
import { getOpenAIConfig, hasSupabaseConfig } from '../../lib/config';

function isOpenAIConfigured() {
  try {
    getOpenAIConfig();
    return true;
  } catch {
    return false;
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const openAIConfigured = isOpenAIConfigured();
  const supabaseConfigured = hasSupabaseConfig();

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
        <View style={styles.header}>
          <Text style={styles.overline}>PROFILE</Text>
          <Text style={styles.title}>Single-user setup, ready to scale</Text>
          <Text style={styles.subtitle}>
            The product stays simple in v1, but the data model is already prepared for more.
          </Text>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{LOCAL_USER.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName}>{LOCAL_USER.name}</Text>
            <Text style={styles.identityMeta}>Local profile stored on-device</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Age</Text>
            <Text style={styles.metricValue}>{LOCAL_USER.age}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Weight</Text>
            <Text style={styles.metricValue}>{LOCAL_USER.weight_kg}kg</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Backend status</Text>
          <View style={styles.statusList}>
            <View style={styles.statusRow}>
              <Text style={styles.statusName}>OpenAI meal analysis</Text>
              <View style={[styles.statusBadge, openAIConfigured ? styles.good : styles.dim]}>
                <Text style={styles.statusBadgeText}>
                  {openAIConfigured ? 'Connected' : 'Missing key'}
                </Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusName}>Supabase cloud sync</Text>
              <View style={[styles.statusBadge, supabaseConfigured ? styles.good : styles.dim]}>
                <Text style={styles.statusBadgeText}>
                  {supabaseConfigured ? 'Connected' : 'Local only'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Current defaults</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Units</Text>
            <Text style={styles.detailValue}>Metric</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meal logging</Text>
            <Text style={styles.detailValue}>Photo required</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nutrition source</Text>
            <Text style={styles.detailValue}>OpenAI vision</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Next layers</Text>
          <Text style={styles.panelCopy}>
            Export, clearer data controls, and multi-user auth can sit on top of the current
            schema without reworking the meal model.
          </Text>
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
    gap: 8,
  },
  overline: {
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  identityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    color: Colors.surfaceStrong,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
    gap: 6,
  },
  identityName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  identityMeta: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 8,
  },
  metricLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -1,
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
  },
  panelCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  statusList: {
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  statusName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  good: {
    backgroundColor: Colors.success + '18',
  },
  dim: {
    backgroundColor: Colors.surfaceStrong,
  },
  statusBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
