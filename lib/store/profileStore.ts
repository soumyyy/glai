import { create } from 'zustand';
import { getSetting, setSetting } from '../db/settings';
import { getCurrentAccountId } from './authStore';
import { getAllProfiles, type UserRow } from '../db/users';

interface ProfileStore {
  activeUserId: string | null;
  profiles: UserRow[];
  setActiveUser: (id: string) => void;
  reloadProfiles: () => void;
  clear: () => void;
}

function getAccountScopedActiveUserSettingKey(accountId: string) {
  return `active_user_id:${accountId}`;
}

function getPreferredActiveUserId(accountId: string, profiles: UserRow[]): string | null {
  const scoped = getSetting(getAccountScopedActiveUserSettingKey(accountId));
  if (scoped && profiles.some((profile) => profile.id === scoped)) {
    return scoped;
  }

  const legacy = getSetting('active_user_id');
  if (legacy && profiles.some((profile) => profile.id === legacy)) {
    return legacy;
  }

  return profiles[0]?.id ?? null;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  activeUserId: null,
  profiles: [],

  setActiveUser: (id) => {
    const accountId = getCurrentAccountId();
    if (accountId) {
      setSetting(getAccountScopedActiveUserSettingKey(accountId), id);
    }
    setSetting('active_user_id', id);
    set({ activeUserId: id });
  },

  reloadProfiles: () => {
    const accountId = getCurrentAccountId();
    if (!accountId) {
      set({ activeUserId: null, profiles: [] });
      return;
    }

    const profiles = getAllProfiles();
    const currentActiveUserId = useProfileStore.getState().activeUserId;
    const nextActiveUserId =
      currentActiveUserId && profiles.some((profile) => profile.id === currentActiveUserId)
        ? currentActiveUserId
        : getPreferredActiveUserId(accountId, profiles);

    if (nextActiveUserId) {
      setSetting(getAccountScopedActiveUserSettingKey(accountId), nextActiveUserId);
      setSetting('active_user_id', nextActiveUserId);
    }

    set({ profiles, activeUserId: nextActiveUserId });
  },

  clear: () => set({ activeUserId: null, profiles: [] }),
}));

export function getActiveUserId(): string {
  const activeUserId = useProfileStore.getState().activeUserId;
  if (!activeUserId) {
    throw new Error('No active profile selected.');
  }
  return activeUserId;
}
