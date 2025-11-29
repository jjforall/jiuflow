import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log("Creating Founder Plan checkout with 90-day trial for:", email);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Founder Plan price ID (¥980/month)
    const FOUNDER_PLAN_PRICE_ID = "price_1SR3ZmDqLakc8NxkNdqL5BtO";
    
    // Create checkout session with 90-day trial and correct return URL
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: FOUNDER_PLAN_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 90,
      },
      success_url: "https://jiuflow.art/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://jiuflow.art/join?canceled=true",
    });

    console.log("Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating checkout session:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
