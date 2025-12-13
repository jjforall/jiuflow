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
    const { priceId, couponCode, referralCode, email } = await req.json();
    
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
        metadata: {},
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      custom_text: {
        submit: {
          message: "JiuFlow",
        },
      },
    };

    // Add trial settings for all plans
    // Founder plan gets 90 days, regular plans get 30 days
    const FOUNDER_PRICE_ID = "price_1SR3ZmDqLakc8NxkNdqL5BtO";
    const isFounderPlan = priceId === FOUNDER_PRICE_ID;
    
    sessionConfig.subscription_data.trial_period_days = isFounderPlan ? 90 : 30;
    sessionConfig.subscription_data.trial_settings = {
      end_behavior: {
        missing_payment_method: 'cancel',
      },
    };
    sessionConfig.payment_method_collection = 'always';

    // Referrer codes that grant access to the special Founder plan
    const REFERRER_CODES = ["MURATABJJ", "YUKIBJJ"];
    const FOUNDER_REFERRAL_PRICE_ID_980 = "price_1SR3ZmDqLakc8NxkNdqL5BtO"; // 980 JPY/month (until Dec 2025)
    const FOUNDER_REFERRAL_PRICE_ID_1480 = "price_1Sdu0rDqLakc8NxkBt73C3DL"; // 1480 JPY/month (from Jan 2026)

    // Check if referralCode is a special referrer code
    const isReferrerCode = referralCode && REFERRER_CODES.includes(referralCode.toUpperCase());
    
    // If it's a referrer code, override the priceId based on date
    if (isReferrerCode) {
      const now = new Date();
      const jan2026 = new Date("2026-01-01T00:00:00+09:00"); // JST
      const referralPriceId = now >= jan2026 ? FOUNDER_REFERRAL_PRICE_ID_1480 : FOUNDER_REFERRAL_PRICE_ID_980;
      const priceAmount = now >= jan2026 ? "1480" : "980";
      
      sessionConfig.line_items = [{
        price: referralPriceId,
        quantity: 1,
      }];
      console.log(`Referrer code detected, switching to Founder plan (${priceAmount} JPY/month):`, referralCode);
    }

    const actualCouponId = couponCode || (!isReferrerCode ? referralCode : null);

    // Add referrer code to metadata if provided (for tracking purposes)
    if (referralCode) {
      if (isReferrerCode) {
        // Store the referrer code in metadata for tracking who referred
        sessionConfig.subscription_data.metadata.referrer_code = referralCode.toUpperCase();
        console.log("Referrer code added to metadata:", referralCode.toUpperCase());
      } else {
        // Check if it's a user referral code from the database
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
    }

    // Add email if provided
    if (email) {
      sessionConfig.customer_email = email;
    }

    // Validate and add coupon if provided or mapped from referrer code
    if (actualCouponId) {
      try {
        const coupon = await stripe.coupons.retrieve(actualCouponId);
        console.log("Coupon found:", coupon.id, "Valid:", coupon.valid);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: actualCouponId }];
          console.log("Applied coupon:", actualCouponId, isReferrerCode ? `(from referrer: ${referralCode})` : "");
        } else {
          console.warn("Coupon is not valid:", actualCouponId);
        }
      } catch (couponError) {
        console.error("Coupon not found or invalid:", actualCouponId, couponError);
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
