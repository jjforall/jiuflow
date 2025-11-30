-- Remove the category check constraint to allow dynamic categories
ALTER TABLE techniques DROP CONSTRAINT IF EXISTS techniques_category_check;