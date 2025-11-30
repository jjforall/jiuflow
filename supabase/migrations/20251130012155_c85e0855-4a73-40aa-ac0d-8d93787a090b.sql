-- Add detailed fields to dojos table for comprehensive dojo information

-- Mission and basic info
ALTER TABLE public.dojos 
ADD COLUMN IF NOT EXISTS mission TEXT,
ADD COLUMN IF NOT EXISTS mission_ja TEXT,
ADD COLUMN IF NOT EXISTS mission_pt TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS target_audience_ja TEXT,
ADD COLUMN IF NOT EXISTS target_audience_pt TEXT,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,

-- Classes and curriculum
ADD COLUMN IF NOT EXISTS classes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb,

-- Staff and instructors
ADD COLUMN IF NOT EXISTS instructors JSONB DEFAULT '[]'::jsonb,

-- Facilities
ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS access_info TEXT,
ADD COLUMN IF NOT EXISTS access_info_ja TEXT,
ADD COLUMN IF NOT EXISTS access_info_pt TEXT,

-- Trial and experience
ADD COLUMN IF NOT EXISTS trial_info JSONB DEFAULT '{}'::jsonb,

-- FAQ
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb,

-- Testimonials and gallery
ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,

-- News and blog
ADD COLUMN IF NOT EXISTS news JSONB DEFAULT '[]'::jsonb,

-- Rules and safety
ADD COLUMN IF NOT EXISTS rules TEXT,
ADD COLUMN IF NOT EXISTS rules_ja TEXT,
ADD COLUMN IF NOT EXISTS rules_pt TEXT,
ADD COLUMN IF NOT EXISTS safety_measures TEXT,
ADD COLUMN IF NOT EXISTS safety_measures_ja TEXT,
ADD COLUMN IF NOT EXISTS safety_measures_pt TEXT,

-- Additional features
ADD COLUMN IF NOT EXISTS perks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS media_coverage JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS online_resources TEXT,
ADD COLUMN IF NOT EXISTS online_resources_ja TEXT,
ADD COLUMN IF NOT EXISTS online_resources_pt TEXT,

-- Social links (additional)
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS line TEXT,
ADD COLUMN IF NOT EXISTS blog_url TEXT;

COMMENT ON COLUMN public.dojos.mission IS 'Mission statement and philosophy';
COMMENT ON COLUMN public.dojos.target_audience IS 'Target audience description';
COMMENT ON COLUMN public.dojos.features IS 'Array of unique features and differentiators';
COMMENT ON COLUMN public.dojos.classes IS 'Array of class information with name, description, level, schedule';
COMMENT ON COLUMN public.dojos.pricing IS 'Pricing structure including membership fees, trial fees, etc';
COMMENT ON COLUMN public.dojos.schedule IS 'Weekly schedule array with day, time, class type, target';
COMMENT ON COLUMN public.dojos.instructors IS 'Array of instructor profiles with bio, qualifications, photo';
COMMENT ON COLUMN public.dojos.facilities IS 'Facility details including amenities, equipment, photos';
COMMENT ON COLUMN public.dojos.opening_hours IS 'Opening hours by day of week';
COMMENT ON COLUMN public.dojos.access_info IS 'Access information including directions, parking';
COMMENT ON COLUMN public.dojos.trial_info IS 'Trial class information including process, requirements, booking';
COMMENT ON COLUMN public.dojos.faq IS 'Frequently asked questions array';
COMMENT ON COLUMN public.dojos.testimonials IS 'Member testimonials and success stories';
COMMENT ON COLUMN public.dojos.gallery IS 'Photo and video gallery';
COMMENT ON COLUMN public.dojos.news IS 'News and announcements';
COMMENT ON COLUMN public.dojos.rules IS 'Dojo rules and regulations';
COMMENT ON COLUMN public.dojos.safety_measures IS 'Safety and hygiene measures';
COMMENT ON COLUMN public.dojos.perks IS 'Member benefits and perks';
COMMENT ON COLUMN public.dojos.media_coverage IS 'Media coverage and press mentions';