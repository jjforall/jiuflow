-- public_profiles ビューを SECURITY INVOKER に変更（デフォルトなので再作成するだけ）
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles 
WITH (security_invoker = true)
AS
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