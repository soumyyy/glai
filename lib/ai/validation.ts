import type { EstimateResponse, IdentifiedItem, IdentifyResponse, NutritionItem } from './types';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`OpenAI response is missing a valid ${field}.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`OpenAI response returned an empty ${field}.`);
  }

  return trimmed;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`OpenAI response is missing a valid ${field}.`);
  }

  return value;
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeNutritionItem(value: unknown): NutritionItem {
  if (!isObject(value)) {
    throw new Error('OpenAI response returned an invalid nutrition item.');
  }

  const carbsLow = readNumber(value.carbs_low_g, 'carbs_low_g');
  const carbsHigh = readNumber(value.carbs_high_g, 'carbs_high_g');

  return {
    name: readString(value.name, 'name'),
    ai_identified_name: readString(value.ai_identified_name ?? value.name, 'ai_identified_name'),
    estimated_weight_g: Math.max(0, Math.round(readNumber(value.estimated_weight_g, 'estimated_weight_g'))),
    carbs_low_g: Math.max(0, Math.min(carbsLow, carbsHigh)),
    carbs_high_g: Math.max(0, Math.max(carbsLow, carbsHigh)),
    protein_g: Math.max(0, readNumber(value.protein_g, 'protein_g')),
    fat_g: Math.max(0, readNumber(value.fat_g, 'fat_g')),
    calories_kcal: Math.max(0, readNumber(value.calories_kcal, 'calories_kcal')),
    ai_notes: typeof value.ai_notes === 'string' ? value.ai_notes.trim() : '',
  };
}

export function validateIdentifyResponse(value: unknown): IdentifyResponse {
  if (!isObject(value) || !Array.isArray(value.items)) {
    throw new Error('OpenAI response did not include an items array.');
  }

  const items: IdentifiedItem[] = value.items.map((item) => {
    if (!isObject(item)) {
      throw new Error('OpenAI response returned an invalid identified item.');
    }

    return {
      name: readString(item.name, 'name'),
      confidence: clampPercentage(readNumber(item.confidence, 'confidence')),
    };
  });

  return { items };
}

export function validateEstimateResponse(value: unknown): EstimateResponse {
  if (!isObject(value) || !Array.isArray(value.items)) {
    throw new Error('OpenAI response did not include an items array.');
  }

  const imageQuality = value.image_quality;
  if (
    imageQuality !== 'good' &&
    imageQuality !== 'acceptable' &&
    imageQuality !== 'poor'
  ) {
    throw new Error('OpenAI response returned an invalid image_quality.');
  }

  return {
    items: value.items.map(normalizeNutritionItem),
    overall_confidence: clampPercentage(
      readNumber(value.overall_confidence, 'overall_confidence'),
    ),
    image_quality: imageQuality,
  };
}
