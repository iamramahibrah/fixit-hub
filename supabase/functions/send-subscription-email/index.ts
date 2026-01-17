import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionEmailRequest {
  userId: string;
  planName: string;
  planKey: string;
  billingPeriod: 'monthly' | 'annual';
  price: number;
  features: string[];
}

const planBenefits: Record<string, string[]> = {
  starter: [
    '📊 Basic tax filing assistance',
    '🧾 Up to 100 invoices per month',
    '📱 Mobile-friendly dashboard',
    '📧 Email support',
  ],
  business: [
    '📊 Advanced tax filing with eTIMS integration',
    '🧾 Unlimited invoices',
    '📱 Full POS system access',
    '👥 Up to 5 staff accounts',
    '📈 Comprehensive reporting',
    '💬 Priority email & chat support',
  ],
  pro: [
    '🚀 Everything in Business, plus:',
    '👥 Unlimited staff accounts',
    '🔌 API access for integrations',
    '📊 Advanced analytics & insights',
    '🎯 Dedicated account manager',
    '📞 24/7 priority phone support',
    '⚡ Early access to new features',
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, planName, planKey, billingPeriod, price, features }: SubscriptionEmailRequest = await req.json();

    console.log('Sending subscription email for user:', userId, 'plan:', planName);

    // Get user email from profiles or auth
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, business_name')
      .eq('user_id', userId)
      .single();

    let userEmail: string = '';
    let businessName: string = 'Valued Customer';

    if (profile?.email) {
      userEmail = profile.email;
      businessName = profile.business_name || 'Valued Customer';
    } else {
      // Try getting email from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser?.user?.email) {
        console.error('Could not find user email:', profileError, authError);
        return new Response(
          JSON.stringify({ error: 'User email not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userEmail = authUser.user.email;
      businessName = authUser.user.user_metadata?.business_name || 'Valued Customer';
    }

    const planFeatures = features?.length > 0 ? features : (planBenefits[planKey] || planBenefits.starter);

    const formatPrice = (amount: number) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
      }).format(amount);
    };

    const featuresHtml = planFeatures.map(feature => 
      `<li style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${feature}</li>`
    ).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #059669; font-size: 28px; margin: 0;">🎉 Welcome to ${planName}!</h1>
    </div>
    
    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
      <!-- Green Banner -->
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Your upgrade is complete!</h2>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thank you for choosing KRA Assist</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi <strong>${businessName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Congratulations on upgrading to the <strong style="color: #059669;">${planName}</strong> plan! 
          Your subscription is now active and you have access to all the premium features.
        </p>
        
        <!-- Subscription Details -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 18px;">📋 Subscription Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Plan</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Billing</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${billingPeriod === 'annual' ? 'Annual' : 'Monthly'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">${formatPrice(price)}</td>
            </tr>
          </table>
        </div>
        
        <!-- Features -->
        <div style="margin: 25px 0;">
          <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 18px;">✨ Your Plan Benefits</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${featuresHtml}
          </ul>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://kenya-kra-buddy.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Go to Dashboard →
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
          If you have any questions about your subscription or need help getting started, 
          our support team is here to help. Just reply to this email!
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} KRA Assist. All rights reserved.<br>
          Kenya Revenue Authority Compliance Made Simple
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'KRA Assist <onboarding@resend.dev>',
      to: [userEmail],
      subject: `🎉 Welcome to ${planName} - Your Upgrade is Complete!`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-subscription-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
