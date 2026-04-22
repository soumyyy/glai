const DEFAULT_OPENAI_MODEL = 'gpt-4o-2024-11-20';
const DEFAULT_OPENAI_TIMEOUT_MS = 45_000;
const DEFAULT_OPENAI_MAX_RETRIES = 1;

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export function getOpenAIConfig() {
  const apiKey = readEnv('EXPO_PUBLIC_OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in .env.local.');
  }

  return {
    apiKey,
    model: readEnv('EXPO_PUBLIC_OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
    timeoutMs: DEFAULT_OPENAI_TIMEOUT_MS,
    maxRetries: DEFAULT_OPENAI_MAX_RETRIES,
  };
}

export function getSupabaseConfig() {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const key =
    readEnv('EXPO_PUBLIC_SUPABASE_KEY') ||
    readEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function hasSupabaseConfig(): boolean {
  return getSupabaseConfig() !== null;
}
