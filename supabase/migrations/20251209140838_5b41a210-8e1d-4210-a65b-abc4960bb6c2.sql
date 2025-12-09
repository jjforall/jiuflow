-- Add file_size column to user_videos table
ALTER TABLE public.user_videos ADD COLUMN IF NOT EXISTS file_size bigint DEFAULT 0;

-- Create a function to get user's total storage usage
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(file_size), 0)::bigint
  FROM public.user_videos
  WHERE user_id = p_user_id
$$;

-- Create a function to check if user can upload (returns remaining storage in bytes)
CREATE OR REPLACE FUNCTION public.check_storage_limit(p_user_id uuid, p_file_size bigint)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage bigint;
  storage_limit bigint;
  is_subscribed boolean;
BEGIN
  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  ) INTO is_subscribed;
  
  -- Set storage limit based on subscription status
  -- Free: 100GB, Paid: 1TB
  IF is_subscribed THEN
    storage_limit := 1099511627776; -- 1TB in bytes
  ELSE
    storage_limit := 107374182400; -- 100GB in bytes
  END IF;
  
  -- Get current usage
  SELECT COALESCE(SUM(file_size), 0) INTO current_usage
  FROM public.user_videos
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'can_upload', (current_usage + p_file_size) <= storage_limit,
    'current_usage', current_usage,
    'storage_limit', storage_limit,
    'remaining', storage_limit - current_usage,
    'is_subscribed', is_subscribed
  );
END;
$$;