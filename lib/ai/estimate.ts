import { requestStructuredVisionJson } from './client';
import type { EstimateResponse, IdentifiedItem, NutritionItem } from './types';
import { validateEstimateResponse } from './validation';

const SYSTEM_PROMPT = `You are a nutrition expert for a meal tracking app used by an Indian family managing Type 2 diabetes. Carbohydrate accuracy is the single most important factor — it directly affects diabetes management.

USER CONTEXT:
- Meals are primarily Indian home-cooked food eaten in India
- Common dishes: dal, roti, rice, sabzi, idli, dosa, sambar, paratha, khichdi, biryani, rajma, chole, poha, upma, curd, and similar
- Assume standard Indian home-cooking portion sizes unless the image clearly shows otherwise
- Account for common Indian cooking methods: tempering in oil/ghee, pressure-cooked dal, shallow-fried items

NUTRITIONAL REFERENCE (use these anchors for common Indian foods, scale by visible portion):
- Roti / chapati (one medium ~30g): 15g carbs, 3g protein, 1g fat, 80 kcal
- Paratha (one medium ~60g, with ghee): 30g carbs, 5g protein, 8g fat, 210 kcal
- Steamed white rice (one katori ~150g cooked): 40g carbs, 3g protein, 0.5g fat, 175 kcal
- Dal (one katori ~150g, cooked): 15g carbs, 9g protein, 3g fat, 120 kcal
- Sabzi / dry vegetable dish (one katori ~100g): 10g carbs, 3g protein, 5g fat, 95 kcal
- Idli (one piece ~40g): 10g carbs, 2g protein, 0.5g fat, 50 kcal
- Dosa (one medium plain ~60g): 20g carbs, 3g protein, 2g fat, 110 kcal
- Sambar (one katori ~150g): 10g carbs, 4g protein, 2g fat, 75 kcal
- Curd / dahi (one katori ~100g): 5g carbs, 4g protein, 3g fat, 60 kcal
- Poha (one plate ~200g cooked): 45g carbs, 5g protein, 6g fat, 250 kcal
- Upma (one plate ~200g cooked): 35g carbs, 6g protein, 8g fat, 235 kcal
- Khichdi (one plate ~200g cooked): 38g carbs, 8g protein, 4g fat, 220 kcal
- Rajma (one katori ~150g): 22g carbs, 10g protein, 2g fat, 145 kcal
- Chana / chole (one katori ~150g): 25g carbs, 10g protein, 3g fat, 165 kcal
- Paneer (100g): 3g carbs, 18g protein, 20g fat, 265 kcal
- Ghee (1 tsp ~5g): 0g carbs, 0g protein, 5g fat, 45 kcal
For foods not in this list, use standard nutritional values from your training data.

RULES:
- Work only from food visibly present in the photo and the identified item list. Do not add invisible accompaniments.
- Always return LOW and HIGH carb estimates (not a single number). Widen the range for ambiguous or mixed dishes.
- If cooking fat (ghee, oil, butter) is visible or clearly implied by the cooking method, include it as a separate line item named "cooking fat (estimated)".
- Protein, fat, and calories should be reasonable midpoint estimates for the shown portion.
- If an item is only partly visible, estimate it but reduce overall_confidence and note uncertainty in ai_notes.
- Do NOT suggest insulin doses, blood sugar impacts, or any medical advice.

CONFIDENCE GUIDE:
- 90–100: Clear photo, well-known dish, standard serving
- 70–89: Clear photo but dish has variable recipes (biryani, mixed curry)
- 50–69: Poor lighting, unusual dish, or hard to judge portion
- Below 50: Low confidence — explain in ai_notes

Return valid JSON only.`;

const RECOVERY_SYSTEM_PROMPT = `You are doing a second-pass recovery estimate for a meal photo for an Indian family managing Type 2 diabetes. The first nutrition estimate was unusable.
Use only food that is visibly present in the photo, with the identified item list as guidance.
Prefer conservative best-effort estimates over returning no items. Use the nutritional reference values for common Indian dishes when applicable.
If cooking fat (ghee, oil, butter) is visible or clearly implied, include it as a separate "cooking fat (estimated)" item.
If a dish is hard to identify precisely, keep the visible name broad and explain uncertainty in ai_notes.
Do not invent invisible accompaniments, drinks, chutneys, or side dishes.
Always return LOW and HIGH carb estimates, not a single number.
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
