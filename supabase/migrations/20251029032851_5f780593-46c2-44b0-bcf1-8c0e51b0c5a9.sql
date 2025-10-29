-- Fix RLS policies for techniques table to allow inserts/updates/deletes
DROP POLICY IF EXISTS "Authenticated users can insert techniques" ON techniques;
DROP POLICY IF EXISTS "Authenticated users can update techniques" ON techniques;
DROP POLICY IF EXISTS "Authenticated users can delete techniques" ON techniques;

-- Allow anyone to insert techniques
CREATE POLICY "Anyone can insert techniques"
ON techniques
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update techniques
CREATE POLICY "Anyone can update techniques"
ON techniques
FOR UPDATE
USING (true);

-- Allow anyone to delete techniques
CREATE POLICY "Anyone can delete techniques"
ON techniques
FOR DELETE
USING (true);