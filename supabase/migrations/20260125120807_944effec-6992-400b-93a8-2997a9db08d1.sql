-- 翻訳履歴テーブル
CREATE TABLE translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id UUID NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  provider TEXT NOT NULL,
  video_duration_seconds INTEGER,
  processing_duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'processing',
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLSを有効化
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admins can manage translation history"
  ON translation_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- インデックス（見込み時間計算のクエリ最適化）
CREATE INDEX idx_translation_history_lookup 
  ON translation_history (provider, source_language, target_language, status);