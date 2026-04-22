import type { IdentifyResponse } from './types';

const SYSTEM_PROMPT = `You are a food identification expert specialising in Indian home-cooked cuisine.
Common dishes include: dal, roti, rice (steamed/fried), sabzi, idli, dosa, sambar, chutney, paratha, khichdi, biryani, rajma, chole, poha, upma, and more.
Identify each dish separately and precisely — not "rice" but "steamed white rice".
Flag anything you are uncertain about with a lower confidence score.`;

export async function identifyFoods(imageBase64: string): Promise<IdentifyResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

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
              text: 'What dishes are visible in this photo? List each item separately. Return JSON: { "items": [{ "name": string, "confidence": number (0-100) }] }',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI identify failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return JSON.parse(content) as IdentifyResponse;
}
