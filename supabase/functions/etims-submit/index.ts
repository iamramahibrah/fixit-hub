import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// KRA eTIMS API base URL (production)
const ETIMS_API_BASE_URL = 'https://etims.kra.go.ke/api/v1';

interface EtimsInvoiceItem {
  itemSeq: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

interface EtimsInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPin: string | null;
  items: EtimsInvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentMethod: string;
}

interface RequestBody {
  action: 'submit_invoice' | 'verify_submission' | 'cancel_invoice' | 'get_status';
  invoiceId?: string;
  submissionId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile with KRA credentials
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
          message: 'Please add your KRA eTIMS API key and secret in Settings'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, invoiceId, submissionId }: RequestBody = await req.json();
    console.log(`eTIMS action: ${action} for user: ${user.id}`);

    // Get OAuth token from KRA eTIMS
    let accessToken: string;
    try {
      const tokenResponse = await fetch(`${ETIMS_API_BASE_URL}/oauth/token`, {
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
            error: 'Failed to authenticate with KRA eTIMS',
            details: 'Invalid API credentials or KRA service unavailable'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
    } catch (error) {
      console.error('KRA token fetch error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'KRA eTIMS service unavailable',
          details: 'Could not connect to KRA eTIMS API'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'submit_invoice': {
        if (!invoiceId) {
          return new Response(
            JSON.stringify({ error: 'Invoice ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch invoice details
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('user_id', user.id)
          .single();

        if (invoiceError || !invoice) {
          console.error('Invoice fetch error:', invoiceError);
          return new Response(
            JSON.stringify({ error: 'Invoice not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already submitted
        const { data: existingSubmission } = await supabase
          .from('etims_submissions')
          .select('id, status')
          .eq('invoice_id', invoiceId)
          .in('status', ['submitted', 'verified'])
          .single();

        if (existingSubmission) {
          return new Response(
            JSON.stringify({ 
              error: 'Invoice already submitted to eTIMS',
              submissionId: existingSubmission.id,
              status: existingSubmission.status
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Parse invoice items
        const items = invoice.items as Array<{description: string; quantity: number; unitPrice: number; total: number}>;
        
        // Prepare eTIMS payload
        const etimsPayload = {
          traderSystemInvoiceNumber: invoice.invoice_number,
          invoiceDate: new Date(invoice.created_at).toISOString().split('T')[0],
          invoiceTime: new Date(invoice.created_at).toISOString().split('T')[1].split('.')[0],
          buyerName: invoice.customer_name,
          buyerPin: invoice.customer_kra_pin || null,
          buyerPhoneNumber: invoice.customer_phone || null,
          buyerEmail: invoice.customer_email || null,
          paymentType: invoice.payment_method === 'mpesa' ? 'MOBILE_MONEY' : 'CASH',
          taxableAmount: invoice.subtotal,
          vatAmount: invoice.vat_amount,
          totalAmount: invoice.total,
          items: items.map((item, index) => ({
            itemSequence: index + 1,
            itemDescription: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxableAmount: item.total,
            vatRate: 16,
            vatAmount: item.total * 0.16,
            totalAmount: item.total * 1.16
          })),
          sellerPin: profile.kra_pin,
          sellerName: profile.business_name
        };

        // Create submission record (pending)
        const { data: submission, error: submissionError } = await supabase
          .from('etims_submissions')
          .insert({
            user_id: user.id,
            invoice_id: invoiceId,
            status: 'pending',
            request_payload: etimsPayload
          })
          .select()
          .single();

        if (submissionError) {
          console.error('Submission record error:', submissionError);
          return new Response(
            JSON.stringify({ error: 'Failed to create submission record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Submit to eTIMS API
        try {
          const etimsResponse = await fetch(`${ETIMS_API_BASE_URL}/invoice/submit`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(etimsPayload)
          });

          const etimsResult = await etimsResponse.json();
          console.log('eTIMS response:', etimsResult);

          if (etimsResponse.ok && etimsResult.success) {
            // Update submission with success data
            await supabase
              .from('etims_submissions')
              .update({
                status: 'submitted',
                control_unit_number: etimsResult.controlUnitNumber,
                control_unit_date: etimsResult.controlUnitDate,
                qr_code_url: etimsResult.qrCodeUrl,
                receipt_number: etimsResult.receiptNumber,
                fiscal_code: etimsResult.fiscalCode,
                response_payload: etimsResult,
                submitted_at: new Date().toISOString()
              })
              .eq('id', submission.id);

            // Update invoice with eTIMS data
            await supabase
              .from('invoices')
              .update({
                etims_status: 'submitted',
                etims_control_number: etimsResult.controlUnitNumber,
                etims_qr_code: etimsResult.qrCodeUrl
              })
              .eq('id', invoiceId);

            result = {
              success: true,
              submissionId: submission.id,
              controlUnitNumber: etimsResult.controlUnitNumber,
              qrCodeUrl: etimsResult.qrCodeUrl,
              message: 'Invoice successfully submitted to KRA eTIMS'
            };
          } else {
            // Update submission with error
            await supabase
              .from('etims_submissions')
              .update({
                status: 'failed',
                error_message: etimsResult.message || 'eTIMS submission failed',
                response_payload: etimsResult,
                retry_count: 1
              })
              .eq('id', submission.id);

            await supabase
              .from('invoices')
              .update({ etims_status: 'failed' })
              .eq('id', invoiceId);

            result = {
              success: false,
              submissionId: submission.id,
              error: etimsResult.message || 'eTIMS submission failed',
              canRetry: true
            };
          }
        } catch (apiError) {
          console.error('eTIMS API error:', apiError);
          
          // Update submission with error
          await supabase
            .from('etims_submissions')
            .update({
              status: 'failed',
              error_message: 'Failed to connect to KRA eTIMS API',
              retry_count: 1
            })
            .eq('id', submission.id);

          result = {
            success: false,
            submissionId: submission.id,
            error: 'Failed to connect to KRA eTIMS API',
            canRetry: true
          };
        }
        break;
      }

      case 'get_status': {
        if (!invoiceId && !submissionId) {
          return new Response(
            JSON.stringify({ error: 'Invoice ID or Submission ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let query = supabase
          .from('etims_submissions')
          .select('*')
          .eq('user_id', user.id);

        if (submissionId) {
          query = query.eq('id', submissionId);
        } else if (invoiceId) {
          query = query.eq('invoice_id', invoiceId);
        }

        const { data: submissions, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Status fetch error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch submission status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { submissions };
        break;
      }

      case 'verify_submission': {
        if (!submissionId) {
          return new Response(
            JSON.stringify({ error: 'Submission ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get submission
        const { data: submission, error: subError } = await supabase
          .from('etims_submissions')
          .select('*')
          .eq('id', submissionId)
          .eq('user_id', user.id)
          .single();

        if (subError || !submission) {
          return new Response(
            JSON.stringify({ error: 'Submission not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify with KRA
        const verifyResponse = await fetch(`${ETIMS_API_BASE_URL}/invoice/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            controlUnitNumber: submission.control_unit_number,
            receiptNumber: submission.receipt_number
          })
        });

        const verifyResult = await verifyResponse.json();

        if (verifyResponse.ok && verifyResult.verified) {
          await supabase
            .from('etims_submissions')
            .update({
              status: 'verified',
              verified_at: new Date().toISOString(),
              response_payload: verifyResult
            })
            .eq('id', submissionId);

          await supabase
            .from('invoices')
            .update({ etims_status: 'verified' })
            .eq('id', submission.invoice_id);

          result = { success: true, verified: true, message: 'Invoice verified with KRA' };
        } else {
          result = { success: false, verified: false, message: verifyResult.message || 'Verification pending' };
        }
        break;
      }

      case 'cancel_invoice': {
        if (!submissionId) {
          return new Response(
            JSON.stringify({ error: 'Submission ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get submission
        const { data: submission, error: subError } = await supabase
          .from('etims_submissions')
          .select('*')
          .eq('id', submissionId)
          .eq('user_id', user.id)
          .single();

        if (subError || !submission) {
          return new Response(
            JSON.stringify({ error: 'Submission not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancel with KRA
        const cancelResponse = await fetch(`${ETIMS_API_BASE_URL}/invoice/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            controlUnitNumber: submission.control_unit_number,
            cancellationReason: 'Invoice cancelled by user'
          })
        });

        const cancelResult = await cancelResponse.json();

        if (cancelResponse.ok && cancelResult.cancelled) {
          await supabase
            .from('etims_submissions')
            .update({
              status: 'cancelled',
              response_payload: cancelResult
            })
            .eq('id', submissionId);

          await supabase
            .from('invoices')
            .update({ etims_status: 'cancelled' })
            .eq('id', submission.invoice_id);

          result = { success: true, message: 'Invoice cancelled with KRA' };
        } else {
          result = { success: false, error: cancelResult.message || 'Cancellation failed' };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('eTIMS API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
