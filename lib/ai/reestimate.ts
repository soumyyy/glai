import { requestStructuredTextJson } from './client';

export interface ReestimateResult {
  carbs_low_g: number;
  carbs_high_g: number;
  protein_g: number;
  fat_g: number;
  calories_kcal: number;
}

const SYSTEM_PROMPT = `You are a nutrition expert for a meal tracking app used by an Indian family managing Type 2 diabetes.
You will be given a food item name and optionally an estimated weight in grams.

IMPORTANT: If the food name itself contains a quantity or serving size (e.g. "1 cup dal", "100g rice", "2 tbsp ghee", "1 medium bowl khichdi", "half plate sabzi"), always derive the serving size from the name — ignore the estimated weight.
If the name has no quantity, use the estimated weight to calculate nutrition.

Use standard Indian home-cooking values where applicable.
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

// Detects quantity patterns like "1 cup", "100g", "2 tbsp", "half plate", etc.
const QTY_RE = /\b(\d+(\.\d+)?|half|quarter|one|two|three)\s*(cup|cups|g|gm|gms|gram|grams|kg|ml|l|tbsp|tsp|tablespoon|teaspoon|piece|pieces|slice|slices|bowl|bowls|plate|plates|serving|servings|portion|portions)\b/i;

export async function reestimateItem(
  name: string,
  estimatedWeightG: number,
): Promise<ReestimateResult> {
  const hasQty = QTY_RE.test(name);
  const userPrompt = hasQty
    ? `Food item: "${name}"\nThe name includes a quantity — use it to determine the serving size.\n\nReturn carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal.`
    : `Food item: "${name}"\nEstimated weight: ${estimatedWeightG}g\n\nReturn carbs_low_g, carbs_high_g, protein_g, fat_g, calories_kcal for this item at this weight.`;

  return requestStructuredTextJson({
    schemaName: 'item_nutrition_reestimate',
    schema: SCHEMA,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    validate,
  });
}
