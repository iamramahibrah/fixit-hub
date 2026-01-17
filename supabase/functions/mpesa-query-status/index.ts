import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueryRequest {
  checkoutRequestId: string;
  expectedAmount?: number; // For amount verification
}

interface MpesaCredentials {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
}

async function getAccessToken(credentials: MpesaCredentials): Promise<string> {
  const auth = btoa(`${credentials.consumerKey}:${credentials.consumerSecret}`);
  
  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get access token:", errorText);
    throw new Error("Failed to get M-Pesa access token");
  }

  const data = await response.json();
  return data.access_token;
}

async function querySTKStatus(
  accessToken: string,
  credentials: MpesaCredentials,
  checkoutRequestId: string
): Promise<any> {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  
  const password = btoa(
    `${credentials.shortcode}${credentials.passkey}${timestamp}`
  );

  const payload = {
    BusinessShortCode: credentials.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  console.log("Querying STK status for:", checkoutRequestId);

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  console.log("STK Query response:", JSON.stringify(data));
  
  return data;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's M-Pesa credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("mpesa_consumer_key, mpesa_consumer_secret, mpesa_shortcode, mpesa_passkey")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.mpesa_consumer_key || !profile?.mpesa_consumer_secret || 
        !profile?.mpesa_shortcode || !profile?.mpesa_passkey) {
      return new Response(
        JSON.stringify({ error: "M-Pesa credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials: MpesaCredentials = {
      consumerKey: profile.mpesa_consumer_key,
      consumerSecret: profile.mpesa_consumer_secret,
      shortcode: profile.mpesa_shortcode,
      passkey: profile.mpesa_passkey,
    };

    const requestBody: QueryRequest = await req.json();
    
    if (!requestBody.checkoutRequestId) {
      return new Response(
        JSON.stringify({ error: "checkoutRequestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(credentials);

    // Query STK status
    const queryResponse = await querySTKStatus(accessToken, credentials, requestBody.checkoutRequestId);

    // Parse the response
    // ResultCode 0 = Success, 1032 = Request cancelled by user, 1037 = Timeout
    const resultCode = queryResponse.ResultCode;
    
    let status: 'pending' | 'success' | 'failed' | 'cancelled' = 'pending';
    let message = queryResponse.ResultDesc || 'Processing...';
    let mpesaReceiptNumber: string | null = null;
    let transactionAmount: number | null = null;
    let phoneNumber: string | null = null;
    let transactionDate: string | null = null;

    if (resultCode === '0' || resultCode === 0) {
      status = 'success';
      message = 'Payment successful';
      
      // Extract M-Pesa receipt details from callback metadata
      // The response may contain MpesaReceiptNumber in the callback data
      // For STK Push Query, the receipt is typically in the response or needs to be fetched from callback
      
      // Parse callback metadata items if available
      if (queryResponse.CallbackMetadata?.Item) {
        const items = queryResponse.CallbackMetadata.Item;
        for (const item of items) {
          if (item.Name === 'MpesaReceiptNumber') {
            mpesaReceiptNumber = item.Value;
          } else if (item.Name === 'Amount') {
            transactionAmount = Number(item.Value);
          } else if (item.Name === 'PhoneNumber') {
            phoneNumber = String(item.Value);
          } else if (item.Name === 'TransactionDate') {
            transactionDate = String(item.Value);
          }
        }
      }

      // Verify amount if expected amount was provided
      if (requestBody.expectedAmount && transactionAmount) {
        if (Math.abs(transactionAmount - requestBody.expectedAmount) > 0.01) {
          console.warn(`Amount mismatch: expected ${requestBody.expectedAmount}, got ${transactionAmount}`);
          // Still mark as success but log the discrepancy
        }
      }

      console.log(`Payment successful - Receipt: ${mpesaReceiptNumber}, Amount: ${transactionAmount}, Phone: ${phoneNumber}`);
    } else if (resultCode === '1032' || resultCode === 1032) {
      status = 'cancelled';
      message = 'Payment was cancelled by user';
    } else if (resultCode === '1037' || resultCode === 1037) {
      status = 'failed';
      message = 'Payment request timed out';
    } else if (resultCode === '1' || resultCode === 1) {
      // The request is still being processed
      status = 'pending';
      message = 'Waiting for payment...';
    } else if (resultCode !== undefined) {
      status = 'failed';
      message = queryResponse.ResultDesc || 'Payment failed';
    }

    return new Response(
      JSON.stringify({
        status,
        message,
        resultCode,
        checkoutRequestId: requestBody.checkoutRequestId,
        mpesaReceiptNumber,
        transactionAmount,
        phoneNumber,
        transactionDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in mpesa-query-status:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
