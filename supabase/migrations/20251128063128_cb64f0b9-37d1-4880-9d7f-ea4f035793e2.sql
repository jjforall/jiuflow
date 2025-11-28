-- Add education and work experience fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN work_experience jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.education IS 'Array of education entries: [{school: string, degree?: string, field?: string, period?: string}]';
COMMENT ON COLUMN public.profiles.work_experience IS 'Array of work experience entries: [{company: string, position: string, period?: string, description?: string}]';