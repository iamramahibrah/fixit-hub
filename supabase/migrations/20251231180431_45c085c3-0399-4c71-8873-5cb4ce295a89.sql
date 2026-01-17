-- Add Pesapal API key columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pesapal_consumer_key text,
ADD COLUMN pesapal_consumer_secret text;