import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { JIUFLOW_PRICE_IDS, PRICE_DISPLAY_NAMES, PRICE_PLAN_TYPES } from "../_shared/jiuflow-prices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    logStep("Authorization header found");
    
    // Create Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user identity using the anon client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Authentication failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Use service role client for admin check
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin role using service role client
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      logStep("Admin check failed", { error: roleError?.message });
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }
    logStep("Admin verified");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("Stripe key not found");
      return new Response(JSON.stringify({ error: 'Stripe configuration error' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Use shared price IDs (single source of truth)

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Get ALL subscriptions using pagination (Stripe default limit is 100)
    let allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        status: 'all',
        limit: 100,
        expand: ['data.customer', 'data.items.data.price'],
      };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const subscriptions = await stripe.subscriptions.list(params);
      allSubscriptions = allSubscriptions.concat(subscriptions.data);
      hasMore = subscriptions.has_more;
      
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      } else {
        hasMore = false;
      }
      
      logStep("Fetched subscription page", { pageCount: subscriptions.data.length, totalSoFar: allSubscriptions.length });
    }
    logStep("Fetched all subscriptions", { totalCount: allSubscriptions.length });

    // Filter subscriptions to only include Jiuflow ones
    const jiuflowSubscriptions = allSubscriptions.filter((sub: Stripe.Subscription) => {
      const priceId = sub.items.data[0]?.price?.id;
      return JIUFLOW_PRICE_IDS.includes(priceId);
    });
    logStep("Filtered to Jiuflow subscriptions", { count: jiuflowSubscriptions.length });

    // Get referral code info from Supabase subscriptions table
    const { data: supabaseSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        stripe_subscription_id,
        referral_code_id,
        referral_codes:referral_code_id (
          code,
          dojo_friends_code,
          user_id
        )
      `)
      .not('stripe_subscription_id', 'is', null);

    // Create a map for quick lookup
    const referralMap = new Map();
    if (supabaseSubscriptions) {
      for (const sub of supabaseSubscriptions) {
        if (sub.stripe_subscription_id && sub.referral_codes) {
          referralMap.set(sub.stripe_subscription_id, sub.referral_codes);
        }
      }
    }
    logStep("Fetched referral codes", { count: referralMap.size });

    // Map subscriptions and fetch product details separately
    const subscriptionList = await Promise.all(jiuflowSubscriptions.map(async (sub: Stripe.Subscription) => {
      const customer = typeof sub.customer === 'string' ? null : sub.customer as Stripe.Customer;
      const price = sub.items.data[0]?.price;
      const item = sub.items.data[0];
      const priceId = price?.id ?? null;
      
      // In newer Stripe API versions (basil), current_period_start/end are on the item, not the subscription
      const periodStart = (item as any)?.current_period_start ?? (sub as any).current_period_start;
      const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;
      
      // Resolve product name from shared price mapping first to avoid N/A for legacy plans
      let productName = priceId ? PRICE_DISPLAY_NAMES[priceId] ?? 'N/A' : 'N/A';
      if (price?.nickname?.trim()) {
        productName = price.nickname;
      }

      if (price && typeof price.product === 'string') {
        try {
          const product = await stripe.products.retrieve(price.product);
          productName = product.name || productName;
        } catch (error) {
          console.error('Error fetching product:', error);
        }
      } else if (price && typeof price.product === 'object') {
        productName = (price.product as Stripe.Product).name || productName;
      }

      const isTrialing = sub.status === 'trialing' || (sub.trial_end && sub.trial_end * 1000 > Date.now());
      
      // Get referral code info
      const referralInfo = referralMap.get(sub.id);
      
      return {
        id: sub.id,
        customer_email: customer?.email || 'N/A',
        customer_name: customer?.name || 'N/A',
        customer_id: customer?.id || (typeof sub.customer === 'string' ? sub.customer : 'N/A'),
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        is_trialing: isTrialing,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        amount: price?.unit_amount || 0,
        currency: price?.currency || 'jpy',
        interval: price?.recurring?.interval || 'month',
        product_name: productName,
        price_id: priceId,
        plan_type: priceId ? PRICE_PLAN_TYPES[priceId] ?? null : null,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
        referral_code: referralInfo?.code || referralInfo?.dojo_friends_code || null,
      };
    }));

    logStep("Returning subscriptions", { count: subscriptionList.length });
    return new Response(JSON.stringify({ subscriptions: subscriptionList }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Error listing subscriptions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
