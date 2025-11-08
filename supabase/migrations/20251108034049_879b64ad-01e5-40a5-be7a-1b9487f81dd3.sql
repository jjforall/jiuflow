-- Add 'guard-pass' to the category column in techniques table
-- First, check if there's an existing constraint and drop it if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'techniques_category_check'
  ) THEN
    ALTER TABLE techniques DROP CONSTRAINT techniques_category_check;
  END IF;
END $$;

-- Add new check constraint with 'guard-pass' included
ALTER TABLE techniques 
ADD CONSTRAINT techniques_category_check 
CHECK (category IN ('pull', 'guard-pass', 'control', 'submission'));