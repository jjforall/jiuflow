-- 1. public_profiles ビューから機密情報を除外して再作成
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles AS
SELECT 
    id,
    display_name,
    display_name_reading,
    bio,
    avatar_url,
    cover_image_url,
    username,
    home_dojo,
    organization_id,
    is_public,
    belt_history,
    titles,
    favorite_fighters,
    favorite_techniques,
    hobbies,
    social_links,
    created_at
FROM profiles
WHERE is_public = true;

-- 機密情報（hometown, training_locations, date_of_birth, marital_status, education, work_experience）は除外

-- 2. user_billing テーブルのRLSポリシーを厳格化
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Service role can manage billing" ON user_billing;
DROP POLICY IF EXISTS "Users can view their own billing info" ON user_billing;

-- 厳格なポリシーを作成
-- ユーザーは自分の課金情報のみ閲覧可能（変更不可）
CREATE POLICY "Users can view own billing only"
ON user_billing
FOR SELECT
USING (auth.uid() = user_id);

-- 匿名アクセスを明示的に拒否
CREATE POLICY "Deny anonymous access to user_billing"
ON user_billing
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- サービスロールによる操作はRLSバイパスで行うため、
-- 一般ユーザーによるINSERT/UPDATE/DELETEは許可しない