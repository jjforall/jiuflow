-- Add columns for dojo friends referral code
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS dojo_friends_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS dojo_friends_uses INTEGER DEFAULT 0 NOT NULL;

-- Generate initial dojo friends codes for existing users
UPDATE public.referral_codes 
SET dojo_friends_code = 'DJ-' || upper(substring(md5(random()::text) from 1 for 6))
WHERE dojo_friends_code IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_dojo_friends_code ON public.referral_codes(dojo_friends_code);

-- Update the create_referral_code_for_user function to generate both codes
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create referral codes (only if not exists)
  INSERT INTO public.referral_codes (
    user_id, 
    code, 
    dojo_friends_code
  )
  VALUES (
    NEW.id, 
    public.generate_referral_code(),
    'DJ-' || upper(substring(md5(random()::text) from 1 for 6))
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user points (only if not exists)
  INSERT INTO public.user_points (user_id, points)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;