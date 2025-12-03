import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  variantId: number;
  quantity: number;
  name: string;
  price: number;
  thumbnail: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const { items, email } = await req.json() as { items: CartItem[]; email?: string };

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    console.log("[CREATE-PRINTFUL-CHECKOUT] Creating checkout for items:", items.length);

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    // Create line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "jpy",
        product_data: {
          name: item.name,
          images: item.thumbnail ? [item.thumbnail] : [],
          metadata: {
            printful_variant_id: item.variantId.toString(),
          },
        },
        unit_amount: Math.round(item.price),
      },
      quantity: item.quantity,
    }));

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Store cart items in metadata for webhook processing
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/shop?success=true`,
      cancel_url: `${origin}/shop?canceled=true`,
      customer_email: email,
      shipping_address_collection: {
        allowed_countries: ["JP", "US", "CA", "GB", "AU", "DE", "FR"],
      },
      metadata: {
        cart_items: JSON.stringify(items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))),
      },
    });

    console.log("[CREATE-PRINTFUL-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-PRINTFUL-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
