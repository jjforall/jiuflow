import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-PLANS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (rolesError || !userRoles) {
      throw new Error("Admin access required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { action, ...body } = await req.json();

    logStep("Action requested", { action });

    if (action === "list") {
      // List all prices with product expanded (single API call)
      const prices = await stripe.prices.list({ 
        active: true, 
        limit: 100,
        expand: ['data.product']
      });

      // Group prices by product
      const productMap = new Map();
      prices.data.forEach((price: any) => {
        const product = price.product;
        if (typeof product === 'object' && product.active) {
          if (!productMap.has(product.id)) {
            productMap.set(product.id, {
              ...product,
              prices: []
            });
          }
          productMap.get(product.id).prices.push(price);
        }
      });

      const productsWithPrices = Array.from(productMap.values());
      logStep("Products listed", { count: productsWithPrices.length });

      return new Response(JSON.stringify({ products: productsWithPrices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "create") {
      // Create a new product and price
      const { name, description, priceAmount, currency, interval } = body;

      if (!name || !priceAmount || !currency) {
        throw new Error("Missing required fields: name, priceAmount, currency");
      }

      const product = await stripe.products.create({
        name,
        description: description || undefined,
      });

      logStep("Product created", { productId: product.id });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount,
        currency,
        recurring: interval ? { interval } : undefined,
      });

      logStep("Price created", { priceId: price.id });

      return new Response(JSON.stringify({ product, price }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "update") {
      // Update product (name, description only - prices are immutable)
      const { productId, name, description, active } = body;

      if (!productId) {
        throw new Error("Missing productId");
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (active !== undefined) updateData.active = active;

      const product = await stripe.products.update(productId, updateData);

      logStep("Product updated", { productId });

      return new Response(JSON.stringify({ product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "archive") {
      // Archive a product (soft delete)
      const { productId } = body;

      if (!productId) {
        throw new Error("Missing productId");
      }

      const product = await stripe.products.update(productId, {
        active: false,
      });

      logStep("Product archived", { productId });

      return new Response(JSON.stringify({ product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "create-price") {
      // Create a new price for an existing product
      const { productId, priceAmount, currency, interval } = body;

      if (!productId || !priceAmount || !currency) {
        throw new Error("Missing required fields: productId, priceAmount, currency");
      }

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceAmount,
        currency,
        recurring: interval ? { interval } : undefined,
      });

      logStep("Price created for existing product", { priceId: price.id, productId });

      return new Response(JSON.stringify({ price }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "archive-price") {
      // Archive a price (soft delete)
      const { priceId } = body;

      if (!priceId) {
        throw new Error("Missing priceId");
      }

      const price = await stripe.prices.update(priceId, {
        active: false,
      });

      logStep("Price archived", { priceId });

      return new Response(JSON.stringify({ price }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
