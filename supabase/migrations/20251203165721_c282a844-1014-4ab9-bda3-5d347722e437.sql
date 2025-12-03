-- Create printful_orders table to track orders
CREATE TABLE IF NOT EXISTS public.printful_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  printful_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_email TEXT,
  shipping_name TEXT,
  shipping_address JSONB,
  cart_items JSONB NOT NULL,
  total_amount INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printful_orders ENABLE ROW LEVEL SECURITY;

-- Admin can view all orders
CREATE POLICY "Admins can view all printful orders"
ON public.printful_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update orders
CREATE POLICY "Admins can update printful orders"
ON public.printful_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_printful_orders_updated_at
BEFORE UPDATE ON public.printful_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();