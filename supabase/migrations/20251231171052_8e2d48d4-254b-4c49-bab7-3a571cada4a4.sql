-- Add columns for Stripe and M-Pesa API credentials
ALTER TABLE public.profiles
ADD COLUMN stripe_publishable_key text,
ADD COLUMN stripe_secret_key text,
ADD COLUMN mpesa_consumer_key text,
ADD COLUMN mpesa_consumer_secret text,
ADD COLUMN mpesa_shortcode text,
ADD COLUMN mpesa_passkey text;