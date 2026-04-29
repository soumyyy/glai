import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthStore {
  isReady: boolean;
  isMigrating: boolean;
  migrationError: string | null;
  session: Session | null;
  user: User | null;
  setReady: (isReady: boolean) => void;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
  setMigrating: (isMigrating: boolean) => void;
  setMigrationError: (migrationError: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isReady: false,
  isMigrating: false,
  migrationError: null,
  session: null,
  user: null,

  setReady: (isReady) => set({ isReady }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearSession: () => set({ session: null, user: null, migrationError: null, isMigrating: false }),
  setMigrating: (isMigrating) => set({ isMigrating }),
  setMigrationError: (migrationError) => set({ migrationError }),
}));

export function getCurrentAccountId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}
