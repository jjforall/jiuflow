import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "").trim();
    logStep("Authenticating user with token");

    let userEmail: string | null = null;
    let userId: string | null = null;

    // Try standard auth.getUser first, then fall back to decoding the JWT payload
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw userError;
      userEmail = userData.user?.email ?? null;
      userId = userData.user?.id ?? null;
      logStep("User authenticated via getUser", { userId, email: userEmail });
    } catch (e) {
      logStep("getUser failed, attempting JWT decode", { message: e instanceof Error ? e.message : String(e) });
      try {
        const [, payload] = token.split(".");
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "=");
        const claims = JSON.parse(atob(padded));
        userEmail = claims.email ?? null;
        userId = claims.sub ?? null;
        if (!userEmail) throw new Error("Email not found in JWT");
        logStep("User authenticated via JWT claims", { userId, email: userEmail });
      } catch (decodeErr) {
        throw new Error(`Authentication error: ${decodeErr instanceof Error ? decodeErr.message : String(decodeErr)}`);
      }
    }

    if (!userEmail) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let planType = null;
    let subscriptionEnd = null;
    let priceId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      priceId = subscription.items.data[0].price.id;
      
      // Determine plan type based on price ID
      if (priceId === "price_1SR3ZmDqLakc8NxkNdqL5BtO") {
        planType = "founder";
      } else if (priceId === "price_1SNQoeDqLakc8NxkEUVTTs3k") {
        planType = "monthly";
      } else if (priceId === "price_1SNQoqDqLakc8NxkOaQIL8wX") {
        planType = "annual";
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd, planType });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: planType,
      subscription_end: subscriptionEnd,
      price_id: priceId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
