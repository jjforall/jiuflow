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
    const { priceId: requestedPriceId, couponCode, referralCode, email } = await req.json();
    
    // If referral code is provided, use the special 1900 yen referral plan
    const REFERRAL_PRICE_ID = "price_1SYK0YDqLakc8NxkOL9VEW5p"; // ¥1,900/month referral plan
    const priceId = referralCode ? REFERRAL_PRICE_ID : requestedPriceId;
    
    if (!priceId) throw new Error("Price ID is required");

    const discountCode = couponCode || referralCode;

    console.log("Creating checkout session for price:", priceId);
    console.log("Email provided:", email || "none");
    if (referralCode) {
      console.log("Referral code provided:", referralCode);
    }
    if (couponCode) {
      console.log("Manual coupon code provided:", couponCode);
    }
    if (discountCode && !couponCode && referralCode) {
      console.log("Using referral code as discount coupon:", discountCode);
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
        // Use 90 days trial for regular plans, no trial for referral (coupon handles first month free)
        trial_period_days: referralCode ? 0 : 90,
        metadata: {},
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/join?canceled=true`,
    };

    // Add referral code to metadata if provided
    if (referralCode) {
      // Verify referral code exists
      const { data: referralCodeData } = await supabaseClient
        .from("referral_codes")
        .select("id, user_id")
        .eq("code", referralCode)
        .maybeSingle();

      if (referralCodeData) {
        sessionConfig.subscription_data.metadata.referral_code_id = referralCodeData.id;
        sessionConfig.subscription_data.metadata.referral_code = referralCode;
        console.log("Referral code verified and added to metadata:", referralCodeData.id);
      } else {
        console.warn("Referral code not found in database:", referralCode);
      }
    }

    // Add email if provided
    if (email) {
      sessionConfig.customer_email = email;
    }

    // Validate and add coupon/discount code if provided
    if (discountCode) {
      try {
        const coupon = await stripe.coupons.retrieve(discountCode);
        console.log("Coupon found:", coupon.id, "Valid:", coupon.valid);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: discountCode }];
        } else {
          console.warn("Coupon is not valid:", discountCode);
        }
      } catch (couponError) {
        console.error("Coupon not found or invalid:", discountCode, couponError);
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
