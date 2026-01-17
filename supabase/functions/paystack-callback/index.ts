import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Paystack API URL for verification
const PAYSTACK_API_URL = 'https://api.paystack.co';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the callback data - Paystack sends via GET params on redirect
    let reference: string | null = null;
    let trxref: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      reference = url.searchParams.get('reference');
      trxref = url.searchParams.get('trxref');
    } else if (req.method === 'POST') {
      // Webhook events from Paystack
      const body = await req.json();
      console.log('Paystack webhook received:', body.event);

      if (body.event === 'charge.success' && body.data) {
        reference = body.data.reference;
      }
    }

    const txReference = reference || trxref;

    console.log('Paystack callback received:', { reference: txReference });

    if (!txReference) {
      console.error('Missing reference in callback');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing transaction reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse reference for subscription payments
    // Expected format: SUB_{user_id}_{plan}_{timestamp}
    if (txReference.startsWith('SUB_')) {
      const parts = txReference.split('_');
      const userId = parts[1];
      const plan = parts[2] || 'business';

      // Get user's Paystack secret key to verify
      const { data: profile } = await supabase
        .from('profiles')
        .select('paystack_secret_key')
        .eq('user_id', userId)
        .single();

      if (profile?.paystack_secret_key) {
        // Verify the transaction
        const verifyResponse = await fetch(
          `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(txReference)}`,
          {
            headers: {
              'Authorization': `Bearer ${profile.paystack_secret_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const verifyData = await verifyResponse.json();
        console.log('Verification response:', verifyData.status, verifyData.data?.status);

        if (verifyData.status && verifyData.data?.status === 'success') {
          const amount = verifyData.data.amount / 100; // Convert from smallest unit

          // Insert payment transaction record
          const { error: insertError } = await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: amount,
              currency: verifyData.data.currency || 'KES',
              payment_method: 'paystack',
              payment_reference: txReference,
              transaction_id: verifyData.data.id?.toString(),
              subscription_plan: plan,
              status: 'completed',
              metadata: {
                reference: txReference,
                channel: verifyData.data.channel,
                paid_at: verifyData.data.paid_at,
              },
            });

          if (insertError) {
            console.error('Error inserting payment transaction:', insertError);
          } else {
            console.log('Payment transaction recorded successfully');
          }

          // Update user subscription
          const subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_plan: plan,
              subscription_status: 'active',
              subscription_ends_at: subscriptionEndDate.toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
          } else {
            console.log('Subscription updated successfully for user:', userId);
          }
        } else {
          // Record failed payment
          await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: 0,
              currency: 'KES',
              payment_method: 'paystack',
              payment_reference: txReference,
              subscription_plan: plan,
              status: 'failed',
              metadata: {
                reference: txReference,
                verification_status: verifyData.data?.status || 'unknown',
              },
            });
        }
      }
    }

    // Handle invoice payments
    // Expected format: INV-XXXXX
    if (txReference.startsWith('INV-')) {
      // Get the invoice to find the user and their Paystack key
      const { data: invoice } = await supabase
        .from('invoices')
        .select('user_id')
        .eq('invoice_number', txReference)
        .single();

      if (invoice) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('paystack_secret_key')
          .eq('user_id', invoice.user_id)
          .single();

        if (profile?.paystack_secret_key) {
          const verifyResponse = await fetch(
            `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(txReference)}`,
            {
              headers: {
                'Authorization': `Bearer ${profile.paystack_secret_key}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const verifyData = await verifyResponse.json();

          if (verifyData.status && verifyData.data?.status === 'success') {
            const { error: updateError } = await supabase
              .from('invoices')
              .update({ status: 'paid' })
              .eq('invoice_number', txReference);

            if (updateError) {
              console.error('Error updating invoice:', updateError);
            } else {
              console.log('Invoice marked as paid:', txReference);
            }
          }
        }
      }
    }

    // Return success response
    // For GET requests (redirects), you might want to redirect to a success page
    if (req.method === 'GET') {
      // Redirect to app payment success page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '/'}/payment-success?reference=${txReference}`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        reference: txReference,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Paystack callback error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
