-- Drop existing policies on celebrity_applications
DROP POLICY IF EXISTS "Admins can delete celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can insert celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can update celebrity applications" ON public.celebrity_applications;
DROP POLICY IF EXISTS "Admins can view celebrity applications" ON public.celebrity_applications;

-- Create proper permissive policies for admin-only access
CREATE POLICY "Admins can view celebrity applications" 
ON public.celebrity_applications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert celebrity applications" 
ON public.celebrity_applications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update celebrity applications" 
ON public.celebrity_applications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete celebrity applications" 
ON public.celebrity_applications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow public to INSERT applications (so anyone can apply)
CREATE POLICY "Anyone can submit celebrity applications" 
ON public.celebrity_applications 
FOR INSERT 
WITH CHECK (true);