-- 1. Remove overly broad avatar policies
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;

-- 2. Remove token-bypass policy on video_list_items
DROP POLICY IF EXISTS "Items visible via share token" ON public.video_list_items;

-- 3. Secure RPC that requires the actual share token
CREATE OR REPLACE FUNCTION public.get_shared_list_items(p_share_token text)
RETURNS TABLE (
  id uuid,
  list_id uuid,
  technique_id uuid,
  display_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_id uuid;
BEGIN
  IF p_share_token IS NULL OR length(p_share_token) < 8 THEN
    RETURN;
  END IF;

  SELECT vl.id INTO v_list_id
  FROM public.video_lists vl
  WHERE vl.share_token = p_share_token
    AND (vl.share_token_expires_at IS NULL OR vl.share_token_expires_at > now())
  LIMIT 1;

  IF v_list_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT vli.id, vli.list_id, vli.technique_id, vli.display_order
  FROM public.video_list_items vli
  WHERE vli.list_id = v_list_id
  ORDER BY vli.display_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_list_items(text) TO anon, authenticated;