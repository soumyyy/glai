import { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
import { identifyFoods } from '../lib/ai/identify';
import { estimateNutrition } from '../lib/ai/estimate';
import { Colors } from '../constants/colors';
import type { PortionSize } from '../lib/store/mealStore';
import type { NutritionItem } from '../lib/ai/types';

type AnalysingStep = 'identifying' | 'estimating' | null;

const PORTIONS: { label: string; sub: string; size: PortionSize; multiplier: number }[] = [
  { label: '¼', sub: 'Quarter', size: 'quarter', multiplier: 0.25 },
  { label: '½', sub: 'Half', size: 'half', multiplier: 0.5 },
  { label: '¾', sub: '¾ plate', size: 'three-quarters', multiplier: 0.75 },
  { label: '1', sub: 'Full', size: 'full', multiplier: 1.0 },
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
  const { height: screenHeight } = useWindowDimensions();
  const { draft, setPortion, setAIResults, mergeItems } = useMealStore();
  const [portionSize, setPortionSize] = useState<PortionSize>('full');
  const [analysingStep, setAnalysingStep] = useState<AnalysingStep>(null);

  const activeBase64 = isAddMore ? draft.additionalImageBase64 : draft.imageBase64;
  const imageUri = activeBase64 ? `data:image/jpeg;base64,${activeBase64}` : null;
  const photoHeight = screenHeight * 0.48;

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
      if (!identified.items.length) throw new Error('No food detected. Try retaking the photo.');
      setAnalysingStep('estimating');
      const result = await estimateNutrition(activeBase64, identified.items);
      const multiplier = draft.portionMultiplier || 1.0;
      const adjusted = applyMultiplier(result.items, multiplier);
      if (isAddMore) {
        mergeItems(adjusted);
        router.dismiss(2);
      } else {
        setAIResults(adjusted, result.overall_confidence, result.image_quality);
        router.push('/review');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Analysis failed', msg, [
        { text: 'Retake', onPress: () => router.back() },
        { text: 'Retry', onPress: handleAnalyse },
      ]);
    } finally {
      setAnalysingStep(null);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Photo — fills top portion of screen */}
      <View style={[styles.photoWrap, { height: photoHeight }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>No photo</Text>
          </View>
        )}
        {/* Retake button overlaid on photo */}
        <TouchableOpacity
          style={[styles.retakeBtn, { top: insets.top + 14 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retakeBtnText}>{isAddMore ? 'Back' : 'Retake'}</Text>
        </TouchableOpacity>
        {/* Title overlaid at bottom of photo */}
        <View style={styles.photoLabel}>
          <Text style={styles.photoLabelText}>
            {isAddMore ? 'Another dish' : 'How much did you eat?'}
          </Text>
        </View>
      </View>

      {/* Portion selector */}
      <View style={styles.body}>
        <Text style={styles.selectorHint}>Select your portion</Text>
        <View style={styles.portionRow}>
          {PORTIONS.map((opt) => {
            const active = portionSize === opt.size;
            return (
              <TouchableOpacity
                key={opt.size}
                style={[styles.portionBtn, active && styles.portionBtnActive]}
                onPress={() => handlePortionSelect(opt.size, opt.multiplier)}
                activeOpacity={0.75}
              >
                <Text style={[styles.portionFraction, active && styles.portionFractionActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.portionSub, active && styles.portionSubActive]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <TouchableOpacity
          style={[styles.analyseBtn, analysingStep !== null && styles.analyseBtnDim]}
          onPress={handleAnalyse}
          disabled={analysingStep !== null}
          activeOpacity={0.85}
        >
          <Text style={styles.analyseBtnText}>Analyse meal</Text>
        </TouchableOpacity>
      </View>

      {/* Loading overlay */}
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

  // Photo
  photoWrap: {
    width: '100%',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceStrong,
  },
  photoPlaceholderText: { color: Colors.textMuted, fontSize: 14 },
  retakeBtn: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  retakeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  photoLabelText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Portion
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 14,
  },
  selectorHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  portionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 3,
  },
  portionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  portionFraction: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: -0.5,
  },
  portionFractionActive: { color: Colors.primary },
  portionSub: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  portionSubActive: { color: Colors.primary },

  // Footer
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  analyseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyseBtnDim: { opacity: 0.55 },
  analyseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  loadingStep: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
