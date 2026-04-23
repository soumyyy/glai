import { create } from 'zustand';

export type SyncPhase =
  | 'idle'
  | 'syncing'
  | 'restoring'
  | 'completed'
  | 'error';

interface SyncStore {
  phase: SyncPhase;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  hasCompletedInitialRestore: boolean;
  setSyncing: () => void;
  setRestoring: () => void;
  setCompleted: () => void;
  setError: (message: string) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  phase: 'idle',
  lastSuccessfulSyncAt: null,
  lastError: null,
  hasCompletedInitialRestore: false,

  setSyncing: () =>
    set(() => ({
      phase: 'syncing',
      lastError: null,
    })),

  setRestoring: () =>
    set(() => ({
      phase: 'restoring',
      lastError: null,
    })),

  setCompleted: () =>
    set(() => ({
      phase: 'completed',
      lastSuccessfulSyncAt: new Date().toISOString(),
      lastError: null,
      hasCompletedInitialRestore: true,
    })),

  setError: (message: string) =>
    set((state) => ({
      phase: 'error',
      lastError: message,
      hasCompletedInitialRestore: state.hasCompletedInitialRestore,
    })),
}));
