
-- プロフィールテーブルのRLSポリシーを確認・更新
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 新しいポリシーを作成: すべてのユーザーがプロフィールを閲覧可能
CREATE POLICY "Enable read access for all users"
ON public.profiles
FOR SELECT
USING (true);

-- user_dojosテーブルのRLSポリシーも確認・更新
DROP POLICY IF EXISTS "User dojos are viewable by everyone" ON public.user_dojos;

CREATE POLICY "Enable read access for user dojos"
ON public.user_dojos
FOR SELECT
USING (true);
