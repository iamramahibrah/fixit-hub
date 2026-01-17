import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// KRA GavaConnect API base URL
const KRA_API_BASE_URL = 'https://api.kra.go.ke/v1';

interface KraApiRequest {
  action: 'verify_pin' | 'check_tcc' | 'nil_filing' | 'get_obligations';
  pin?: string;
  taxPeriod?: string;
  obligationType?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract JWT from authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Get current user using the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ code: 401, message: 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's KRA API credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('kra_api_key, kra_api_secret, kra_pin, business_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.kra_api_key || !profile.kra_api_secret) {
      return new Response(
        JSON.stringify({ 
          error: 'KRA API credentials not configured',
          message: 'Please add your KRA GavaConnect API key and secret in Settings'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, pin, taxPeriod, obligationType }: KraApiRequest = await req.json();

    console.log(`KRA API action: ${action} for user: ${user.id}`);

    // Get OAuth token from KRA
    const tokenResponse = await fetch(`${KRA_API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${profile.kra_api_key}:${profile.kra_api_secret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('KRA OAuth error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to authenticate with KRA',
          details: 'Invalid API credentials or KRA service unavailable'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let result;

    switch (action) {
      case 'verify_pin':
        // Verify a KRA PIN
        const pinToVerify = pin || profile.kra_pin;
        if (!pinToVerify) {
          return new Response(
            JSON.stringify({ error: 'No PIN provided for verification' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pinResponse = await fetch(`${KRA_API_BASE_URL}/pin/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin: pinToVerify })
        });

        result = await pinResponse.json();
        console.log('PIN verification result:', result);
        break;

      case 'check_tcc':
        // Check Tax Compliance Certificate status
        const tccPin = pin || profile.kra_pin;
        if (!tccPin) {
          return new Response(
            JSON.stringify({ error: 'No PIN provided for TCC check' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tccResponse = await fetch(`${KRA_API_BASE_URL}/tcc/status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin: tccPin })
        });

        result = await tccResponse.json();
        console.log('TCC check result:', result);
        break;

      case 'nil_filing':
        // Submit nil return
        if (!taxPeriod || !obligationType) {
          return new Response(
            JSON.stringify({ error: 'Tax period and obligation type required for nil filing' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const filingResponse = await fetch(`${KRA_API_BASE_URL}/filing/nil`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pin: profile.kra_pin,
            taxPeriod,
            obligationType,
            businessName: profile.business_name
          })
        });

        result = await filingResponse.json();
        console.log('Nil filing result:', result);
        break;

      case 'get_obligations':
        // Get tax obligations
        const obligationsResponse = await fetch(`${KRA_API_BASE_URL}/obligations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin: profile.kra_pin })
        });

        result = await obligationsResponse.json();
        console.log('Obligations result:', result);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('KRA API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
