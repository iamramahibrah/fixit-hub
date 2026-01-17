-- Add Paystack columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paystack_public_key TEXT,
ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT;

-- Optionally remove old Pesapal columns (comment out if you want to keep them)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS pesapal_consumer_key;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS pesapal_consumer_secret;