-- Create a table to track founder plan purchases
CREATE TABLE IF NOT EXISTS public.founder_plan_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 10,
  current_price DECIMAL(10,2) NOT NULL DEFAULT 50000,
  next_price DECIMAL(10,2) NOT NULL DEFAULT 80000,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.founder_plan_count ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read the count
CREATE POLICY "Anyone can read founder plan count"
  ON public.founder_plan_count
  FOR SELECT
  USING (true);

-- Policy to allow service role to update (for edge functions)
CREATE POLICY "Service role can update founder plan count"
  ON public.founder_plan_count
  FOR UPDATE
  USING (true);

-- Insert initial record
INSERT INTO public.founder_plan_count (count, max_count, current_price, next_price)
VALUES (0, 10, 50000, 80000)
ON CONFLICT DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.founder_plan_count;