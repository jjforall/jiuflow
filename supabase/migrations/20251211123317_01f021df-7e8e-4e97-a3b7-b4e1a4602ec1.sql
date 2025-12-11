-- Add slug column for clean URLs
ALTER TABLE public.video_lists ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_video_lists_slug ON public.video_lists(slug);

-- Update RLS policy for unlisted access (anyone with URL can view)
DROP POLICY IF EXISTS "Items visible based on list visibility" ON public.video_list_items;

CREATE POLICY "Items visible based on list visibility"
ON public.video_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_lists
    WHERE video_lists.id = video_list_items.list_id
    AND (
      video_lists.visibility = 'public'
      OR video_lists.visibility = 'unlisted'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Add policy for video_lists public read access
DROP POLICY IF EXISTS "Anyone can view public and unlisted lists" ON public.video_lists;

CREATE POLICY "Anyone can view public and unlisted lists"
ON public.video_lists
FOR SELECT
USING (
  visibility IN ('public', 'unlisted')
  OR has_role(auth.uid(), 'admin'::app_role)
);