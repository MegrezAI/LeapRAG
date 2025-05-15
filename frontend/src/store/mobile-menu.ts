import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface MobileMenuStoreState {
  isOpen: boolean;
  toggle: () => void;
}

export const useMobileMenuStore = create<MobileMenuStoreState>()(
  devtools(
    immer((set) => ({
      isOpen: false,
      toggle: () =>
        set((state) => {
          state.isOpen = !state.isOpen;
        })
    }))
  )
);
