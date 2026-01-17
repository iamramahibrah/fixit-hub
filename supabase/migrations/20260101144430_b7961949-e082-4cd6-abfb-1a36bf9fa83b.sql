-- Add KRA API key columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kra_api_key TEXT,
ADD COLUMN IF NOT EXISTS kra_api_secret TEXT;