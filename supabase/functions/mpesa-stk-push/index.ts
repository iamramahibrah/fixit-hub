import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
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
  console.log("Access token obtained successfully");
  return data.access_token;
}

function formatPhoneNumber(phone: string): string {
  // Remove any spaces or special characters
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  
  // Handle different formats
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("+254")) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  
  return cleaned;
}

async function initiateSTKPush(
  accessToken: string,
  credentials: MpesaCredentials,
  request: STKPushRequest
): Promise<any> {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  
  const password = btoa(
    `${credentials.shortcode}${credentials.passkey}${timestamp}`
  );

  const formattedPhone = formatPhoneNumber(request.phoneNumber);
  const callbackUrl = `https://ktbtrrnjveinuatoamzy.supabase.co/functions/v1/mpesa-callback`;

  const payload = {
    BusinessShortCode: credentials.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(request.amount),
    PartyA: formattedPhone,
    PartyB: credentials.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: request.accountReference || "Payment",
    TransactionDesc: request.transactionDesc || "Payment",
  };

  console.log("Initiating STK Push with payload:", JSON.stringify({
    ...payload,
    Password: "[REDACTED]"
  }));

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
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
  console.log("STK Push response:", JSON.stringify(data));
  
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
        JSON.stringify({ error: "M-Pesa credentials not configured. Please add your Daraja API keys in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials: MpesaCredentials = {
      consumerKey: profile.mpesa_consumer_key,
      consumerSecret: profile.mpesa_consumer_secret,
      shortcode: profile.mpesa_shortcode,
      passkey: profile.mpesa_passkey,
    };

    const requestBody: STKPushRequest = await req.json();
    
    if (!requestBody.phoneNumber || !requestBody.amount) {
      return new Response(
        JSON.stringify({ error: "Phone number and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing STK Push for user ${user.id}: ${requestBody.phoneNumber}, KES ${requestBody.amount}`);

    // Get access token
    const accessToken = await getAccessToken(credentials);

    // Initiate STK Push
    const stkResponse = await initiateSTKPush(accessToken, credentials, requestBody);

    if (stkResponse.ResponseCode === "0") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "STK Push sent successfully. Check your phone for the payment prompt.",
          checkoutRequestId: stkResponse.CheckoutRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: stkResponse.errorMessage || stkResponse.ResponseDescription || "STK Push failed",
          details: stkResponse,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error in mpesa-stk-push:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
