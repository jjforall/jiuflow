-- Add referral_code_id to subscriptions table to track who referred the user
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS referral_code_id uuid REFERENCES public.referral_codes(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_code_id 
ON public.subscriptions(referral_code_id);

-- Create a function to award referral points
CREATE OR REPLACE FUNCTION public.award_referral_points(
  p_referral_code_id uuid,
  p_referred_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id uuid;
BEGIN
  -- Get the referrer's user_id from the referral code
  SELECT user_id INTO v_referrer_user_id
  FROM public.referral_codes
  WHERE id = p_referral_code_id;
  
  IF v_referrer_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;
  
  -- Don't allow self-referral
  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN;
  END IF;
  
  -- Update user points
  INSERT INTO public.user_points (user_id, points)
  VALUES (v_referrer_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_points.points + p_amount,
      updated_at = NOW();
  
  -- Record transaction
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    referral_code_id
  ) VALUES (
    v_referrer_user_id,
    p_amount,
    'referral_bonus',
    p_description,
    p_referral_code_id
  );
  
  -- Increment referral code usage count
  UPDATE public.referral_codes
  SET uses_count = uses_count + 1,
      updated_at = NOW()
  WHERE id = p_referral_code_id;
END;
$$;