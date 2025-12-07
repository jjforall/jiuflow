-- Create a security definer function to check if a profile exists but is private
-- This allows showing "private profile" message instead of "not found"
CREATE OR REPLACE FUNCTION public.check_profile_exists_private(
  p_identifier TEXT,
  p_is_uuid BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  profile_exists BOOLEAN,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_uuid THEN
    RETURN QUERY
    SELECT 
      TRUE AS profile_exists,
      p.display_name,
      p.avatar_url
    FROM profiles p
    WHERE p.id = p_identifier::uuid
      AND p.is_public = FALSE;
  ELSE
    RETURN QUERY
    SELECT 
      TRUE AS profile_exists,
      p.display_name,
      p.avatar_url
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_identifier)
      AND p.is_public = FALSE;
  END IF;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_profile_exists_private(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_profile_exists_private(TEXT, BOOLEAN) TO anon;