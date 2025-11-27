-- Create application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected', 'renewal_pending', 'renewal_approved', 'renewal_rejected');

-- Create Brothers plan applications table
CREATE TABLE public.brothers_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'pending',
  application_year integer NOT NULL,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  next_eligible_date timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.brothers_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own applications"
  ON public.brothers_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON public.brothers_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.brothers_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all applications"
  ON public.brothers_applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_brothers_applications_user_id ON public.brothers_applications(user_id);
CREATE INDEX idx_brothers_applications_status ON public.brothers_applications(status);
CREATE INDEX idx_brothers_applications_year ON public.brothers_applications(application_year);

-- Create trigger to update updated_at
CREATE TRIGGER update_brothers_applications_updated_at
  BEFORE UPDATE ON public.brothers_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user can apply
CREATE OR REPLACE FUNCTION public.can_apply_for_brothers(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_rejection record;
  current_year integer;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Check for recent rejections
  SELECT * INTO last_rejection
  FROM public.brothers_applications
  WHERE user_id = user_uuid
    AND status IN ('rejected', 'renewal_rejected')
    AND next_eligible_date > NOW()
  ORDER BY submitted_at DESC
  LIMIT 1;
  
  -- If there's a recent rejection within the eligible period, cannot apply
  IF last_rejection IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already has pending application for current year
  IF EXISTS (
    SELECT 1
    FROM public.brothers_applications
    WHERE user_id = user_uuid
      AND application_year = current_year
      AND status IN ('pending', 'renewal_pending')
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to handle application rejection (sets 1-year wait period)
CREATE OR REPLACE FUNCTION public.reject_brothers_application(
  application_id uuid,
  reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.brothers_applications
  SET 
    status = CASE 
      WHEN status = 'pending' THEN 'rejected'::application_status
      WHEN status = 'renewal_pending' THEN 'renewal_rejected'::application_status
      ELSE status
    END,
    rejection_reason = reason,
    reviewed_at = NOW(),
    reviewed_by = auth.uid(),
    next_eligible_date = NOW() + INTERVAL '1 year'
  WHERE id = application_id;
END;
$$;