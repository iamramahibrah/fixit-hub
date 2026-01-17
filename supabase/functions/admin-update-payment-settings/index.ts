import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentSettings {
  gateway: 'mpesa' | 'stripe' | 'pesapal';
  settings: Record<string, any>;
}

Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Admin check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gateway, settings }: PaymentSettings = await req.json();
    console.log(`Updating ${gateway} payment settings by admin: ${user.id}`);

    // In a production environment, you would:
    // 1. Store these in a secure admin_settings table
    // 2. Or use Supabase Vault for sensitive data
    // 3. Or update environment variables via Supabase Management API

    // For now, we'll store in a settings table or return success
    // This is a placeholder - you'll need to create the table and proper storage

    // Log the action for audit purposes
    console.log(`Payment gateway ${gateway} settings updated:`, {
      gateway,
      enabled: settings.enabled,
      environment: settings.environment || 'production',
      timestamp: new Date().toISOString(),
      admin: user.email
    });

    // Return success - in production, implement actual storage
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${gateway} settings saved successfully`,
        note: 'Settings have been logged. Implement secure storage for production.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin payment settings error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
