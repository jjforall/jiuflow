import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Whitelist of allowed Stripe price IDs
const FOUNDER_PRICE_ID = "price_1SR3ZmDqLakc8NxkNdqL5BtO"; // 980 JPY/month (founder)
const CAMPAIGN_PRICE_ID = "price_1SZ5O2DqLakc8Nxk0e6QYg6D"; // 1900 JPY/month (campaign)
const MONTHLY_PRICE_ID = "price_1SNQoeDqLakc8NxkEUVTTs3k"; // 2900 JPY/month
const ANNUAL_PRICE_ID = "price_1SNQoqDqLakc8NxkOaQIL8wX"; // 29000 JPY/year
const MURATABROS_PRICE_ID = "price_1SY2D0DqLakc8NxkMKonyIi8"; // 50000 one-time
const MURATABJJ_PRICE_ID = "price_1Sdu0rDqLakc8NxkBt73C3DL"; // 1480 JPY/month

// Map of allowed price IDs with their trial settings
const ALLOWED_PRICES: Record<string, { trialDays: number; mode: string }> = {
  [FOUNDER_PRICE_ID]: { trialDays: 90, mode: "subscription" },
  [CAMPAIGN_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [MONTHLY_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [ANNUAL_PRICE_ID]: { trialDays: 30, mode: "subscription" },
  [MURATABROS_PRICE_ID]: { trialDays: 0, mode: "payment" },
  [MURATABJJ_PRICE_ID]: { trialDays: 30, mode: "subscription" },
};

// Referrer codes that override the requested price
const REFERRER_CODE_MAP: Record<string, { priceId: string; trialDays: number }> = {
  "MURATABJJ": { priceId: MURATABJJ_PRICE_ID, trialDays: 30 },
  "OVERLIMITSP": { priceId: MURATABJJ_PRICE_ID, trialDays: 30 },
  "YUKIBJJ": { priceId: FOUNDER_PRICE_ID, trialDays: 90 },
};

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
    // --- Authentication: require a valid user ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    console.log("Authenticated user:", user.id);

    const { priceId, couponCode, referralCode } = await req.json();
    
    if (!priceId || typeof priceId !== "string") {
      return new Response(JSON.stringify({ error: "Price ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // --- Server-side price validation ---
    // Determine the actual price to use: referrer codes can override
    let resolvedPriceId = priceId;
    let trialDays: number;
    const isReferrerCode = referralCode && typeof referralCode === "string" &&
      REFERRER_CODE_MAP[referralCode.toUpperCase()];

    if (isReferrerCode) {
      const mapping = REFERRER_CODE_MAP[referralCode.toUpperCase()];
      resolvedPriceId = mapping.priceId;
      trialDays = mapping.trialDays;
      console.log(`Referrer code ${referralCode.toUpperCase()} -> price ${resolvedPriceId}`);
    } else {
      // Validate that the requested priceId is in our whitelist
      if (!ALLOWED_PRICES[priceId]) {
        console.warn("Rejected invalid price ID:", priceId);
        return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      trialDays = ALLOWED_PRICES[priceId].trialDays;
    }

    const resolvedMode = ALLOWED_PRICES[resolvedPriceId]?.mode || "subscription";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if user already has a Stripe customer record
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      mode: resolvedMode,
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      custom_text: {
        submit: { message: "JiuFlow" },
      },
    };

    // Add subscription-specific settings
    if (resolvedMode === "subscription") {
      sessionConfig.subscription_data = {
        metadata: {},
      };
      if (trialDays > 0) {
        sessionConfig.subscription_data.trial_period_days = trialDays;
        sessionConfig.subscription_data.trial_settings = {
          end_behavior: { missing_payment_method: 'cancel' },
        };
      }
      sessionConfig.payment_method_collection = 'always';
    }

    // Track referral metadata (only for subscription mode)
    if (referralCode && typeof referralCode === "string" && resolvedMode === "subscription") {
      if (isReferrerCode) {
        sessionConfig.subscription_data.metadata.referrer_code = referralCode.toUpperCase();
      } else {
        // Validate user referral code from database
        const { data: referralCodeData } = await supabaseClient
          .from("referral_codes")
          .select("id, user_id")
          .eq("code", referralCode)
          .maybeSingle();

        if (referralCodeData) {
          // Prevent self-referral
          if (referralCodeData.user_id === user.id) {
            console.warn("Self-referral attempt blocked:", user.id);
          } else {
            sessionConfig.subscription_data.metadata.referral_code_id = referralCodeData.id;
            sessionConfig.subscription_data.metadata.referral_code = referralCode;
          }
        }
      }
    }

    // Validate and add coupon if provided
    const actualCouponId = couponCode || (!isReferrerCode ? referralCode : null);
    if (actualCouponId && typeof actualCouponId === "string") {
      try {
        const coupon = await stripe.coupons.retrieve(actualCouponId);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: actualCouponId }];
          console.log("Applied coupon:", actualCouponId);
        }
      } catch (_couponError) {
        // Continue without coupon if invalid - don't expose details
        console.warn("Coupon not found or invalid:", actualCouponId);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating checkout session:", message);
    // Return generic error to client
    return new Response(JSON.stringify({ error: "Failed to create checkout session. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
