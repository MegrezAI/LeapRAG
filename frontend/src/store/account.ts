import { create } from 'zustand';
import { devtools, createJSONStorage } from 'zustand/middleware';
import { type UserInfo } from '../types/account/account';
import { immer } from 'zustand/middleware/immer';

interface UserStoreState {
  userInfo: UserInfo | null;
  isLoadingUser: boolean;
  initUserInfo: () => Promise<UserInfo | null>;
  clearUserInfo: () => void;
  setUserInfo: (user: UserInfo | null) => void;
  updateUserInfo: (user: UserInfo) => void;
}

const useUserStore = create<UserStoreState>()(
  devtools(
    immer((set, get) => ({
      userInfo: null,
      isLoadingUser: false,
      initUserInfo: async () => {
        set({ isLoadingUser: true });
        try {
        } catch (error) {}
        return null;
      },
      clearUserInfo: () => {
        set((state) => {
          state.userInfo = null;
        });
      },
      setUserInfo: (user: UserInfo | null) => {
        set((state) => {
          state.userInfo = user;
        });
      },
      updateUserInfo: (user: UserInfo) => {
        set((state) => {
          state.userInfo = user;
        });
      }
    }))
  )
);

export default useUserStore;
