import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STREAM_ID_PATTERNS: RegExp[] = [
  /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  /videodelivery\.net\/([a-zA-Z0-9]+)/,
  /iframe\.videodelivery\.net\/([a-zA-Z0-9]+)/,
  /customer-[a-z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
];

function extractStreamId(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const p of STREAM_ID_PATTERNS) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function collectIds(input: {
  videoUrls?: (string | null | undefined)[];
  videoMetadata?: Record<string, { video_url?: string }> | null;
}): string[] {
  const ids = new Set<string>();
  for (const u of input.videoUrls || []) {
    const id = extractStreamId(u);
    if (id) ids.add(id);
  }
  if (input.videoMetadata && typeof input.videoMetadata === "object") {
    for (const v of Object.values(input.videoMetadata)) {
      const id = extractStreamId(v?.video_url);
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accountId || !apiToken) {
      return new Response(JSON.stringify({ error: "Cloudflare credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { videoUrls, videoMetadata, streamIds } = body as {
      videoUrls?: (string | null)[];
      videoMetadata?: Record<string, { video_url?: string }> | null;
      streamIds?: string[];
    };

    const ids = new Set<string>([
      ...(streamIds || []).filter(Boolean),
      ...collectIds({ videoUrls, videoMetadata }),
    ]);

    if (ids.size === 0) {
      return new Response(JSON.stringify({ deleted: [], skipped: [], message: "No Cloudflare Stream IDs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deleted: string[] = [];
    const failed: Array<{ id: string; status: number; error?: string }> = [];

    for (const id of ids) {
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
        );
        if (r.ok || r.status === 404) {
          deleted.push(id);
        } else {
          const txt = await r.text();
          failed.push({ id, status: r.status, error: txt.slice(0, 200) });
        }
      } catch (e) {
        failed.push({ id, status: 0, error: e instanceof Error ? e.message : String(e) });
      }
    }

    console.log(`[delete-cloudflare-video] deleted=${deleted.length} failed=${failed.length}`);

    return new Response(JSON.stringify({ deleted, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[delete-cloudflare-video] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});