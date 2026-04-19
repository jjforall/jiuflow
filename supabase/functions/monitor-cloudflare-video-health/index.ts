// Scheduled job: scan ALL techniques.video_url against Cloudflare Stream and
// flag anything that 404s. Stores results in admin_audit_log so the admin
// dashboard can surface "missing" videos. Returns a JSON summary.
//
// Recommended schedule: hourly via pg_cron.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STREAM_ID_RE = /([a-f0-9]{32})/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!accountId || !apiToken || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: techniques, error } = await admin
      .from("techniques")
      .select("id, name, video_url")
      .not("video_url", "is", null);
    if (error) throw error;

    const items = (techniques || []).filter(
      (t: any) =>
        t.video_url &&
        (t.video_url.includes("videodelivery.net") ||
          t.video_url.includes("cloudflarestream.com"))
    );

    const missing: Array<{ id: string; name: string; videoId: string | null; videoUrl: string }> = [];
    let checked = 0;

    // 8-way concurrency
    const concurrency = 8;
    let cursor = 0;
    async function worker() {
      while (cursor < items.length) {
        const i = cursor++;
        const t: any = items[i];
        const id = (t.video_url.match(STREAM_ID_RE) || [])[1] ?? null;
        if (!id) {
          missing.push({ id: t.id, name: t.name, videoId: null, videoUrl: t.video_url });
          continue;
        }
        try {
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${id}`,
            { headers: { Authorization: `Bearer ${apiToken}` } }
          );
          checked++;
          if (r.status === 404) {
            missing.push({ id: t.id, name: t.name, videoId: id, videoUrl: t.video_url });
            continue;
          }
          const j = await r.json();
          const ready = !!j?.result?.readyToStream;
          const state = j?.result?.status?.state;
          if (!ready || state !== "ready") {
            missing.push({ id: t.id, name: t.name, videoId: id, videoUrl: t.video_url });
          }
        } catch (e) {
          console.error("[CF-MONITOR] fetch error", id, e);
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, worker)
    );

    // Persist a single audit log entry summarizing this run.
    const summary = {
      total: items.length,
      checked,
      missing_count: missing.length,
      missing: missing.slice(0, 50), // keep payload bounded
      ran_at: new Date().toISOString(),
    };

    await admin.from("admin_audit_log").insert({
      admin_user_id: "00000000-0000-0000-0000-000000000000",
      action: "cloudflare_health_scan",
      table_name: "techniques",
      details: summary as any,
    });

    console.log(
      `[CF-MONITOR] Scanned ${items.length} videos, ${missing.length} missing`
    );

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CF-MONITOR] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
