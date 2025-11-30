-- Create celebrity edit requests table
CREATE TABLE celebrity_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  home_dojo TEXT,
  organization_id UUID REFERENCES organizations(id),
  belt_history JSONB,
  titles JSONB,
  social_links JSONB,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE celebrity_edit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own edit requests
CREATE POLICY "Users can view their own edit requests"
ON celebrity_edit_requests
FOR SELECT
USING (auth.uid() = requested_by);

-- Users can create edit requests for their own celebrity profile
CREATE POLICY "Users can create edit requests"
ON celebrity_edit_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by 
  AND EXISTS (
    SELECT 1 FROM celebrities 
    WHERE celebrities.id = celebrity_edit_requests.celebrity_id 
    AND celebrities.user_id = auth.uid()
  )
);

-- Admins can view all edit requests
CREATE POLICY "Admins can view all edit requests"
ON celebrity_edit_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update edit requests
CREATE POLICY "Admins can update edit requests"
ON celebrity_edit_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger to update updated_at
CREATE TRIGGER update_celebrity_edit_requests_updated_at
BEFORE UPDATE ON celebrity_edit_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_celebrity_edit_requests_status ON celebrity_edit_requests(status);
CREATE INDEX idx_celebrity_edit_requests_celebrity_id ON celebrity_edit_requests(celebrity_id);