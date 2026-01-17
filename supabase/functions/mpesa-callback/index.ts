import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const callback = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(callback, null, 2));

    const stkCallback = callback?.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error("Invalid callback format");
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Invalid callback format" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resultCode = stkCallback.ResultCode;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      
      const metadata: Record<string, any> = {};
      callbackMetadata.forEach((item: { Name: string; Value: any }) => {
        metadata[item.Name] = item.Value;
      });

      console.log("Payment successful:", {
        checkoutRequestId,
        merchantRequestId,
        amount: metadata.Amount,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        phoneNumber: metadata.PhoneNumber,
        transactionDate: metadata.TransactionDate,
      });

      // Parse the account reference to get user_id and plan
      // Expected format: SUB_{user_id}_{plan}
      const accountRef = merchantRequestId || '';
      const parts = accountRef.split('_');
      const userId = parts[1] || null;
      const plan = parts[2] || 'business';

      if (userId) {
        // Insert payment transaction record
        const { error: insertError } = await supabase
          .from('payment_transactions')
          .insert({
            user_id: userId,
            amount: metadata.Amount,
            currency: 'KES',
            payment_method: 'mpesa',
            payment_reference: metadata.MpesaReceiptNumber,
            transaction_id: checkoutRequestId,
            subscription_plan: plan,
            status: 'completed',
            metadata: {
              phoneNumber: metadata.PhoneNumber,
              transactionDate: metadata.TransactionDate,
              merchantRequestId,
              checkoutRequestId,
            },
          });

        if (insertError) {
          console.error("Error inserting payment transaction:", insertError);
        } else {
          console.log("Payment transaction recorded successfully");
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
          console.error("Error updating subscription:", updateError);
        } else {
          console.log("Subscription updated successfully for user:", userId);
        }
      }
    } else {
      // Payment failed or cancelled
      console.log("Payment failed or cancelled:", {
        checkoutRequestId,
        merchantRequestId,
        resultCode,
        resultDesc: stkCallback.ResultDesc,
      });

      // Record failed payment attempt
      const accountRef = merchantRequestId || '';
      const parts = accountRef.split('_');
      const userId = parts[1] || null;
      const plan = parts[2] || 'business';

      if (userId) {
        await supabase
          .from('payment_transactions')
          .insert({
            user_id: userId,
            amount: 0,
            currency: 'KES',
            payment_method: 'mpesa',
            transaction_id: checkoutRequestId,
            subscription_plan: plan,
            status: 'failed',
            metadata: {
              resultCode,
              resultDesc: stkCallback.ResultDesc,
              merchantRequestId,
              checkoutRequestId,
            },
          });
      }
    }

    // Always return success to M-Pesa
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing M-Pesa callback:", error);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
