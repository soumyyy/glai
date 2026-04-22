// app/portion.tsx
import { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMealStore } from '../lib/store/mealStore';
import { PortionPicker } from '../components/PortionPicker';
import { identifyFoods } from '../lib/ai/identify';
import { estimateNutrition } from '../lib/ai/estimate';
import { Colors } from '../constants/colors';
import type { PortionSize } from '../lib/store/mealStore';
import type { NutritionItem } from '../lib/ai/types';

const PORTION_MULTIPLIERS: Record<PortionSize, number> = {
  quarter: 0.25,
  half: 0.5,
  'three-quarters': 0.75,
  full: 1.0,
  custom: 1.0,
};

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

async function runAnalysisWithRetry(imageBase64: string) {
  async function attempt() {
    const identified = await identifyFoods(imageBase64);
    if (!identified.items.length) throw new Error('No food detected');
    const estimated = await estimateNutrition(imageBase64, identified.items);
    return estimated;
  }

  try {
    return await attempt();
  } catch (firstErr) {
    // Retry once automatically on any failure
    try {
      return await attempt();
    } catch {
      throw firstErr;
    }
  }
}

export default function PortionScreen() {
  const router = useRouter();
  const { draft, setPortion, setAIResults } = useMealStore();
  const [portionSize, setPortionSize] = useState<PortionSize>('full');
  const [analysing, setAnalysing] = useState(false);

  const imageUri = draft.imageBase64
    ? `data:image/jpeg;base64,${draft.imageBase64}`
    : null;

  function handlePortionSelect(size: PortionSize, multiplier: number) {
    setPortionSize(size);
    setPortion(size, multiplier);
  }

  async function handleAnalyse() {
    if (!draft.imageBase64) {
      Alert.alert('No image', 'Go back and take a photo first.');
      return;
    }
    setAnalysing(true);
    try {
      const result = await runAnalysisWithRetry(draft.imageBase64);
      const multiplier = PORTION_MULTIPLIERS[portionSize];
      const adjustedItems = applyMultiplier(result.items, multiplier);
      setAIResults(adjustedItems, result.overall_confidence, result.image_quality);
      router.push('/review');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(
        'Analysis failed',
        `Could not analyse the photo. ${message}\n\nPlease try again or retake the photo.`,
        [
          { text: 'Retake', onPress: () => router.back() },
          { text: 'Retry', onPress: handleAnalyse },
        ],
      );
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Photo thumbnail */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.heading}>How much did you eat?</Text>
          <Text style={styles.subheading}>Select how much of what&apos;s in the photo you ate</Text>

          <PortionPicker selected={portionSize} onSelect={handlePortionSelect} />
        </View>
      </ScrollView>

      {/* Analyse button — fixed at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.analyseButton, analysing && styles.analyseDisabled]}
          onPress={handleAnalyse}
          disabled={analysing}
          activeOpacity={0.85}
        >
          {analysing ? (
            <View style={styles.analysingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.analyseText}>Analysing…</Text>
            </View>
          ) : (
            <Text style={styles.analyseText}>Analyse</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  scroll: { paddingBottom: 24 },

  thumbnail: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.border,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: Colors.textSecondary },

  content: {
    padding: 24,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  footer: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  analyseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyseDisabled: { opacity: 0.6 },
  analyseText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  analysingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
