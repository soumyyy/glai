import { requestStructuredTextJson } from './client';

export interface ReestimateResult {
  carbs_low_g: number;
  carbs_high_g: number;
  protein_g: number;
  fat_g: number;
  calories_kcal: number;
}

const SYSTEM_PROMPT = `You are a nutrition expert for a meal tracking app used by an Indian family managing Type 2 diabetes.
You will be given a food item name and its estimated weight in grams.
Return the nutritional values for that specific food at that weight using standard Indian home-cooking values where applicable.
Always return LOW and HIGH carb estimates — widen the range if the dish has variable recipes.
Return valid JSON only.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['carbs_low_g', 'carbs_high_g', 'protein_g', 'fat_g', 'calories_kcal'],
  properties: {
    carbs_low_g:    { type: 'number' },
    carbs_high_g:   { type: 'number' },
    protein_g:      { type: 'number' },
    fat_g:          { type: 'number' },
    calories_kcal:  { type: 'number' },
  },
} as const;

function validate(value: unknown): ReestimateResult {
  const v = value as ReestimateResult;
  if (
    typeof v?.carbs_low_g !== 'number' ||
    typeof v?.carbs_high_g !== 'number' ||
    typeof v?.protein_g !== 'number' ||
    typeof v?.fat_g !== 'number' ||
    typeof v?.calories_kcal !== 'number'
  ) {
    throw new Error('reestimate: missing required nutrition fields');
  }
  return v;
}

export async function reestimateItem(
  name: string,
  estimatedWeightG: number,
): Promise<ReestimateResult> {
  return requestStructuredTextJson({
    schemaName: 'item_nutrition_reestimate',
    schema: SCHEMA,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Food item: "${name}"\nEstimated weight: ${estimatedWeightG}g\n\nReturn carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal for this item at this weight.`,
    validate,
  });
}
