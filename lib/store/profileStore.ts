import { create } from 'zustand';
import { LOCAL_USER_ID } from '../../constants/user';
import { getSetting, setSetting } from '../db/settings';
import { getAllProfiles, type UserRow } from '../db/users';

interface ProfileStore {
  activeUserId: string;
  profiles: UserRow[];
  setActiveUser: (id: string) => void;
  reloadProfiles: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  activeUserId: getSetting('active_user_id') ?? LOCAL_USER_ID,
  profiles: getAllProfiles(),

  setActiveUser: (id) => {
    setSetting('active_user_id', id);
    set({ activeUserId: id });
  },

  reloadProfiles: () => set({ profiles: getAllProfiles() }),
}));

export function getActiveUserId(): string {
  return useProfileStore.getState().activeUserId;
}
