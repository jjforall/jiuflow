import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SUBSCRIPTION-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify admin role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Admin access required");
    }
    logStep("Admin role verified");

    const { subscriptionId, trialEndDate } = await req.json();
    
    if (!subscriptionId) throw new Error("Subscription ID is required");
    if (!trialEndDate) throw new Error("Trial end date is required");
    logStep("Request parsed", { subscriptionId, trialEndDate });

    // Convert date to Unix timestamp
    const trialEndTimestamp = Math.floor(new Date(trialEndDate).getTime() / 1000);
    logStep("Trial end timestamp", { trialEndTimestamp, date: new Date(trialEndTimestamp * 1000).toISOString() });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Update subscription trial end
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      trial_end: trialEndTimestamp,
    });
    logStep("Subscription updated", { 
      subscriptionId: updatedSubscription.id,
      trialEnd: updatedSubscription.trial_end,
      status: updatedSubscription.status
    });

    // Also update the database record if exists
    const { data: dbSubscription } = await supabaseClient
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (dbSubscription) {
      await supabaseClient
        .from("subscriptions")
        .update({
          trial_end: new Date(trialEndTimestamp * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
      logStep("Database record updated");
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          trial_end: updatedSubscription.trial_end 
            ? new Date(updatedSubscription.trial_end * 1000).toISOString()
            : null,
          status: updatedSubscription.status,
        },
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
