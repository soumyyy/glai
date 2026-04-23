import { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
import { Atmosphere } from '../components/Atmosphere';
import { identifyFoods } from '../lib/ai/identify';
import { estimateNutrition } from '../lib/ai/estimate';
import { Colors } from '../constants/colors';
import type { PortionSize } from '../lib/store/mealStore';
import type { NutritionItem } from '../lib/ai/types';

type AnalysingStep = 'identifying' | 'estimating' | null;

const PORTION_OPTIONS: { label: string; sublabel: string; size: PortionSize; multiplier: number }[] = [
  { label: '¼', sublabel: 'Quarter', size: 'quarter', multiplier: 0.25 },
  { label: '½', sublabel: 'Half', size: 'half', multiplier: 0.5 },
  { label: '¾', sublabel: 'Three-quarters', size: 'three-quarters', multiplier: 0.75 },
  { label: '1', sublabel: 'Full plate', size: 'full', multiplier: 1.0 },
];

function applyMultiplier(items: NutritionItem[], multiplier: number): NutritionItem[] {
  return items.map((item) => ({
    ...item,
    estimated_weight_g: Math.round(item.estimated_weight_g * multiplier),
    carbs_low_g: Math.round(item.carbs_low_g * multiplier * 10) / 10,
    carbs_high_g: Math.round(item.carbs_high_g * multiplier * 10) / 10,
    protein_g: Math.round(item.protein_g * multiplier * 10) / 10,
    fat_g: Math.round(item.fat_g * multiplier * 10) / 10,
    calories_kcal: Math.round(item.calories_kcal * multiplier),
  }));
}


export default function PortionScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAddMore = mode === 'addmore';
  const insets = useSafeAreaInsets();
  const { draft, setPortion, setAIResults, mergeItems } = useMealStore();
  const [portionSize, setPortionSize] = useState<PortionSize>('full');
  const [analysingStep, setAnalysingStep] = useState<AnalysingStep>(null);

  const activeBase64 = isAddMore ? draft.additionalImageBase64 : draft.imageBase64;
  const imageUri = activeBase64 ? `data:image/jpeg;base64,${activeBase64}` : null;

  function handlePortionSelect(size: PortionSize, multiplier: number) {
    setPortionSize(size);
    setPortion(size, multiplier);
  }

  async function handleAnalyse() {
    if (!activeBase64) {
      Alert.alert('No image', 'Go back and take a photo first.');
      return;
    }
    try {
      setAnalysingStep('identifying');
      const identified = await identifyFoods(activeBase64);
      if (!identified.items.length) {
        throw new Error('No food items detected. Try retaking the photo.');
      }
      setAnalysingStep('estimating');
      const result = await estimateNutrition(activeBase64, identified.items);
      const multiplier = draft.portionMultiplier || 1.0;
      const adjustedItems = applyMultiplier(result.items, multiplier);
      if (isAddMore) {
        mergeItems(adjustedItems);
        router.dismiss(2);
      } else {
        setAIResults(adjustedItems, result.overall_confidence, result.image_quality);
        router.push('/review');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(
        'Analysis failed',
        message,
        [
          { text: 'Retake', onPress: () => router.back() },
          { text: 'Retry', onPress: handleAnalyse },
        ],
      );
    } finally {
      setAnalysingStep(null);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <Atmosphere />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Retake</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isAddMore ? 'Add another dish' : 'How much did you eat?'}
          </Text>
        </View>

        {/* Photo preview */}
        <View style={styles.photoCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>No photo captured</Text>
            </View>
          )}
        </View>

        {/* Portion selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Portion size</Text>
          <View style={styles.selectorRow}>
            {PORTION_OPTIONS.map((opt) => {
              const active = portionSize === opt.size;
              return (
                <TouchableOpacity
                  key={opt.size}
                  style={[styles.portionOption, active && styles.portionOptionActive]}
                  onPress={() => handlePortionSelect(opt.size, opt.multiplier)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.portionFraction, active && styles.portionFractionActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.portionSublabel, active && styles.portionSublabelActive]}>
                    {opt.sublabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        <TouchableOpacity
          style={[styles.analyseButton, analysingStep !== null && styles.analyseDisabled]}
          onPress={handleAnalyse}
          disabled={analysingStep !== null}
          activeOpacity={0.85}
        >
          <Text style={styles.analyseText}>Analyse meal</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen loading overlay */}
      {analysingStep !== null ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingTitle}>
            {analysingStep === 'identifying' ? 'Identifying food…' : 'Estimating nutrition…'}
          </Text>
          <Text style={styles.loadingStep}>
            {analysingStep === 'identifying' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </Text>
        </View>
      ) : null}
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
    gap: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    lineHeight: 33,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  photoCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  photo: {
    width: '100%',
    height: 240,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceStrong,
  },
  photoPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  selectorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  portionOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceStrong,
    gap: 4,
  },
  portionOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  portionFraction: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: -0.5,
  },
  portionFractionActive: {
    color: Colors.primary,
  },
  portionSublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  portionSublabelActive: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  analyseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
  },
  analyseDisabled: {
    opacity: 0.6,
  },
  analyseText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  loadingStep: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
