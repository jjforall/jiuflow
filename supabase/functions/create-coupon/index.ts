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
    const { id, name, percent_off, amount_off, currency, duration, duration_in_months } = await req.json();

    if (!name) {
      throw new Error("Name is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log(`Creating coupon with ID: ${id || 'auto-generated'}`);

    const couponParams: any = {
      name,
      duration: duration || "once",
    };

    // Add custom ID if provided
    if (id) {
      couponParams.id = id;
    }

    // Add discount amount
    if (percent_off) {
      couponParams.percent_off = percent_off;
    } else if (amount_off && currency) {
      couponParams.amount_off = amount_off;
      couponParams.currency = currency;
    } else {
      throw new Error("Either percent_off or (amount_off and currency) must be provided");
    }

    // Add duration in months if applicable
    if (duration === "repeating" && duration_in_months) {
      couponParams.duration_in_months = duration_in_months;
    }

    const coupon = await stripe.coupons.create(couponParams);

    console.log(`Coupon created successfully:`, coupon);

    return new Response(
      JSON.stringify({ 
        success: true, 
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          duration_in_months: coupon.duration_in_months,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating coupon:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
