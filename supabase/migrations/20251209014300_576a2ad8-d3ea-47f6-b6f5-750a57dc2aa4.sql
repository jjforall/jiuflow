-- 既存のビューを削除
DROP VIEW IF EXISTS public_profiles;

-- 公開プロフィール用のビューを作成（機密データを除外）
CREATE VIEW public_profiles AS
SELECT 
  id,
  display_name,
  display_name_reading,
  username,
  avatar_url,
  cover_image_url,
  bio,
  home_dojo,
  organization_id,
  is_public,
  belt_history,
  training_locations,
  titles,
  favorite_fighters,
  favorite_techniques,
  hobbies,
  social_links,
  created_at
FROM profiles
WHERE is_public = true;

-- ビューへのSELECTアクセスを許可
GRANT SELECT ON public_profiles TO anon, authenticated;

-- コメント追加
COMMENT ON VIEW public_profiles IS '公開プロフィール用のビュー。date_of_birth, hometown, marital_status, education, work_experienceなどの機密データを除外。';