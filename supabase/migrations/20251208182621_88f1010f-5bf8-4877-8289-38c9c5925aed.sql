-- Add column to link related tournaments (previous year editions)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS related_tournament_slug text;

-- Update 2025 tournament to link to 2024
UPDATE tournaments 
SET related_tournament_slug = 'tokushima-open-2024-nogi'
WHERE slug = 'tokushima-open-2025-9ff9e6a7';

-- Update 2024 tournament to link to 2025
UPDATE tournaments 
SET related_tournament_slug = 'tokushima-open-2025-9ff9e6a7'
WHERE slug = 'tokushima-open-2024-nogi';