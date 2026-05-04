import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const expected = Deno.env.get("ADMIN_PASSWORD") ?? "";
    if (!expected || req.headers.get("x-admin-secret") !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1) Get all paid emails from Stripe (active/trialing/past_due)
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const paid = new Set<string>();
    for (const status of ["active", "trialing", "past_due"] as const) {
      let starting_after: string | undefined;
      while (true) {
        const page: any = await stripe.subscriptions.list({ status, limit: 100, starting_after, expand: ["data.customer"] });
        for (const s of page.data) {
          const email = (s.customer as any)?.email;
          if (email) paid.add(email.toLowerCase());
        }
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }
    }

    // 2) List all auth users
    const users: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
      page++;
    }

    // 3) Get display names
    const ids = users.map((u) => u.id);
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));

    // 4) Get staff/admin roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }

    const nonPaid = users
      .filter((u) => u.email && !paid.has(u.email.toLowerCase()))
      .map((u) => ({
        email: u.email,
        display_name: nameMap.get(u.id) ?? "",
        roles: (roleMap.get(u.id) ?? []).join(",") || "user",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? "",
      }));

    return new Response(JSON.stringify({
      total_users: users.length,
      paid_emails: paid.size,
      non_paid_count: nonPaid.length,
      rows: nonPaid,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});