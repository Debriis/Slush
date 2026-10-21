import { create } from 'zustand';
// UI preferences only. Remote records and authentication stay out of this store.
export const useUiStore = create((set) => ({
  feedScope: 'global',
  period: 'week',
  setFeedScope: (feedScope) => set({ feedScope }),
  setPeriod: (period) => set({ period }),
}));
