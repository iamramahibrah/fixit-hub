-- First create the app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table FIRST (needed for admin policies)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- User roles policies using security definer function
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create app_settings table
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- App settings are public to read, admin to write
CREATE POLICY "App settings are publicly readable" 
ON public.app_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app settings" 
ON public.app_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get app setting by key
CREATE OR REPLACE FUNCTION public.get_app_setting(setting_key TEXT)
RETURNS TEXT AS $$
  SELECT value FROM public.app_settings WHERE key = setting_key;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  public_description TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  show_price BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all products" 
ON public.products 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all products" 
ON public.products 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create product_images table
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Product images policies
CREATE POLICY "Product images are viewable if product is viewable" 
ON public.product_images 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_id AND (p.user_id = auth.uid() OR p.is_public = true)
) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert images for their products" 
ON public.product_images 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_id AND p.user_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update images for their products" 
ON public.product_images 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_id AND p.user_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete images for their products" 
ON public.product_images 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_id AND p.user_id = auth.uid()
) OR public.has_role(auth.uid(), 'admin'));

-- Create pricing_plans table
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  annual_price NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Pricing plans are public to read
CREATE POLICY "Pricing plans are publicly readable" 
ON public.pricing_plans 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert pricing plans" 
ON public.pricing_plans 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing plans" 
ON public.pricing_plans 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing plans" 
ON public.pricing_plans 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create public_page_content table
CREATE TABLE public.public_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  content_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, section_key)
);

-- Enable RLS on public_page_content
ALTER TABLE public.public_page_content ENABLE ROW LEVEL SECURITY;

-- Page content is public to read
CREATE POLICY "Page content is publicly readable" 
ON public.public_page_content 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert page content" 
ON public.public_page_content 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update page content" 
ON public.public_page_content 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete page content" 
ON public.public_page_content 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_plans_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_public_page_content_updated_at
BEFORE UPDATE ON public.public_page_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Create products storage bucket  
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Storage policies for logos bucket
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for products bucket
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'products' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'products' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'products' AND auth.uid() IS NOT NULL);