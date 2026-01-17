-- Add payment_reference and payment_method columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_reference text;

-- Add an index for efficient lookup of M-Pesa transactions by reference
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON public.transactions(payment_reference) WHERE payment_reference IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.transactions.payment_reference IS 'M-Pesa transaction receipt number or other payment reference';
COMMENT ON COLUMN public.transactions.payment_method IS 'Payment method used: cash, mpesa, card, etc.';