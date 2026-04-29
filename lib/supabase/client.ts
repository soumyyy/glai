import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, type SupportedStorage, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config';

let supabase: SupabaseClient | null = null;

const ExpoSecureStoreAdapter: SupportedStorage = {
  getItem: (key) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) {
    return supabase;
  }

  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  supabase = createClient(config.url, config.key, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return supabase;
}
