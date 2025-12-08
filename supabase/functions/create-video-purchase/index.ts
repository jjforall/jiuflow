import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VIDEO-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { videoId } = await req.json();
    
    if (!videoId) {
      throw new Error("Video ID is required");
    }

    logStep("Processing video purchase request", { videoId, userId: user.id });

    // Get video details including featured_user_id
    const { data: video, error: videoError } = await supabaseClient
      .from('user_videos')
      .select('*, featured_user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found");
    }

    logStep("Video found", { 
      title: video.title, 
      price: video.price,
      ownerId: video.user_id,
      featuredUserId: video.featured_user_id 
    });

    if (!video.price || video.price === 0) {
      throw new Error("This video is free");
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabaseClient
      .from('video_purchases')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle();

    if (existingPurchase) {
      throw new Error("Already purchased");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate revenue split
    // 10% platform fee, then 30% to featured user (if exists), 70% to owner
    const totalAmount = video.price;
    const platformFee = Math.floor(totalAmount * 0.10);
    const netAmount = totalAmount - platformFee;
    
    let ownerAmount = netAmount;
    let featuredUserAmount = 0;
    
    if (video.featured_user_id) {
      featuredUserAmount = Math.floor(netAmount * 0.30);
      ownerAmount = netAmount - featuredUserAmount;
    }

    logStep("Revenue split calculated", {
      totalAmount,
      platformFee,
      netAmount,
      ownerAmount,
      featuredUserAmount,
      hasFeaturedUser: !!video.featured_user_id
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `JiuFlow - 動画購入: ${video.title}`,
              description: video.description || "ユーザー投稿動画",
            },
            unit_amount: video.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/user/${video.user_id}?purchase=success`,
      cancel_url: `${req.headers.get("origin")}/user/${video.user_id}`,
      metadata: {
        type: "video_purchase",
        videoId,
        buyerId: user.id,
        ownerId: video.user_id,
        featuredUserId: video.featured_user_id || "",
        totalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        ownerAmount: ownerAmount.toString(),
        featuredUserAmount: featuredUserAmount.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
