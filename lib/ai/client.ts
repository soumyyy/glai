import { getOpenAIConfig } from '../config';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

interface StructuredVisionRequest<T> {
  imageBase64: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  validate: (value: unknown) => T;
}

function truncate(value: string, maxLength = 1200): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function logOpenAI(event: string, payload: Record<string, unknown>) {
  console.log(`[OpenAI] ${event}\n${safeJson(payload)}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'OpenAI request timed out. Please try again.';
    }

    return error.message;
  }

  return 'Unknown OpenAI error.';
}

interface StructuredTextRequest<T> {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  validate: (value: unknown) => T;
}

export async function requestStructuredTextJson<T>(
  params: StructuredTextRequest<T>,
): Promise<T> {
  const { apiKey, model, timeoutMs, maxRetries } = getOpenAIConfig();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const attemptNumber = attempt + 1;

    logOpenAI('text-request:start', {
      schemaName: params.schemaName,
      model,
      attempt: attemptNumber,
      userPrompt: params.userPrompt,
    });

    try {
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: { name: params.schemaName, strict: true, schema: params.schema },
          },
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user',   content: params.userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < maxRetries && RETRYABLE_STATUS_CODES.has(response.status)) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      if (message?.refusal) throw new Error(`OpenAI refused the request: ${message.refusal}`);
      if (typeof message?.content !== 'string' || !message.content.trim()) throw new Error('OpenAI returned an empty response.');

      let parsed: unknown;
      try { parsed = JSON.parse(message.content); } catch { throw new Error('OpenAI returned malformed JSON.'); }

      logOpenAI('text-request:parsed', { schemaName: params.schemaName, parsed });
      return params.validate(parsed);
    } catch (error) {
      const isRetryable = error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');
      if (attempt < maxRetries && isRetryable) { await sleep(500 * (attempt + 1)); continue; }
      throw new Error(extractErrorMessage(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('OpenAI request failed after retries.');
}

export async function requestStructuredVisionJson<T>(
  params: StructuredVisionRequest<T>,
): Promise<T> {
  const { apiKey, model, timeoutMs, maxRetries } = getOpenAIConfig();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const attemptNumber = attempt + 1;

    logOpenAI('request:start', {
      schemaName: params.schemaName,
      model,
      attempt: attemptNumber,
      maxRetries,
      timeoutMs,
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      imageBase64Bytes: params.imageBase64.length,
    });

    try {
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: params.schemaName,
              strict: true,
              schema: params.schema,
            },
          },
          messages: [
            { role: 'system', content: params.systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${params.imageBase64}`,
                    detail: 'high',
                  },
                },
                {
                  type: 'text',
                  text: params.userPrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logOpenAI('request:error-response', {
          schemaName: params.schemaName,
          attempt: attemptNumber,
          status: response.status,
          body: truncate(errorText),
        });

        if (attempt < maxRetries && RETRYABLE_STATUS_CODES.has(response.status)) {
          await sleep(500 * (attempt + 1));
          continue;
        }

        throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      logOpenAI('request:raw-response', {
        schemaName: params.schemaName,
        attempt: attemptNumber,
        status: response.status,
        message: typeof message?.content === 'string' ? truncate(message.content) : message?.content,
        refusal: message?.refusal ?? null,
      });

      if (message?.refusal) {
        throw new Error(`OpenAI refused the request: ${message.refusal}`);
      }

      if (typeof message?.content !== 'string' || !message.content.trim()) {
        throw new Error('OpenAI returned an empty response.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(message.content);
      } catch {
        throw new Error('OpenAI returned malformed JSON.');
      }

      logOpenAI('request:parsed-response', {
        schemaName: params.schemaName,
        attempt: attemptNumber,
        parsed,
      });

      const validated = params.validate(parsed);

      logOpenAI('request:validated-response', {
        schemaName: params.schemaName,
        attempt: attemptNumber,
        validated,
      });

      return validated;
    } catch (error) {
      const isRetryableNetworkError =
        error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');

      logOpenAI('request:exception', {
        schemaName: params.schemaName,
        attempt: attemptNumber,
        retrying: attempt < maxRetries && isRetryableNetworkError,
        error: extractErrorMessage(error),
      });

      if (attempt < maxRetries && isRetryableNetworkError) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw new Error(extractErrorMessage(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('OpenAI request failed after retries.');
}
