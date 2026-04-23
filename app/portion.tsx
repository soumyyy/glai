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

      {/* Safe area spacer so photo starts below status bar */}
      <View style={{ height: insets.top }} />

      {/* Photo */}
      <View style={[styles.photoWrap, { height: photoHeight }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>No photo</Text>
          </View>
        )}
      </View>

      {/* Portion selector */}
      <View style={styles.body}>
        {/* Retake + hint in one row */}
        <View style={styles.bodyTopRow}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => router.back()}>
            <Text style={styles.retakeBtnText}>{isAddMore ? '← Back' : '← Retake'}</Text>
          </TouchableOpacity>
          <Text style={styles.selectorHint}>Select portion</Text>
        </View>
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
          style={[styles.analyseBtn, analysingStep !== null && styles.analyseBtnLoading]}
          onPress={handleAnalyse}
          disabled={analysingStep !== null}
          activeOpacity={0.85}
        >
          {analysingStep !== null ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
              <Text style={styles.analyseBtnText}>
                {analysingStep === 'identifying' ? 'Identifying food…' : 'Estimating nutrition…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.analyseBtnText}>Analyse meal</Text>
          )}
        </TouchableOpacity>
      </View>
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
  // Portion
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 14,
  },
  bodyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retakeBtn: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  retakeBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
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
  analyseBtnLoading: {
    backgroundColor: Colors.primary,
    opacity: 0.82,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

});
