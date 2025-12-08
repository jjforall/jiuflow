-- Update public_profiles view to use SECURITY INVOKER
ALTER VIEW public.public_profiles SET (security_invoker = true);