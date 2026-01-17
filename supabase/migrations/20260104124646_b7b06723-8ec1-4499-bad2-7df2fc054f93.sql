-- Add 'cashier' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

-- Create a table to track POS sessions for cashier shift reporting
CREATE TABLE public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  opening_cash NUMERIC(12,2) DEFAULT 0,
  closing_cash NUMERIC(12,2),
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for pos_sessions
CREATE POLICY "Users can view their own pos sessions"
ON public.pos_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own pos sessions"
ON public.pos_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pos sessions"
ON public.pos_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add cashier_id to transactions for tracking who made the sale
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

-- Add index for performance on date-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON public.transactions(cashier_id);