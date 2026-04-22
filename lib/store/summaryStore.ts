import { create } from 'zustand';
import type { DailySummaryRow } from '../db/summaries';

interface SummaryStore {
  todaySummary: DailySummaryRow | null;
  setTodaySummary: (summary: DailySummaryRow | null) => void;
}

export const useSummaryStore = create<SummaryStore>((set) => ({
  todaySummary: null,
  setTodaySummary: (summary) => set({ todaySummary: summary }),
}));
