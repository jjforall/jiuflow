-- 翻訳キャッシュテーブル
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_lang, target_lang, source_text)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup 
ON public.translation_cache(source_lang, target_lang, source_text);

-- RLSを有効化（全員が読み取り可能）
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "翻訳キャッシュは全員が閲覧可能"
ON public.translation_cache
FOR SELECT
USING (true);

CREATE POLICY "翻訳キャッシュの追加は認証ユーザーのみ"
ON public.translation_cache
FOR INSERT
WITH CHECK (true);