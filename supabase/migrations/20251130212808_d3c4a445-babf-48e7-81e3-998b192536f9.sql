-- Add slug column to celebrities table
ALTER TABLE public.celebrities ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_celebrities_slug ON public.celebrities(slug);

-- Insert Ryozo Murata data
INSERT INTO public.celebrities (
  display_name,
  bio,
  belt_history,
  home_dojo,
  organization_id,
  featured,
  sort_order,
  slug
) VALUES (
  'Ryozo Murata',
  '羽田雄希とともにJiuflowを運営する黒帯柔術家。丁寧な指導と技術的な深さで知られる。',
  '[{"belt": "black", "date": "2020-01-01", "instructor": "Yuki Hamada"}]'::jsonb,
  'Jiuflow Tokyo',
  NULL,
  true,
  2,
  'ryozo'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  belt_history = EXCLUDED.belt_history,
  home_dojo = EXCLUDED.home_dojo,
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order;