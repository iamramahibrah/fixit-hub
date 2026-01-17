-- Create product_images table for multiple product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add catalog visibility fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_description TEXT,
ADD COLUMN IF NOT EXISTS show_price BOOLEAN DEFAULT true;

-- Create public_page_content table for customizable page sections
CREATE TABLE public.public_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL, -- 'home', 'services', 'catalog', 'pricing', 'contact'
  section_key TEXT NOT NULL, -- 'hero_title', 'hero_subtitle', 'service_ict_title', etc.
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'html'
  content_value TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, section_key)
);

-- Create service_offerings table for editable services
CREATE TABLE public.service_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT, -- lucide icon name
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'general', -- 'ict', 'hardware', 'general'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;

-- Product images policies
CREATE POLICY "Users can view their product images" ON public.product_images
FOR SELECT USING (
  product_id IN (SELECT id FROM public.products WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their product images" ON public.product_images
FOR ALL USING (
  product_id IN (SELECT id FROM public.products WHERE user_id = auth.uid())
);

-- Public viewing of product images (for catalog)
CREATE POLICY "Public can view product images for public products" ON public.product_images
FOR SELECT USING (
  product_id IN (SELECT id FROM public.products WHERE is_public = true)
);

-- Public page content policies (public read, admin write)
CREATE POLICY "Anyone can view active page content" ON public.public_page_content
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage page content" ON public.public_page_content
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Service offerings policies (public read, admin write)
CREATE POLICY "Anyone can view active services" ON public.service_offerings
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage services" ON public.service_offerings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Public products policy
CREATE POLICY "Anyone can view public products" ON public.products
FOR SELECT USING (is_public = true);

-- Create update trigger for product_images
CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for public_page_content
CREATE TRIGGER update_public_page_content_updated_at
BEFORE UPDATE ON public.public_page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for service_offerings
CREATE TRIGGER update_service_offerings_updated_at
BEFORE UPDATE ON public.service_offerings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service offerings for ICT and Hardware support
INSERT INTO public.service_offerings (title, description, icon_name, category, is_featured, sort_order) VALUES
('Managed ICT Support', 'Comprehensive IT infrastructure management, 24/7 monitoring, helpdesk support, and proactive maintenance for your business technology needs.', 'Server', 'ict', true, 1),
('Hardware Support', 'Expert hardware installation, repair, maintenance, and procurement services. From workstations to servers, we keep your equipment running smoothly.', 'HardDrive', 'hardware', true, 2),
('Network Solutions', 'Design, implementation, and management of secure network infrastructure including LAN, WAN, VPN, and wireless solutions.', 'Network', 'ict', false, 3),
('Cloud Services', 'Cloud migration, hosting, backup, and disaster recovery solutions to ensure business continuity and scalability.', 'Cloud', 'ict', false, 4),
('Cybersecurity', 'Comprehensive security assessments, endpoint protection, firewall management, and security awareness training.', 'Shield', 'ict', false, 5),
('Software Solutions', 'Custom software development, system integration, and enterprise application deployment tailored to your needs.', 'Code', 'ict', false, 6);

-- Add app setting for catalog enabled
INSERT INTO public.app_settings (key, value) VALUES ('catalog_enabled', 'true')
ON CONFLICT (key) DO NOTHING;