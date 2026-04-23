import { requestStructuredVisionJson } from './client';
import type { EstimateResponse, IdentifiedItem, NutritionItem } from './types';
import { validateEstimateResponse } from './validation';

const SYSTEM_PROMPT = `You are a nutrition expert specialising in Indian home-cooked cuisine.
Work only from the food that is visibly present in the photo and the identified item list. Do not add invisible accompaniments or assumed ingredients.
Estimate edible plated portion sizes in grams for the full plate shown in the image.
Always return LOW and HIGH carb estimates instead of a single number.
Use realistic Indian home-cooking assumptions for portion size and preparation, but stay conservative when the image is ambiguous.
For mixed dishes such as biryani, khichdi, poha, upma, pulao, or curries with unclear composition, widen the carb range and mention uncertainty in ai_notes.
If an item is only partly visible, still estimate it if clearly present, but reduce confidence through overall_confidence and note uncertainty.
Protein, fat, and calories should be reasonable midpoint estimates for the shown portion.
Return valid JSON only.`;

const RECOVERY_SYSTEM_PROMPT = `You are doing a second-pass recovery estimate for a meal photo because the first nutrition estimate was unusable.
Use only food that is visibly present in the photo, with the identified item list as guidance.
Prefer conservative best-effort estimates over returning no items.
If a dish is hard to identify precisely, keep the visible name broad and explain uncertainty in ai_notes.
Do not invent invisible accompaniments, drinks, chutneys, or side dishes.
Keep overall_confidence appropriately low when the photo is ambiguous.
Return valid JSON only.`;

const ESTIMATE_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'overall_confidence', 'image_quality'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'ai_identified_name',
          'estimated_weight_g',
          'carbs_low_g',
          'carbs_high_g',
          'protein_g',
          'fat_g',
          'calories_kcal',
          'ai_notes',
        ],
        properties: {
          name: { type: 'string' },
          ai_identified_name: { type: 'string' },
          estimated_weight_g: { type: 'number' },
          carbs_low_g: { type: 'number' },
          carbs_high_g: { type: 'number' },
          protein_g: { type: 'number' },
          fat_g: { type: 'number' },
          calories_kcal: { type: 'number' },
          ai_notes: { type: 'string' },
        },
      },
    },
    overall_confidence: { type: 'number' },
    image_quality: {
      type: 'string',
      enum: ['good', 'acceptable', 'poor'],
    },
  },
} as const;

function hasMeaningfulEstimate(item: NutritionItem): boolean {
  return (
    item.estimated_weight_g > 0 ||
    item.carbs_high_g > 0 ||
    item.protein_g > 0 ||
    item.fat_g > 0 ||
    item.calories_kcal > 0
  );
}

function isUsableEstimate(response: EstimateResponse): boolean {
  return response.items.length > 0 && response.items.some(hasMeaningfulEstimate);
}

function shouldRetryWithRecovery(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return [
    'returned malformed json',
    'returned an empty response',
    'did not include an items array',
    'missing a valid',
    'response returned',
    'invalid image_quality',
  ].some((token) => message.includes(token));
}

async function runEstimateRequest(
  imageBase64: string,
  identifiedItems: IdentifiedItem[],
  systemPrompt: string,
  userPrompt: string,
): Promise<EstimateResponse> {
  const itemList = identifiedItems.map((item) => `- ${item.name}`).join('\n');

  return requestStructuredVisionJson({
    imageBase64,
    schemaName: 'meal_nutrition_estimate',
    schema: ESTIMATE_RESPONSE_SCHEMA,
    systemPrompt,
    userPrompt:
      `The following dishes are in this photo:\n${itemList}\n\n${userPrompt}`,
    validate: validateEstimateResponse,
  });
}

export async function estimateNutrition(
  imageBase64: string,
  identifiedItems: IdentifiedItem[],
): Promise<EstimateResponse> {
  try {
    const primary = await runEstimateRequest(
      imageBase64,
      identifiedItems,
      SYSTEM_PROMPT,
      'Estimate each visible item for the full plated portion only. Return JSON with items, overall_confidence (0-100), and image_quality. Use ai_notes for ambiguity or assumptions that materially affect carb estimates.',
    );

    if (isUsableEstimate(primary)) {
      return primary;
    }

    console.warn(
      '[OpenAI] estimateNutrition primary pass returned unusable data; running recovery pass',
    );
  } catch (error) {
    if (!shouldRetryWithRecovery(error)) {
      throw error;
    }

    console.warn(
      '[OpenAI] estimateNutrition primary pass failed validation; running recovery pass',
      error,
    );
  }

  const recovery = await runEstimateRequest(
    imageBase64,
    identifiedItems,
    RECOVERY_SYSTEM_PROMPT,
    'Estimate the visible food again using conservative best-effort numbers. Return JSON with items, overall_confidence (0-100), and image_quality. Use ai_notes to explain uncertainty when the photo is blurry, cropped, shadowed, or hard to read.',
  );

  console.log('[OpenAI] estimateNutrition recovery output', recovery);

  if (!isUsableEstimate(recovery)) {
    throw new Error('OpenAI returned nutrition estimates, but they were empty.');
  }

  return recovery;
}
