
-- Step 1: Add a hash column for client secrets
ALTER TABLE public.oauth_clients ADD COLUMN client_secret_hash TEXT;

-- Step 2: Hash all existing plaintext secrets using SHA-256 (stored as hex)
-- We use encode(digest(...)) to create SHA-256 hashes
UPDATE public.oauth_clients 
SET client_secret_hash = encode(digest(client_secret, 'sha256'), 'hex')
WHERE client_secret IS NOT NULL;

-- Step 3: Make hash column NOT NULL now that all rows have values
ALTER TABLE public.oauth_clients ALTER COLUMN client_secret_hash SET NOT NULL;

-- Step 4: Drop the plaintext client_secret column
ALTER TABLE public.oauth_clients DROP COLUMN client_secret;

-- Step 5: Drop existing overly-permissive policies and recreate with column restrictions
-- Users should NOT be able to see the secret hash either
DROP POLICY IF EXISTS "Users can manage their own oauth clients" ON public.oauth_clients;
DROP POLICY IF EXISTS "Users can view active oauth clients" ON public.oauth_clients;

-- Users can view their own clients (no secret hash exposed via RLS - it's dropped from table access)
CREATE POLICY "Users can view their own oauth clients"
ON public.oauth_clients
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can insert their own clients
CREATE POLICY "Users can insert their own oauth clients"
ON public.oauth_clients
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update their own clients (non-secret fields only)
CREATE POLICY "Users can update their own oauth clients"
ON public.oauth_clients
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete their own clients
CREATE POLICY "Users can delete their own oauth clients"
ON public.oauth_clients
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
