import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AWARD-MONTHLY-POINTS] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) throw new Error("Unauthorized");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({ message: "No subscription found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions");
      return new Response(
        JSON.stringify({ message: "No active subscriptions" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let totalPointsAwarded = 0;

    for (const subscription of subscriptions.data) {
      const subscriptionId = subscription.id;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      logStep("Processing subscription", { subscriptionId, currentPeriodEnd });

      // Get subscription record with referral code
      const { data: subRecord } = await supabaseClient
        .from("subscriptions")
        .select("referral_code_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (!subRecord?.referral_code_id) {
        logStep("No referral code for this subscription", { subscriptionId });
        continue;
      }

      logStep("Found referral code", { referralCodeId: subRecord.referral_code_id });

      // Check if we already awarded points for this billing period
      const lastBillingCheck = new Date();
      lastBillingCheck.setMonth(lastBillingCheck.getMonth() - 1);

      const { data: recentTransaction } = await supabaseClient
        .from("point_transactions")
        .select("*")
        .eq("referral_code_id", subRecord.referral_code_id)
        .eq("transaction_type", "monthly_referral_bonus")
        .gte("created_at", lastBillingCheck.toISOString())
        .maybeSingle();

      if (recentTransaction) {
        logStep("Points already awarded for this period", { subscriptionId });
        continue;
      }

      // Award 500 points
      const { error: awardError } = await supabaseClient.rpc("award_referral_points", {
        p_referral_code_id: subRecord.referral_code_id,
        p_referred_user_id: user.id,
        p_amount: 500,
        p_description: `Monthly referral bonus for subscription ${subscriptionId}`,
      });

      if (awardError) {
        logStep("Error awarding points", { error: awardError });
      } else {
        totalPointsAwarded += 500;
        logStep("Points awarded successfully", { amount: 500 });
      }
    }

    return new Response(
      JSON.stringify({ 
        pointsAwarded: totalPointsAwarded,
        message: totalPointsAwarded > 0 ? "Points awarded successfully" : "No new points to award"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
