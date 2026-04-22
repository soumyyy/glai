import type { IdentifiedItem, EstimateResponse } from './types';

const SYSTEM_PROMPT = `You are a nutrition expert specialising in Indian home-cooked cuisine.
Given identified dishes, estimate weights and nutrition ranges. Always return LOW and HIGH estimates — never a single number.
Account for typical Indian home-cooking portion sizes.
For mixed dishes (biryani, khichdi), use wider uncertainty ranges.`;

export async function estimateNutrition(
  imageBase64: string,
  identifiedItems: IdentifiedItem[],
): Promise<EstimateResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const itemList = identifiedItems.map((i) => `- ${i.name}`).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `The following dishes are in this photo:\n${itemList}\n\nFor each dish, estimate weight and nutrition. Return JSON:\n{\n  "items": [{\n    "name": string,\n    "ai_identified_name": string,\n    "estimated_weight_g": number,\n    "carbs_low_g": number,\n    "carbs_high_g": number,\n    "protein_g": number,\n    "fat_g": number,\n    "calories_kcal": number,\n    "ai_notes": string\n  }],\n  "overall_confidence": number (0-100),\n  "image_quality": "good" | "acceptable" | "poor"\n}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI estimate failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return JSON.parse(content) as EstimateResponse;
}
