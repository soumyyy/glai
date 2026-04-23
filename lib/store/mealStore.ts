import { create } from 'zustand';
import type { NutritionItem } from '../ai/types';
import type { PortionSize } from '../db/meals';

export type { PortionSize };

interface MealDraft {
  imageBase64: string | null;
  additionalImageBase64: string | null;
  portionSize: PortionSize;
  portionMultiplier: number;
  items: NutritionItem[];
  overallConfidence: number;
  imageQuality: 'good' | 'acceptable' | 'poor';
}

interface MealStore {
  draft: MealDraft;
  setImage: (base64: string) => void;
  setAdditionalImage: (base64: string) => void;
  setPortion: (size: PortionSize, multiplier: number) => void;
  setAIResults: (
    items: NutritionItem[],
    confidence: number,
    quality: 'good' | 'acceptable' | 'poor',
  ) => void;
  mergeItems: (newItems: NutritionItem[]) => void;
  updateItem: (index: number, patch: Partial<NutritionItem>) => void;
  removeItem: (index: number) => void;
  addItem: (item: NutritionItem) => void;
  reset: () => void;
}

const defaultDraft: MealDraft = {
  imageBase64: null,
  additionalImageBase64: null,
  portionSize: 'full',
  portionMultiplier: 1.0,
  items: [],
  overallConfidence: 0,
  imageQuality: 'good',
};

export const useMealStore = create<MealStore>((set) => ({
  draft: defaultDraft,

  setImage: (base64) =>
    set(() => ({ draft: { ...defaultDraft, imageBase64: base64 } })),

  setAdditionalImage: (base64) =>
    set((s) => ({ draft: { ...s.draft, additionalImageBase64: base64 } })),

  setPortion: (size, multiplier) =>
    set((s) => ({ draft: { ...s.draft, portionSize: size, portionMultiplier: multiplier } })),

  setAIResults: (items, confidence, quality) =>
    set((s) => ({
      draft: { ...s.draft, items, overallConfidence: confidence, imageQuality: quality },
    })),

  mergeItems: (newItems) =>
    set((s) => ({ draft: { ...s.draft, items: [...s.draft.items, ...newItems] } })),

  updateItem: (index, patch) =>
    set((s) => {
      const items = [...s.draft.items];
      items[index] = { ...items[index], ...patch };
      return { draft: { ...s.draft, items } };
    }),

  removeItem: (index) =>
    set((s) => ({
      draft: { ...s.draft, items: s.draft.items.filter((_, i) => i !== index) },
    })),

  addItem: (item) =>
    set((s) => ({ draft: { ...s.draft, items: [...s.draft.items, item] } })),

  reset: () => set({ draft: defaultDraft }),
}));
