-- 1. profiles テーブルから問題のあるポリシーを削除
-- "Authenticated users can view public profiles" ポリシーは全カラムを露出するため削除
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

-- 2. public_profiles ビューを再作成（機密データを除外）
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  username,
  bio,
  avatar_url,
  cover_image_url,
  home_dojo,
  hometown,
  belt_history,
  titles,
  social_links,
  favorite_fighters,
  favorite_techniques,
  hobbies,
  training_locations,
  organization_id,
  is_public,
  created_at
FROM public.profiles
WHERE is_public = true;

-- 3. public_dojos ビューを作成（連絡先情報を除外した公開用）
DROP VIEW IF EXISTS public.public_dojos;
CREATE VIEW public.public_dojos AS
SELECT 
  id,
  name,
  name_ja,
  name_pt,
  description,
  description_ja,
  description_pt,
  location,
  website,
  instagram,
  facebook,
  youtube,
  twitter,
  logo_url,
  cover_image_url,
  slug,
  features,
  classes,
  pricing,
  schedule,
  instructors,
  facilities,
  opening_hours,
  trial_info,
  faq,
  testimonials,
  gallery,
  news,
  perks,
  media_coverage,
  blog_url,
  mission,
  mission_ja,
  mission_pt,
  target_audience,
  target_audience_ja,
  target_audience_pt,
  access_info,
  access_info_ja,
  access_info_pt,
  rules,
  rules_ja,
  rules_pt,
  safety_measures,
  safety_measures_ja,
  safety_measures_pt,
  online_resources,
  online_resources_ja,
  online_resources_pt,
  is_verified,
  created_at,
  updated_at
FROM public.dojos;
-- email, phone, line, created_by は除外

-- 4. dojos テーブルのRLSポリシーを更新
-- 既存の "Anyone can view dojos" ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view dojos" ON public.dojos;

-- 認証済みユーザーのみが連絡先情報を含む全データを閲覧可能
CREATE POLICY "Authenticated users can view all dojo data"
ON public.dojos
FOR SELECT
TO authenticated
USING (true);

-- 管理者と道場作成者は引き続き全データにアクセス可能（既存ポリシーで対応済み）