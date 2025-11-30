-- Create celebrity lineage table for tracking instructor-student relationships
CREATE TABLE IF NOT EXISTS public.celebrity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.celebrities(id) ON DELETE CASCADE NOT NULL,
  instructor_id UUID REFERENCES public.celebrities(id) ON DELETE CASCADE NOT NULL,
  belt_level TEXT,
  started_at DATE,
  ended_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, instructor_id)
);

-- Enable RLS
ALTER TABLE public.celebrity_lineage ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view lineage
CREATE POLICY "Anyone can view celebrity lineage"
ON public.celebrity_lineage
FOR SELECT
USING (true);

-- Only admins can manage lineage
CREATE POLICY "Admins can insert celebrity lineage"
ON public.celebrity_lineage
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update celebrity lineage"
ON public.celebrity_lineage
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete celebrity lineage"
ON public.celebrity_lineage
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_celebrity_lineage_student ON public.celebrity_lineage(student_id);
CREATE INDEX idx_celebrity_lineage_instructor ON public.celebrity_lineage(instructor_id);

-- Insert existing lineage relationships
-- Cristiano Carioca → Carlson Gracie
INSERT INTO public.celebrity_lineage (student_id, instructor_id, belt_level, notes)
SELECT 
  c1.id as student_id,
  c2.id as instructor_id,
  'black' as belt_level,
  'Direct student of Carlson Gracie' as notes
FROM public.celebrities c1
CROSS JOIN public.celebrities c2
WHERE c1.display_name LIKE '%Cristiano%' 
  AND c1.display_name LIKE '%Carioca%'
  AND c2.display_name LIKE '%Carlson%'
  AND c2.display_name LIKE '%Gracie%'
ON CONFLICT (student_id, instructor_id) DO NOTHING;

-- Ryozo Murata → Cristiano Carioca
INSERT INTO public.celebrity_lineage (student_id, instructor_id, belt_level, notes)
SELECT 
  c1.id as student_id,
  c2.id as instructor_id,
  'black' as belt_level,
  'Direct student under Cristiano Carioca, inheriting the Carlson Gracie lineage' as notes
FROM public.celebrities c1
CROSS JOIN public.celebrities c2
WHERE c1.display_name LIKE '%Murata%'
  AND c2.display_name LIKE '%Cristiano%' 
  AND c2.display_name LIKE '%Carioca%'
ON CONFLICT (student_id, instructor_id) DO NOTHING;