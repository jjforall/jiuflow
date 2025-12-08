-- Add registration deadline column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN registration_deadline date;