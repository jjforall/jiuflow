-- Create a SQL function to sanitize search terms for ILIKE queries
-- This prevents SQL wildcard injection attacks (%, _, \)
CREATE OR REPLACE FUNCTION public.sanitize_search_term(search_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  -- Return NULL for empty or null input
  IF search_input IS NULL OR LENGTH(TRIM(search_input)) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Trim and limit length to 100 characters
  result := SUBSTRING(TRIM(search_input), 1, 100);
  
  -- Escape LIKE special characters in order: \ first, then % and _
  result := REPLACE(result, '\', '\\');
  result := REPLACE(result, '%', '\%');
  result := REPLACE(result, '_', '\_');
  
  RETURN result;
END;
$$;

-- Update the search_public_profiles function to use sanitized input
CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text)
RETURNS SETOF public_profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_query text;
BEGIN
  -- Sanitize the input query
  sanitized_query := public.sanitize_search_term(p_query);
  
  -- Return empty if sanitized query is null
  IF sanitized_query IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.*
  FROM public_profiles p
  WHERE p.is_public = TRUE
    AND (
      p.display_name ILIKE '%' || sanitized_query || '%' 
      OR p.display_name_reading ILIKE '%' || sanitized_query || '%'
      OR p.username ILIKE '%' || sanitized_query || '%'
    )
  LIMIT 50;
END;
$$;