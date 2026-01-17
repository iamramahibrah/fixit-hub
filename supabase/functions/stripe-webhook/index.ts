import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.text();
    const event = JSON.parse(body);

    console.log('Stripe webhook received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        // Extract metadata
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || 'business';
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        if (userId) {
          // Insert payment transaction record
          const { error: insertError } = await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: amount,
              currency: session.currency?.toUpperCase() || 'USD',
              payment_method: 'card',
              payment_reference: session.payment_intent,
              transaction_id: session.id,
              subscription_plan: plan,
              status: 'completed',
              metadata: {
                sessionId: session.id,
                paymentIntent: session.payment_intent,
                customerEmail: session.customer_email,
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
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);

        const userId = paymentIntent.metadata?.user_id;
        const plan = paymentIntent.metadata?.plan || 'business';

        if (userId) {
          await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency?.toUpperCase() || 'USD',
              payment_method: 'card',
              payment_reference: paymentIntent.id,
              transaction_id: paymentIntent.id,
              subscription_plan: plan,
              status: 'failed',
              metadata: {
                paymentIntentId: paymentIntent.id,
                failureMessage: paymentIntent.last_payment_error?.message,
              },
            });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);

        const userId = invoice.subscription_details?.metadata?.user_id;
        const plan = invoice.subscription_details?.metadata?.plan || 'business';

        if (userId) {
          // Insert payment transaction record
          await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
              currency: invoice.currency?.toUpperCase() || 'USD',
              payment_method: 'card',
              payment_reference: invoice.payment_intent,
              transaction_id: invoice.id,
              subscription_plan: plan,
              status: 'completed',
              metadata: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
              },
            });

          // Extend subscription
          const subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_ends_at: subscriptionEndDate.toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
