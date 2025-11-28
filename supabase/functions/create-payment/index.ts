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
    const { priceId, referralCode, email } = await req.json();
    if (!priceId) throw new Error("Price ID is required");

    console.log("Creating payment session for price:", priceId);
    console.log("Email provided:", email || "none");
    if (referralCode) {
      console.log("Referral code provided:", referralCode);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const sessionConfig: any = {
      customer_creation: "always",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/join?canceled=true`,
    };

    // Add email if provided
    if (email) {
      sessionConfig.customer_email = email;
    }

    // Validate and add referral code as coupon if provided
    if (referralCode) {
      try {
        const coupon = await stripe.coupons.retrieve(referralCode);
        console.log("Referral code coupon found:", coupon.id, "Valid:", coupon.valid);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: referralCode }];
        } else {
          console.warn("Referral code coupon is not valid:", referralCode);
        }
      } catch (couponError) {
        console.error("Referral code coupon not found or invalid:", referralCode, couponError);
        // Continue without coupon if it's invalid
      }
    }

    console.log("Creating Stripe payment session with config:", JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("Payment session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating payment session:", message);
    console.error("Full error:", error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
