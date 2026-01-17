-- Create payment transactions table to track all subscription payments
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method TEXT NOT NULL, -- 'mpesa', 'card', 'pesapal'
  payment_reference TEXT, -- M-Pesa receipt, Stripe payment intent, etc.
  transaction_id TEXT, -- External transaction ID
  subscription_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional payment details
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment transactions
CREATE POLICY "Users can view their own payments"
ON public.payment_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payment transactions
CREATE POLICY "Admins can view all payments"
ON public.payment_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (for webhooks)
CREATE POLICY "Service can insert payments"
ON public.payment_transactions
FOR INSERT
WITH CHECK (true);

-- Service role can update (for webhooks)
CREATE POLICY "Service can update payments"
ON public.payment_transactions
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions(payment_reference);