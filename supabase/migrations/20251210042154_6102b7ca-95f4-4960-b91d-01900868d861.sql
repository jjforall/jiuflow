-- Create enum for video list visibility
CREATE TYPE public.video_list_visibility AS ENUM ('public', 'unlisted', 'private');

-- Create video_lists table
CREATE TABLE public.video_lists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ja TEXT,
    name_pt TEXT,
    description TEXT,
    description_ja TEXT,
    description_pt TEXT,
    visibility video_list_visibility NOT NULL DEFAULT 'private',
    cover_image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_list_items junction table
CREATE TABLE public.video_list_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES public.video_lists(id) ON DELETE CASCADE,
    technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(list_id, technique_id)
);

-- Enable RLS
ALTER TABLE public.video_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_list_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_lists
CREATE POLICY "Admins can manage video lists"
ON public.video_lists
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public lists visible to subscribers"
ON public.video_lists
FOR SELECT
USING (visibility = 'public');

CREATE POLICY "Unlisted lists visible to anyone with link"
ON public.video_lists
FOR SELECT
USING (visibility = 'unlisted');

-- RLS policies for video_list_items
CREATE POLICY "Admins can manage list items"
ON public.video_list_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Items visible based on list visibility"
ON public.video_list_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.video_lists
        WHERE id = video_list_items.list_id
        AND (visibility IN ('public', 'unlisted'))
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_video_lists_updated_at
BEFORE UPDATE ON public.video_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();