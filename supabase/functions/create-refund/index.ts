import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    logStep("Authorization header found");
    
    // Create Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user identity using the anon client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Authentication failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Use service role client for admin check
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin role using service role client
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      logStep("Admin check failed", { error: roleError?.message });
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }
    logStep("Admin verified");

    // Get refund details from request body
    const { subscriptionId, amount, reason } = await req.json();
    if (!subscriptionId) {
      logStep("No subscription ID provided");
      return new Response(JSON.stringify({ error: 'Subscription ID is required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    logStep("Processing refund", { subscriptionId, amount, reason });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("Stripe key not found");
      return new Response(JSON.stringify({ error: 'Stripe configuration error' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Get the subscription to find the latest payment
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    logStep("Subscription retrieved", { 
      id: subscription.id, 
      latestInvoice: subscription.latest_invoice 
    });

    if (!subscription.latest_invoice) {
      throw new Error("No invoice found for this subscription");
    }

    // Get the invoice to find the payment intent
    const invoice = await stripe.invoices.retrieve(
      typeof subscription.latest_invoice === 'string' 
        ? subscription.latest_invoice 
        : subscription.latest_invoice.id
    );
    logStep("Invoice retrieved", { 
      id: invoice.id, 
      paymentIntent: invoice.payment_intent 
    });

    if (!invoice.payment_intent) {
      throw new Error("No payment intent found for this invoice");
    }

    // Create refund
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: typeof invoice.payment_intent === 'string' 
        ? invoice.payment_intent 
        : invoice.payment_intent.id,
    };

    // Add amount if specified (in cents/minor currency units)
    if (amount && amount > 0) {
      refundParams.amount = amount;
    }

    // Add reason if specified
    if (reason) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(refundParams);
    logStep("Refund created", { 
      id: refund.id, 
      amount: refund.amount, 
      status: refund.status 
    });

    return new Response(JSON.stringify({ 
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error creating refund:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
