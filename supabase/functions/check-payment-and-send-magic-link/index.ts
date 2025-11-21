import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking payment for email:", email);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ 
      email: email.toLowerCase().trim(), 
      limit: 1 
    });

    if (customers.data.length === 0) {
      console.log("No Stripe customer found for:", email);
      return new Response(
        JSON.stringify({ 
          error: "payment_not_found",
          message: "決済が見つかりませんでした。先に決済を完了してください。"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers.data[0].id;
    console.log("Found Stripe customer:", customerId);

    // Check for active subscription or successful payment
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 10,
    });

    const hasActiveSubscription = subscriptions.data.length > 0;
    const hasSuccessfulPayment = charges.data.some((charge: Stripe.Charge) => charge.status === "succeeded");

    console.log("Has active subscription:", hasActiveSubscription);
    console.log("Has successful payment:", hasSuccessfulPayment);

    if (!hasActiveSubscription && !hasSuccessfulPayment) {
      return new Response(
        JSON.stringify({ 
          error: "payment_not_completed",
          message: "決済がまだ完了していません。先に決済を完了してください。"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment is valid, send magic link
    console.log("Payment verified, sending magic link to:", email);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${req.headers.get("origin")}/map`,
      },
    });

    if (magicLinkError) {
      console.error("Error sending magic link:", magicLinkError);
      return new Response(
        JSON.stringify({ error: magicLinkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Magic link sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "ログインリンクをメールで送信しました。メールを確認してください。"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in check-payment-and-send-magic-link:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
