-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all messages
CREATE POLICY "Admins can view all contact messages"
  ON public.contact_messages
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update message status
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert contact messages (authenticated or not)
CREATE POLICY "Anyone can create contact messages"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);