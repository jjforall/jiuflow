-- Fix profiles table security: Remove public access for unauthenticated users
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Only authenticated users can view public profiles (sensitive data is still accessible but requires login)
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND is_public = true
);

-- Fix referral_codes table security: Remove unrestricted public access
DROP POLICY IF EXISTS "Anyone can view referral codes by code" ON public.referral_codes;

-- Create a secure function to validate referral codes without exposing all data
CREATE OR REPLACE FUNCTION public.validate_referral_code(code_to_check text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  code_record record;
BEGIN
  SELECT id, user_id INTO code_record
  FROM public.referral_codes
  WHERE code = code_to_check OR dojo_friends_code = code_to_check
  LIMIT 1;
  
  IF code_record IS NULL THEN
    RETURN json_build_object('valid', false);
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'id', code_record.id
  );
END;
$$;