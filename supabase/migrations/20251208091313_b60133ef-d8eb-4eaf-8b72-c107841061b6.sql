-- Add venue image and additional information columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS venue_image_url text,
ADD COLUMN IF NOT EXISTS venue_address text,
ADD COLUMN IF NOT EXISTS venue_address_ja text,
ADD COLUMN IF NOT EXISTS venue_access text,
ADD COLUMN IF NOT EXISTS venue_access_ja text,
ADD COLUMN IF NOT EXISTS weight_classes text[],
ADD COLUMN IF NOT EXISTS entry_fee text,
ADD COLUMN IF NOT EXISTS entry_fee_ja text,
ADD COLUMN IF NOT EXISTS rules text,
ADD COLUMN IF NOT EXISTS rules_ja text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_url text;