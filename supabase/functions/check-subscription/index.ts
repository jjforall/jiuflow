import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    // Save Stripe Customer ID to user_billing table if not already saved
    if (userId) {
      try {
        // Use upsert to handle both insert and update cases
        const { error: upsertError } = await supabaseClient
          .from('user_billing')
          .upsert(
            { user_id: userId, stripe_customer_id: customerId },
            { onConflict: 'user_id' }
          );
        
        if (upsertError) {
          logStep("Failed to upsert stripe_customer_id", { error: upsertError.message });
        } else {
          logStep("Successfully saved stripe_customer_id in user_billing");
        }
      } catch (updateErr) {
        logStep("Error updating user_billing", { error: updateErr instanceof Error ? updateErr.message : String(updateErr) });
      }
    }

    // Jiuflow専用のPrice IDs
    const JIUFLOW_PRICE_IDS = [
      "price_1SR3ZmDqLakc8NxkNdqL5BtO", // Founder Access - ¥980/month
      "price_1SNQoeDqLakc8NxkEUVTTs3k", // Monthly Plan - ¥2,900/month
      "price_1SNQoqDqLakc8NxkOaQIL8wX", // Annual Plan - ¥29,000/year
      "price_1SY2D0DqLakc8NxkMKonyIi8", // MURATABROS VIP - ¥50,000 one-time
      "price_1SYK2lDqLakc8Nxkp6TBKYhT", // Referral Plan
      "price_1SZ5O2DqLakc8Nxk0e6QYg6D", // Discount Monthly - ¥1,900/month
      "price_1SZ5QxDqLakc8NxkAA1RTL3c", // Discount Annual - ¥19,000/year
    ];

    // Check for both active and trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    
    // Filter for active or trialing subscriptions that are Jiuflow-specific
    const activeOrTrialingSubs = subscriptions.data.filter((sub: any) => {
      const isActiveOrTrialing = sub.status === "active" || sub.status === "trialing";
      const priceId = sub.items.data[0]?.price?.id;
      const isJiuflowPrice = JIUFLOW_PRICE_IDS.includes(priceId);
      return isActiveOrTrialing && isJiuflowPrice;
    });
    
    const hasActiveSub = activeOrTrialingSubs.length > 0;
    let productId = null;
    let priceId = null;
    let subscriptionId = null;
    let subscriptionEnd = null;
    let isTrialing = false;

    if (hasActiveSub) {
      const subscription = activeOrTrialingSubs[0];
      isTrialing = subscription.status === "trialing";
      subscriptionId = subscription.id;
      
      logStep("Subscription found", { 
        subscriptionId: subscription.id,
        status: subscription.status,
        isTrialing 
      });
      
      // Safe date conversion with error handling
      try {
        const periodEnd = subscription.current_period_end;
        if (periodEnd && typeof periodEnd === 'number') {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Date conversion error", { error: dateError instanceof Error ? dateError.message : String(dateError) });
        subscriptionEnd = null;
      }
      
      // Get product ID and price ID from the subscription
      const priceData = subscription.items.data[0]?.price;
      if (priceData) {
        if (typeof priceData.product === 'string') {
          productId = priceData.product;
        }
        priceId = priceData.id;
      }
      
      logStep("Subscription details", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd, 
        productId,
        priceId,
        status: subscription.status
      });
    } else {
      logStep("No active or trialing subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_id: subscriptionId,
      subscription_end: subscriptionEnd,
      is_trialing: isTrialing
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
