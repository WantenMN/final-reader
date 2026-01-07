import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ReadState {
  isTocOpen: boolean;
  isHeaderVisible: boolean;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  toggleToc: () => void;
  toggleHeader: () => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setParagraphSpacing: (spacing: number) => void;
  setContentWidth: (width: number) => void;
}

export const useReadStore = create<ReadState>()(
  persist(
    (set) => ({
      isTocOpen: true, // Default to open
      isHeaderVisible: true, // Default to open
      fontSize: 20,
      lineHeight: 1.6,
      paragraphSpacing: 1,
      contentWidth: 700,
      toggleToc: () => set((state) => ({ isTocOpen: !state.isTocOpen })),
      toggleHeader: () => set((state) => ({ isHeaderVisible: !state.isHeaderVisible })),
      setFontSize: (size: number) => set({ fontSize: size }),
      setLineHeight: (height: number) => set({ lineHeight: height }),
      setParagraphSpacing: (spacing: number) => set({ paragraphSpacing: spacing }),
      setContentWidth: (width: number) => set({ contentWidth: width }),
    }),
    {
      name: 'read-storage', // unique name
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
