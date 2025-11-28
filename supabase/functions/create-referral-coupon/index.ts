import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key to bypass RLS for database operations
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Get or create user's referral code
    const { data: existingCode, error: codeError } = await supabaseClient
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (codeError) {
      console.error("Error fetching referral code:", codeError);
      throw new Error("Failed to fetch referral code");
    }

    let referralCode = existingCode;

    if (!referralCode) {
      // Create a new referral code for this user if none exists
      const generateCode = () =>
        Math.random().toString(36).substring(2, 10).toUpperCase();

      let lastInsertError: unknown = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const newCode = generateCode();
        const { data: inserted, error: insertError } = await supabaseClient
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode })
          .select("code")
          .single();

        if (!insertError && inserted) {
          referralCode = inserted;
          break;
        }

        lastInsertError = insertError;

        // If the error isn't a duplicate-code type, don't retry endlessly
        if (!insertError?.message?.includes("duplicate")) {
          break;
        }
      }

      if (!referralCode) {
        console.error("Error creating referral code:", lastInsertError);
        throw new Error("Failed to create referral code");
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if coupon already exists
    try {
      const existingCoupon = await stripe.coupons.retrieve(referralCode.code);
      console.log("Coupon already exists:", existingCoupon.id);
      return new Response(
        JSON.stringify({ coupon: existingCoupon }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      // Coupon doesn't exist, create it
      console.log("Creating new coupon for code:", referralCode.code);
    }

    // Create a coupon for 100% off first month (trial)
    const coupon = await stripe.coupons.create({
      id: referralCode.code,
      name: `Referral: ${referralCode.code}`,
      percent_off: 100,
      duration: "once",
      max_redemptions: 1000,
    });

    console.log("Coupon created successfully:", coupon.id);

    return new Response(
      JSON.stringify({ coupon }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating referral coupon:", error);
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
