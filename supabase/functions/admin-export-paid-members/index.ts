import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // admin check via shared admin password secret
    const adminSecret = req.headers.get("x-admin-secret");
    const expected = Deno.env.get("ADMIN_PASSWORD") ?? "";
    if (!expected || adminSecret !== expected) {
      throw new Error("Forbidden");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const statuses = ["active", "trialing", "past_due"] as const;
    const subs: any[] = [];
    for (const status of statuses) {
      let starting_after: string | undefined = undefined;
      while (true) {
        const page: any = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after,
          expand: ["data.customer"],
        });
        subs.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }
    }

    const rows = subs.map((s) => {
      const cust: any = s.customer;
      const price = s.items?.data?.[0]?.price;
      return {
        email: cust?.email ?? "",
        customer_id: typeof cust === "string" ? cust : cust?.id ?? "",
        subscription_id: s.id,
        status: s.status,
        price_id: price?.id ?? "",
        amount: price?.unit_amount ?? "",
        currency: price?.currency ?? "",
        interval: price?.recurring?.interval ?? "",
        created: new Date(s.created * 1000).toISOString(),
        current_period_end: s.current_period_end
          ? new Date(s.current_period_end * 1000).toISOString()
          : "",
        cancel_at_period_end: s.cancel_at_period_end,
      };
    });

    return new Response(JSON.stringify({ count: rows.length, rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});