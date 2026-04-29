const DEFAULT_OPENAI_MODEL = 'gpt-5.1';
const DEFAULT_OPENAI_TIMEOUT_MS = 45_000;
const DEFAULT_OPENAI_MAX_RETRIES = 1;

function readPublicEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function getOpenAIConfig() {
  const apiKey = readPublicEnv(process.env.EXPO_PUBLIC_OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in .env.local.');
  }

  return {
    apiKey,
    model: readPublicEnv(process.env.EXPO_PUBLIC_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
    timeoutMs: DEFAULT_OPENAI_TIMEOUT_MS,
    maxRetries: DEFAULT_OPENAI_MAX_RETRIES,
  };
}

export function getSupabaseConfig() {
  const url = readPublicEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key =
    readPublicEnv(process.env.EXPO_PUBLIC_SUPABASE_KEY) ||
    readPublicEnv(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    readPublicEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function hasSupabaseConfig(): boolean {
  return getSupabaseConfig() !== null;
}

export function getGoogleClientId(): string {
  const clientId = readPublicEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
  if (!clientId) {
    throw new Error('Google client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env.local.');
  }
  return clientId;
}
