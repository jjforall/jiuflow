-- Add slug column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS slug text;