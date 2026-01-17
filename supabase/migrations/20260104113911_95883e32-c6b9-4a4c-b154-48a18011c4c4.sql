-- Create loyalty_customers table for tracking customer points
CREATE TABLE public.loyalty_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_points_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Create loyalty_transactions table for points history
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  sale_amount NUMERIC,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add image_url column to products table
ALTER TABLE public.products ADD COLUMN image_url TEXT;

-- Enable RLS on loyalty tables
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_customers
CREATE POLICY "Users can view their own loyalty customers"
ON public.loyalty_customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create loyalty customers"
ON public.loyalty_customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty customers"
ON public.loyalty_customers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loyalty customers"
ON public.loyalty_customers FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for loyalty_transactions
CREATE POLICY "Users can view their own loyalty transactions"
ON public.loyalty_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create loyalty transactions"
ON public.loyalty_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Trigger for updating loyalty_customers updated_at
CREATE TRIGGER update_loyalty_customers_updated_at
BEFORE UPDATE ON public.loyalty_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();