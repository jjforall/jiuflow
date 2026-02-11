import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    const { email, sessionId } = await req.json();
    logStep("Request received", { email, sessionId });
    
    let customerEmail = email;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    logStep("Stripe initialized");

    // If sessionId is provided, get email from Stripe session
    if (sessionId) {
      logStep("Retrieving session", { sessionId });
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      logStep("Session retrieved", { 
        customer_email: session.customer_email,
        customer: session.customer,
        status: session.status,
        payment_status: session.payment_status
      });
      
      // Try to get email from session
      if (session.customer_email) {
        customerEmail = session.customer_email;
        logStep("Email from session.customer_email", { customerEmail });
      } else if (session.customer) {
        // Get customer details from Stripe
        const customer = await stripe.customers.retrieve(session.customer as string);
        if ('email' in customer && customer.email) {
          customerEmail = customer.email;
          logStep("Email from customer object", { customerEmail });
        }
      }
      
      if (!customerEmail) {
        logStep("ERROR: No email found in session");
        return new Response(
          JSON.stringify({ 
            error: "no_email",
            message: "セッションからメールアドレスを取得できませんでした。"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!customerEmail) {
      logStep("ERROR: No email provided");
      return new Response(
        JSON.stringify({ error: "Email or sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Checking payment for email", { email: customerEmail });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ 
      email: customerEmail.toLowerCase().trim(), 
      limit: 1 
    });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found", { email: customerEmail });
      return new Response(
        JSON.stringify({ 
          error: "payment_not_found",
          message: "決済が見つかりませんでした。先に決済を完了してください。"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscription (including trialing status)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Filter for active or trialing subscriptions
    const activeSubscriptions = subscriptions.data.filter(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 10,
    });

    const hasActiveSubscription = activeSubscriptions.length > 0;
    const hasSuccessfulPayment = charges.data.some((charge: Stripe.Charge) => charge.status === "succeeded");

    logStep("Payment check results", { 
      hasActiveSubscription, 
      hasSuccessfulPayment,
      subscriptionStatuses: subscriptions.data.map((s: Stripe.Subscription) => s.status)
    });

    // Allow if either has active/trialing subscription OR successful payment
    if (!hasActiveSubscription && !hasSuccessfulPayment) {
      logStep("ERROR: No valid payment or subscription found");
      return new Response(
        JSON.stringify({ 
          error: "payment_not_completed",
          message: "決済がまだ完了していません。先に決済を完了してください。"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment is valid, send magic link
    logStep("Payment verified, preparing to send magic link", { email: customerEmail });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const emailToUse = customerEmail.toLowerCase().trim();
    logStep("Sending magic link", { email: emailToUse });

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: emailToUse,
      options: {
        emailRedirectTo: `https://jitsuflow.app/map`,
      },
    });

    if (magicLinkError) {
      logStep("ERROR sending magic link", { error: magicLinkError.message });
      return new Response(
        JSON.stringify({ error: magicLinkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Magic link sent successfully", { email: emailToUse });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "ログインリンクをメールで送信しました。メールを確認してください。",
        email: customerEmail
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in function", { error: message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
