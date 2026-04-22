import { requestStructuredVisionJson } from './client';
import type { IdentifyResponse } from './types';
import { validateIdentifyResponse } from './validation';

const SYSTEM_PROMPT = `You are a food identification expert specialising in Indian home-cooked cuisine.
Identify only food that is actually visible in the image. Do not invent hidden items, side dishes, drinks, condiments, or ingredients that are not clearly present.
Common dishes include: dal, roti, rice (steamed/fried), sabzi, idli, dosa, sambar, chutney, paratha, khichdi, biryani, rajma, chole, poha, upma, and more.
Name items specifically and in everyday food terms, for example "steamed white rice", "yellow dal", or "aloo sabzi" instead of broad labels.
Split distinct visible foods into separate items, but keep mixed dishes such as biryani, khichdi, poha, or upma as a single item unless clearly plated separately.
Ignore plates, bowls, utensils, napkins, packaging, and background objects.
Use lower confidence when the image is blurry, partially cropped, shadowed, or visually ambiguous.
Do not return an empty array unless you are genuinely confident that there is no visible edible food in the image.
Return valid JSON only.`;

const RECOVERY_SYSTEM_PROMPT = `You are doing a second-pass recovery check on a meal photo because the first pass found no visible food.
Look carefully for any edible food that is actually visible.
If food is visible but hard to identify precisely, return the best broad visible label with low confidence, for example "flatbread", "rice dish", "curry", "lentil dish", or "mixed vegetable sabzi".
Prefer a low-confidence best-effort visible label over returning an empty array.
Return an empty array only if there is clearly no edible food visible or the image is completely unreadable.
Return valid JSON only.`;

const IDENTIFY_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'confidence'],
        properties: {
          name: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

async function runIdentifyRequest(
  imageBase64: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<IdentifyResponse> {
  return requestStructuredVisionJson({
    imageBase64,
    schemaName: 'identified_foods',
    schema: IDENTIFY_RESPONSE_SCHEMA,
    systemPrompt,
    userPrompt,
    validate: validateIdentifyResponse,
  });
}

export async function identifyFoods(imageBase64: string): Promise<IdentifyResponse> {
  const primary = await runIdentifyRequest(
    imageBase64,
    SYSTEM_PROMPT,
    'What visible dishes are in this meal photo? Return JSON with one entry per visible food item using items[].name and items[].confidence (0-100).',
  );

  if (primary.items.length > 0) {
    return primary;
  }

  console.warn('[OpenAI] identifyFoods primary pass returned zero items; running recovery pass');

  const recovery = await runIdentifyRequest(
    imageBase64,
    RECOVERY_SYSTEM_PROMPT,
    'Inspect the meal photo again. If any edible food is visible, return the best visible labels you can, even if broad and low-confidence. Return JSON with items[].name and items[].confidence (0-100).',
  );

  console.log('[OpenAI] identifyFoods recovery output', recovery);
  return recovery;
}
