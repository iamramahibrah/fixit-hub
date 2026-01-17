-- Create enum for eTIMS submission status
CREATE TYPE public.etims_status AS ENUM ('pending', 'submitted', 'verified', 'failed', 'cancelled');

-- Create eTIMS submissions table to track invoice submissions to KRA
CREATE TABLE public.etims_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- eTIMS response data
  control_unit_number TEXT,
  control_unit_date TIMESTAMP WITH TIME ZONE,
  qr_code_url TEXT,
  receipt_number TEXT,
  fiscal_code TEXT,
  
  -- Submission details
  status etims_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Request/response data for debugging
  request_payload JSONB,
  response_payload JSONB,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etims_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own eTIMS submissions"
ON public.etims_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own eTIMS submissions"
ON public.etims_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own eTIMS submissions"
ON public.etims_submissions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add eTIMS-related columns to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS etims_status etims_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS etims_control_number TEXT,
ADD COLUMN IF NOT EXISTS etims_qr_code TEXT,
ADD COLUMN IF NOT EXISTS customer_kra_pin TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_etims_submissions_updated_at
BEFORE UPDATE ON public.etims_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_etims_submissions_invoice_id ON public.etims_submissions(invoice_id);
CREATE INDEX idx_etims_submissions_user_id ON public.etims_submissions(user_id);
CREATE INDEX idx_etims_submissions_status ON public.etims_submissions(status);