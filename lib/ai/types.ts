export interface IdentifiedItem {
  name: string;
  confidence: number; // 0–100
}

export interface IdentifyResponse {
  items: IdentifiedItem[];
}

export interface NutritionItem {
  name: string;
  ai_identified_name: string;
  estimated_weight_g: number;
  carbs_low_g: number;
  carbs_high_g: number;
  protein_g: number;
  fat_g: number;
  calories_kcal: number;
  ai_notes: string;
}

export interface EstimateResponse {
  items: NutritionItem[];
  overall_confidence: number; // 0–100
  image_quality: 'good' | 'acceptable' | 'poor';
}
