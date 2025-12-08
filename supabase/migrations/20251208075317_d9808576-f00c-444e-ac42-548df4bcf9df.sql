-- ============================================
-- 1. ADMIN_AUDIT_LOG: Make immutable (no UPDATE/DELETE)
-- ============================================

-- Explicitly deny UPDATE and DELETE for everyone (including admins)
-- RLS by default denies access if no policy matches, but let's be explicit

-- Check current policies and ensure no UPDATE/DELETE is allowed
-- The table should already have no UPDATE/DELETE policies, but let's verify by trying to drop any that might exist
DROP POLICY IF EXISTS "Admins can update audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can delete audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Anyone can update audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Anyone can delete audit logs" ON public.admin_audit_log;

-- Note: With RLS enabled and no UPDATE/DELETE policies, these operations are blocked


-- ============================================
-- 2. PRODUCT-LOGOS STORAGE: Fix admin check
-- ============================================

-- Drop the weak policies
DROP POLICY IF EXISTS "Admins can delete product logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product logos" ON storage.objects;

-- Recreate with proper admin check
CREATE POLICY "Admins can delete product logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-logos' AND has_role(auth.uid(), 'admin'::app_role));