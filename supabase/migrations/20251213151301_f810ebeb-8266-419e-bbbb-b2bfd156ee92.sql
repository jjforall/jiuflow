-- Drop the existing INSERT policy that allows any authenticated user
DROP POLICY IF EXISTS "翻訳キャッシュの追加は認証ユーザーのみ" ON public.translation_cache;

-- Create a new policy that only allows service role to insert
-- This is effectively "no user access" since service role bypasses RLS
CREATE POLICY "Only service role can insert translations"
ON public.translation_cache
FOR INSERT
WITH CHECK (false);

-- Note: The actual inserts will come from edge functions using service role key,
-- which bypasses RLS entirely, so this policy blocks all direct user access