import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

type DurationUpdate = { id: string; duration: number };

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, anonKey);
    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const callerId = userRes.user.id;
    const { data: callerRole, error: roleErr } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json().catch(() => null);
    const durations = (body?.durations ?? []) as DurationUpdate[];
    if (!Array.isArray(durations) || durations.length === 0) {
      return new Response(JSON.stringify({ error: "Missing durations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Basic validation / safety limit
    if (durations.length > 500) {
      return new Response(JSON.stringify({ error: "Too many updates (max 500 per request)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const ids = durations.map((d) => d.id);
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("techniques")
      .select("id, video_metadata")
      .in("id", ids);

    if (fetchErr) throw fetchErr;

    const metaById = new Map<string, Record<string, unknown>>();
    (rows ?? []).forEach((r) => {
      const meta = (r.video_metadata ?? {}) as Record<string, unknown>;
      metaById.set(r.id, meta);
    });

    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of durations) {
      if (!item?.id || typeof item.duration !== "number" || !isFinite(item.duration) || item.duration <= 0) {
        failed.push({ id: item?.id ?? "unknown", error: "Invalid payload" });
        continue;
      }

      const existingMeta = metaById.get(item.id) ?? {};
      const nextMeta = { ...existingMeta, duration: Math.round(item.duration) };

      const { error: updErr } = await supabaseAdmin
        .from("techniques")
        .update({ video_metadata: nextMeta })
        .eq("id", item.id);

      if (updErr) {
        failed.push({ id: item.id, error: updErr.message });
      } else {
        updated.push(item.id);
      }
    }

    return new Response(JSON.stringify({ updated, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("admin-update-video-durations error", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
