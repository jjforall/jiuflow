-- Remove the dangerous policy that allows anyone to read all profiles
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;