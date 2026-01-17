import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Paystack API URL
const PAYSTACK_API_URL = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    channel: string;
    customer: {
      email: string;
      phone: string;
    };
    metadata: Record<string, any>;
  };
}

// Initialize a transaction
async function initializeTransaction(
  secretKey: string,
  email: string,
  amount: number, // in kobo (smallest currency unit)
  reference: string,
  callbackUrl: string,
  metadata?: Record<string, any>
): Promise<PaystackInitializeResponse> {
  console.log('Initializing Paystack transaction:', reference);

  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount, // Amount in kobo (for NGN) or cents (for other currencies)
      reference,
      callback_url: callbackUrl,
      metadata,
    }),
  });

  const data: PaystackInitializeResponse = await response.json();
  console.log('Initialize response:', data.status, data.message);

  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize transaction');
  }

  return data;
}

// Verify a transaction
async function verifyTransaction(
  secretKey: string,
  reference: string
): Promise<PaystackVerifyResponse> {
  console.log('Verifying Paystack transaction:', reference);

  const response = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data: PaystackVerifyResponse = await response.json();
  console.log('Verify response:', data.status, data.message);

  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, userId, ...params } = await req.json();
    console.log('Paystack action:', action, 'userId:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user's Paystack credentials from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('paystack_secret_key, paystack_public_key, business_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile.paystack_secret_key) {
      throw new Error('Paystack API credentials not configured. Please add your Paystack Secret Key in Settings.');
    }

    let result: any;

    switch (action) {
      case 'initiate_payment': {
        const {
          amount,
          currency = 'KES',
          description,
          reference,
          customerEmail,
          customerPhone,
          customerName,
          callbackUrl,
        } = params;

        if (!amount || !description || !reference) {
          throw new Error('Amount, description, and reference are required');
        }

        // Paystack expects amount in the smallest currency unit
        // For KES, it's cents (1 KES = 100 cents)
        const amountInSmallestUnit = Math.round(amount * 100);

        const email = customerEmail || profile.email || 'customer@example.com';

        const initResponse = await initializeTransaction(
          profile.paystack_secret_key,
          email,
          amountInSmallestUnit,
          reference,
          callbackUrl || `${supabaseUrl}/functions/v1/paystack-callback`,
          {
            description,
            customer_name: customerName,
            customer_phone: customerPhone,
            user_id: userId,
          }
        );

        result = {
          success: true,
          reference: initResponse.data?.reference,
          accessCode: initResponse.data?.access_code,
          redirectUrl: initResponse.data?.authorization_url,
          message: 'Payment initiated successfully. Redirect customer to the payment page.',
        };
        break;
      }

      case 'verify_payment':
      case 'check_status': {
        const { reference: txReference } = params;

        if (!txReference) {
          throw new Error('Transaction reference is required');
        }

        const verifyResponse = await verifyTransaction(profile.paystack_secret_key, txReference);

        if (!verifyResponse.status || !verifyResponse.data) {
          result = {
            success: false,
            status: 'failed',
            message: verifyResponse.message || 'Transaction not found',
          };
        } else {
          result = {
            success: true,
            status: verifyResponse.data.status,
            amount: verifyResponse.data.amount / 100, // Convert back from smallest unit
            currency: verifyResponse.data.currency,
            reference: verifyResponse.data.reference,
            paidAt: verifyResponse.data.paid_at,
            channel: verifyResponse.data.channel,
            customer: verifyResponse.data.customer,
            message: verifyResponse.message,
          };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Supported actions: initiate_payment, verify_payment, check_status`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Paystack error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
