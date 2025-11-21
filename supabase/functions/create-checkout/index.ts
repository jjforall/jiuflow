import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { priceId, couponCode, email } = await req.json();
    if (!priceId) throw new Error("Price ID is required");

    console.log("Creating checkout session for price:", priceId);
    console.log("Email provided:", email || "none");
    if (couponCode) {
      console.log("Coupon code provided:", couponCode);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const sessionConfig: any = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/join?canceled=true`,
    };

    // Add email if provided
    if (email) {
      sessionConfig.customer_email = email;
    }

    // Validate and add coupon code if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        console.log("Coupon found:", coupon.id, "Valid:", coupon.valid);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: couponCode }];
        } else {
          console.warn("Coupon is not valid:", couponCode);
        }
      } catch (couponError) {
        console.error("Coupon not found or invalid:", couponCode, couponError);
        // Continue without coupon if it's invalid
      }
    }

    console.log("Creating Stripe checkout session with config:", JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("Checkout session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating checkout session:", message);
    console.error("Full error:", error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
