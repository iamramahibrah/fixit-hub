-- Create staff_accounts table for users to create staff with limited permissions
CREATE TABLE public.staff_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  permissions JSONB DEFAULT '{"pos": true, "inventory": false, "reports": false, "settings": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing_plans table for admin to customize plans
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  annual_price INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_highlighted BOOLEAN DEFAULT false,
  badge TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add branding columns to profiles table for per-user login branding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS login_image_url TEXT,
ADD COLUMN IF NOT EXISTS login_background_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Staff accounts policies (owner can manage their staff)
CREATE POLICY "Users can view their own staff" 
  ON public.staff_accounts FOR SELECT 
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create staff" 
  ON public.staff_accounts FOR INSERT 
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their staff" 
  ON public.staff_accounts FOR UPDATE 
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their staff" 
  ON public.staff_accounts FOR DELETE 
  USING (auth.uid() = owner_user_id);

-- Pricing plans policies (public read, admins can write)
CREATE POLICY "Anyone can view active pricing plans" 
  ON public.pricing_plans FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing plans" 
  ON public.pricing_plans FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default pricing plans
INSERT INTO public.pricing_plans (plan_key, name, description, monthly_price, annual_price, features, is_highlighted, badge, sort_order) VALUES
  ('starter', 'Starter', 'Perfect for sole traders', 500, 417, '["Record unlimited transactions", "Basic expense tracking", "Simple invoicing", "Mobile friendly", "Email support"]'::jsonb, false, null, 1),
  ('business', 'Business', 'For VAT-registered SMEs', 1200, 1000, '["Everything in Starter", "VAT calculations & reports", "Inventory management", "PDF invoice generation", "KRA deadline reminders", "Priority support"]'::jsonb, true, 'Most Popular', 2),
  ('pro', 'Pro', 'For SMEs & accountants', 2000, 1667, '["Everything in Business", "Multi-business support", "Advanced analytics", "Custom branding on invoices", "API access", "Dedicated account manager"]'::jsonb, false, null, 3);

-- Create branding storage bucket for login images
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT DO NOTHING;

-- Storage policies for branding bucket
CREATE POLICY "Branding images are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'branding');

CREATE POLICY "Users can upload their own branding" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own branding" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own branding" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create update trigger for staff_accounts
CREATE TRIGGER update_staff_accounts_updated_at
  BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for pricing_plans
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();