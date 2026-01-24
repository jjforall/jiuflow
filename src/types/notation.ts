// BJJ Notation Master System Types

export type NotationCategory = 
  | 'position' 
  | 'action' 
  | 'submission' 
  | 'grip' 
  | 'movement' 
  | 'takedown'
  | 'outcome';

export interface BJJNotation {
  id: string;
  code: string;
  name_ja: string;
  name_en: string;
  category: NotationCategory;
  description?: string | null;
  usage_example?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  technique_count?: number;
}

export interface TechniqueNotation {
  id: string;
  technique_id: string;
  notation_id: string;
  context: string;
  created_at: string;
  notation?: BJJNotation;
}

export const NOTATION_CATEGORY_LABELS: Record<NotationCategory, { ja: string; en: string; color: string }> = {
  position: { ja: 'ポジション', en: 'Position', color: 'bg-blue-500' },
  action: { ja: 'アクション', en: 'Action', color: 'bg-green-500' },
  submission: { ja: 'サブミッション', en: 'Submission', color: 'bg-red-500' },
  grip: { ja: 'グリップ', en: 'Grip', color: 'bg-yellow-500' },
  movement: { ja: 'ムーブメント', en: 'Movement', color: 'bg-purple-500' },
  takedown: { ja: '立ち技', en: 'Takedown', color: 'bg-orange-500' },
  outcome: { ja: '結果', en: 'Outcome', color: 'bg-gray-500' },
};
