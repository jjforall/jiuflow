// Check whether Cloudflare Stream video assets exist for a list of video URLs / IDs.
// Returns per-URL status. A video is considered OK ONLY if:
//   1) Cloudflare API returns success with readyToStream=true and status.state="ready"
//   2) HEAD request to the HLS manifest returns 200
//   3) HEAD request to the thumbnail returns 200
// Any failure marks the video as missing/broken so the admin UI can flag it.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cloudflare Stream IDs are 32-char alphanumeric strings (not strictly hex).
// Match the same patterns used by the frontend (src/lib/cloudflareStream.ts).
const STREAM_ID_PATTERNS: RegExp[] = [
  /customer-[a-z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]{20,})/,
  /iframe\.videodelivery\.net\/([a-zA-Z0-9]{20,})/,
  /watch\.cloudflarestream\.com\/([a-zA-Z0-9]{20,})/,
  /cloudflarestream\.com\/([a-zA-Z0-9]{20,})/,
  /videodelivery\.net\/([a-zA-Z0-9]{20,})/,
];

function extractId(url: string): string | null {
  if (!url) return null;
  for (const pattern of STREAM_ID_PATTERNS) {
    const m = url.match(pattern);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function headOk(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(t);
  }
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

    const inputs = urls.map((url) => ({ url, id: extractId(url) }));

    const concurrency = 6;
    const results: Array<{
      url: string;
      videoId: string | null;
      ok: boolean;
      readyToStream?: boolean;
      state?: string;
      manifestStatus?: number;
      thumbnailStatus?: number;
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

        // 1) Cloudflare API status check
        let apiOk = false;
        let ready = false;
        let state = "unknown";
        let apiReason: string | undefined;
        try {
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${item.id}`,
            { headers: { Authorization: `Bearer ${apiToken}` } }
          );
          if (r.status === 404) {
            results[i] = { url: item.url, videoId: item.id, ok: false, reason: "api_not_found" };
            continue;
          }
          if (r.status === 401 || r.status === 403) {
            results[i] = {
              url: item.url,
              videoId: item.id,
              ok: false,
              reason: `api_auth_${r.status}`,
            };
            continue;
          }
          const j = await r.json().catch(() => null);
          if (!j?.success) {
            apiReason = j?.errors?.[0]?.message || `api_error_${r.status}`;
          } else {
            ready = !!j.result?.readyToStream;
            state = j.result?.status?.state || "unknown";
            apiOk = ready && state === "ready";
            if (!apiOk) apiReason = `not_ready(state=${state},ready=${ready})`;
          }
        } catch (e) {
          apiReason = e instanceof Error ? e.message : String(e);
        }

        if (!apiOk) {
          results[i] = {
            url: item.url,
            videoId: item.id,
            ok: false,
            readyToStream: ready,
            state,
            reason: apiReason || "api_failed",
          };
          continue;
        }

        // 2) HEAD manifest + 3) HEAD thumbnail (in parallel)
        const manifestUrl = `https://videodelivery.net/${item.id}/manifest/video.m3u8`;
        const thumbnailUrl = `https://videodelivery.net/${item.id}/thumbnails/thumbnail.jpg`;
        const [manifest, thumb] = await Promise.all([
          headOk(manifestUrl),
          headOk(thumbnailUrl),
        ]);

        const allOk = manifest.ok && thumb.ok;
        const reason = !allOk
          ? !manifest.ok && !thumb.ok
            ? `manifest_${manifest.status}_thumb_${thumb.status}`
            : !manifest.ok
              ? `manifest_${manifest.status}`
              : `thumb_${thumb.status}`
          : undefined;

        results[i] = {
          url: item.url,
          videoId: item.id,
          ok: allOk,
          readyToStream: ready,
          state,
          manifestStatus: manifest.status,
          thumbnailStatus: thumb.status,
          reason,
        };
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));

    const okCount = results.filter((r) => r?.ok).length;
    const missingCount = results.length - okCount;
    console.log(
      `[CHECK-CF-HEALTH] checked=${results.length} ok=${okCount} missing=${missingCount}`
    );
    if (missingCount > 0) {
      const sample = results.filter((r) => !r?.ok).slice(0, 5);
      console.log("[CHECK-CF-HEALTH] sample missing:", JSON.stringify(sample));
    }

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
