-- Grant SELECT permission on public_profiles view to all users
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;