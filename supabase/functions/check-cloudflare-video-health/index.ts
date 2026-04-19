// Check whether Cloudflare Stream video assets exist for a list of video URLs / IDs.
// Returns per-URL status so the admin UI can flag missing/broken videos.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STREAM_ID_RE = /([a-f0-9]{32})/i;

function extractId(url: string): string | null {
  const m = url.match(STREAM_ID_RE);
  return m?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    return new Response(
      JSON.stringify({ error: "Cloudflare Stream not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auth: require admin or staff
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authorization");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles || []).some((r) => r.role === "admin" || r.role === "staff");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body?.urls) ? body.urls.slice(0, 200) : [];
    if (urls.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve IDs and call Cloudflare API in parallel (limit concurrency to 8)
    const inputs = urls.map((url) => ({ url, id: extractId(url) }));

    const concurrency = 8;
    const results: Array<{
      url: string;
      videoId: string | null;
      ok: boolean;
      readyToStream?: boolean;
      state?: string;
      reason?: string;
    }> = [];

    let cursor = 0;
    async function worker() {
      while (cursor < inputs.length) {
        const i = cursor++;
        const item = inputs[i];
        if (!item.id) {
          results[i] = { url: item.url, videoId: null, ok: false, reason: "no_id_in_url" };
          continue;
        }
        try {
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${item.id}`,
            { headers: { Authorization: `Bearer ${apiToken}` } }
          );
          if (r.status === 404) {
            results[i] = { url: item.url, videoId: item.id, ok: false, reason: "not_found" };
            continue;
          }
          const j = await r.json();
          if (!j?.success) {
            results[i] = {
              url: item.url,
              videoId: item.id,
              ok: false,
              reason: j?.errors?.[0]?.message || "api_error",
            };
            continue;
          }
          const ready = !!j.result?.readyToStream;
          const state = j.result?.status?.state || "unknown";
          results[i] = {
            url: item.url,
            videoId: item.id,
            ok: ready && state === "ready",
            readyToStream: ready,
            state,
          };
        } catch (e) {
          results[i] = {
            url: item.url,
            videoId: item.id,
            ok: false,
            reason: e instanceof Error ? e.message : String(e),
          };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-CF-HEALTH] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
