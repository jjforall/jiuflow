-- Add lovable_model column to line_settings
ALTER TABLE public.line_settings 
ADD COLUMN lovable_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash';