import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 5 trial link creations per hour per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const clientId = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(`founder-trial:${clientId}`, RATE_LIMIT_CONFIG);
  
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for ${clientId}`);
    return rateLimitResponse(rateLimitResult.resetInMs);
  }

  try {
    const { email } = await req.json();
    
    // Email validation
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
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
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      },
      payment_method_collection: 'if_required',
      custom_text: {
        submit: {
          message: "JiuFlow",
        },
      },
      success_url: "https://jiuflow.art/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://jiuflow.art/payment-canceled",
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
