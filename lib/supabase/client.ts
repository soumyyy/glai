import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) {
    return supabase;
  }

  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  supabase = createClient(config.url, config.key);
  return supabase;
}
