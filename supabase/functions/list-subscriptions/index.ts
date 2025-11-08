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

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user identity
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify admin role using service role client
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all subscriptions with customer expansion only
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      expand: ['data.customer'],
    });

    // Map subscriptions and fetch product details separately
    const subscriptionList = await Promise.all(subscriptions.data.map(async (sub: Stripe.Subscription) => {
      const customer = sub.customer as Stripe.Customer;
      const price = sub.items.data[0]?.price;
      
      // Fetch product separately if needed
      let productName = 'N/A';
      if (price && typeof price.product === 'string') {
        try {
          const product = await stripe.products.retrieve(price.product);
          productName = product.name;
        } catch (error) {
          console.error('Error fetching product:', error);
        }
      } else if (price && typeof price.product === 'object') {
        productName = (price.product as Stripe.Product).name || 'N/A';
      }

      return {
        id: sub.id,
        customer_email: customer.email,
        customer_name: customer.name || 'N/A',
        customer_id: customer.id,
        status: sub.status,
        amount: price?.unit_amount ? price.unit_amount / 100 : 0,
        currency: price?.currency || 'jpy',
        interval: price?.recurring?.interval || 'month',
        product_name: productName,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        created: new Date(sub.created * 1000).toISOString(),
      };
    }));

    return new Response(JSON.stringify({ subscriptions: subscriptionList }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
