-- 問題: profilesテーブルへの直接アクセスで機密情報が漏れる可能性
-- 解決策: 公開プロファイルは機密情報を除外したビュー経由のみでアクセス可能に

-- 1. profilesテーブルに公開プロファイル閲覧ポリシーを追加（機密情報へのアクセスを防ぐため、ビュー経由のみを推奨）
-- 既存のポリシーはそのまま維持（自分のプロファイルのみ閲覧可能）

-- 2. 公開プロファイル用のセキュリティ関数を作成
CREATE OR REPLACE FUNCTION public.get_public_profile(p_identifier text, p_is_uuid boolean DEFAULT false)
RETURNS TABLE (
  id uuid,
  display_name text,
  display_name_reading text,
  bio text,
  avatar_url text,
  cover_image_url text,
  username text,
  home_dojo text,
  hometown text,
  organization_id uuid,
  is_public boolean,
  belt_history jsonb,
  training_locations jsonb,
  titles jsonb,
  favorite_fighters jsonb,
  favorite_techniques jsonb,
  hobbies jsonb,
  social_links jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_uuid THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.display_name_reading,
      p.bio,
      p.avatar_url,
      p.cover_image_url,
      p.username,
      p.home_dojo,
      p.hometown,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.training_locations,
      p.titles,
      p.favorite_fighters,
      p.favorite_techniques,
      p.hobbies,
      p.social_links,
      p.created_at
    FROM profiles p
    WHERE p.id = p_identifier::uuid
      AND p.is_public = TRUE;
  ELSE
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.display_name_reading,
      p.bio,
      p.avatar_url,
      p.cover_image_url,
      p.username,
      p.home_dojo,
      p.hometown,
      p.organization_id,
      p.is_public,
      p.belt_history,
      p.training_locations,
      p.titles,
      p.favorite_fighters,
      p.favorite_techniques,
      p.hobbies,
      p.social_links,
      p.created_at
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_identifier)
      AND p.is_public = TRUE;
  END IF;
END;
$$;

-- 3. 公開プロファイル検索用のセキュリティ関数を作成
CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  display_name text,
  display_name_reading text,
  username text,
  avatar_url text,
  belt_history jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.display_name_reading,
    p.username,
    p.avatar_url,
    p.belt_history
  FROM profiles p
  WHERE p.is_public = TRUE
    AND (
      p.display_name ILIKE '%' || p_query || '%' 
      OR p.display_name_reading ILIKE '%' || p_query || '%'
      OR p.username ILIKE '%' || p_query || '%'
    )
    AND p.id != auth.uid()
  LIMIT p_limit;
END;
$$;

-- 4. フォローしているユーザーのプロファイルを取得する関数
CREATE OR REPLACE FUNCTION public.get_followed_profiles(p_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  belt_history jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.belt_history
  FROM profiles p
  WHERE p.id = ANY(p_user_ids)
    AND p.is_public = TRUE;
END;
$$;