-- Add BJJ-related fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS belt_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS home_dojo text,
ADD COLUMN IF NOT EXISTS training_locations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS titles jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.belt_history IS 'Array of belt history: [{belt: string, date: string, instructor: string}]';
COMMENT ON COLUMN public.profiles.home_dojo IS 'Primary training dojo/academy';
COMMENT ON COLUMN public.profiles.training_locations IS 'Array of frequent training locations';
COMMENT ON COLUMN public.profiles.titles IS 'Array of titles/achievements: [{title: string, date: string, organization: string}]';