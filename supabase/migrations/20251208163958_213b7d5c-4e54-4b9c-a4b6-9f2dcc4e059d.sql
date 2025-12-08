-- Add birth_date and death_date columns to celebrities table
ALTER TABLE public.celebrities
ADD COLUMN birth_date date NULL,
ADD COLUMN death_date date NULL;