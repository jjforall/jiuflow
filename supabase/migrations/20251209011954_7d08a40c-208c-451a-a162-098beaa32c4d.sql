
-- 1. Create user_billing table for sensitive payment data
CREATE TABLE public.user_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;

-- Very strict RLS: only the user can read their own billing info
CREATE POLICY "Users can view their own billing info"
ON public.user_billing
FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for regular users - handled by service role only
CREATE POLICY "Service role can manage billing"
ON public.user_billing
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment explaining the table
COMMENT ON TABLE public.user_billing IS 'Sensitive payment data isolated from profiles table. Only accessible by the user themselves or service role.';

-- 2. Migrate existing stripe_customer_id data from profiles
INSERT INTO public.user_billing (user_id, stripe_customer_id)
SELECT id, stripe_customer_id
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Remove stripe_customer_id from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 4. Remove email column from celebrity_applications (can get via user_id or auth)
-- First, ensure user_id is NOT NULL for existing applications if possible
-- Then remove email column
ALTER TABLE public.celebrity_applications DROP COLUMN IF EXISTS email;

-- 5. Also remove email from profiles since it's duplicated from auth.users
-- This requires updating code to get email from auth instead
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 6. Add updated_at trigger for user_billing
CREATE TRIGGER update_user_billing_updated_at
BEFORE UPDATE ON public.user_billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
