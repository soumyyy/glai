import { requestStructuredVisionJson } from './client';
import type { EstimateResponse, IdentifiedItem } from './types';
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

export async function estimateNutrition(
  imageBase64: string,
  identifiedItems: IdentifiedItem[],
): Promise<EstimateResponse> {
  const itemList = identifiedItems.map((i) => `- ${i.name}`).join('\n');

  return requestStructuredVisionJson({
    imageBase64,
    schemaName: 'meal_nutrition_estimate',
    schema: ESTIMATE_RESPONSE_SCHEMA,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt:
      `The following dishes are in this photo:\n${itemList}\n\n` +
      'Estimate each visible item for the full plated portion only. Return JSON with items, overall_confidence (0-100), and image_quality. Use ai_notes for ambiguity or assumptions that materially affect carb estimates.',
    validate: validateEstimateResponse,
  });
}
