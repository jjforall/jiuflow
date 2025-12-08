-- Create revenue splits table to track earnings
CREATE TABLE public.video_revenue_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_purchase_id uuid REFERENCES public.video_purchases(id),
  video_id uuid NOT NULL REFERENCES public.user_videos(id),
  total_amount integer NOT NULL,
  platform_fee integer NOT NULL,
  owner_amount integer NOT NULL,
  featured_user_amount integer DEFAULT 0,
  owner_id uuid NOT NULL,
  featured_user_id uuid,
  stripe_payment_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_revenue_splits ENABLE ROW LEVEL SECURITY;

-- Users can view their own revenue
CREATE POLICY "Users can view their own revenue"
ON public.video_revenue_splits
FOR SELECT
USING (auth.uid() = owner_id OR auth.uid() = featured_user_id);

-- Admins can view all revenue
CREATE POLICY "Admins can view all revenue"
ON public.video_revenue_splits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert revenue splits
CREATE POLICY "Service role can insert revenue splits"
ON public.video_revenue_splits
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_video_revenue_splits_owner ON public.video_revenue_splits(owner_id);
CREATE INDEX idx_video_revenue_splits_featured ON public.video_revenue_splits(featured_user_id);