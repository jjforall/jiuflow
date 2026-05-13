// Scheduled job: scan Cloudflare Stream for orphaned videos (videos in Cloudflare
// but not referenced in DB techniques table). Logs summary to admin_audit_log.
//
// Recommended schedule: weekly via pg_cron.
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

async function fetchAllCloudflareVideos(
  accountId: string,
  apiToken: string
): Promise<Array<{ uid: string; duration: number; created: string; meta?: { name?: string } }>> {
  const allVideos: Array<{ uid: string; duration: number; created: string; meta?: { name?: string } }> = [];
  let cursor: string | null = null;

  do {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`);
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("after", cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.result && Array.isArray(data.result)) {
      allVideos.push(...data.result);
    }
    cursor = data.result_info?.cursor || null;
    if (!data.result || data.result.length < 100) cursor = null;
  } while (cursor);

  return allVideos;
}

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
    // 1. Fetch all Cloudflare videos
    const allVideos = await fetchAllCloudflareVideos(accountId, apiToken);

    // 2. Fetch all techniques with video URLs
    const { data: techniques, error: dbError } = await admin
      .from("techniques")
      .select("id, name, video_url, video_url_ja, video_url_pt, video_metadata");

    if (dbError) throw new Error(`Database error: ${dbError.message}`);

    // 3. Build set of IDs to keep
    const keepIds = new Set<string>();
    for (const technique of techniques || []) {
      const urls = [technique.video_url, technique.video_url_ja, technique.video_url_pt];
      for (const url of urls) {
        const id = extractStreamId(url);
        if (id) keepIds.add(id);
      }
      if (technique.video_metadata && typeof technique.video_metadata === "object") {
        const metadata = technique.video_metadata as Record<string, { video_url?: string }>;
        for (const langData of Object.values(metadata)) {
          const id = extractStreamId(langData?.video_url);
          if (id) keepIds.add(id);
        }
      }
    }

    // 4. Find orphaned videos
    const orphaned = allVideos.filter((v) => !keepIds.has(v.uid));
    const orphanedMinutes = orphaned.reduce((sum, v) => sum + (v.duration || 0), 0) / 60;

    // 5. Log to admin_audit_log
    const summary = {
      total_cloudflare_videos: allVideos.length,
      total_db_referenced: keepIds.size,
      orphaned_count: orphaned.length,
      orphaned_minutes: Math.round(orphanedMinutes * 100) / 100,
      orphaned_ids: orphaned.map((v) => v.uid),
      checked_at: new Date().toISOString(),
    };

    await admin.from("admin_audit_log").insert({
      admin_user_id: "00000000-0000-0000-0000-000000000000",
      action: "scheduled_cloudflare_orphan_scan",
      table_name: "techniques",
      details: summary as any,
    });

    console.log(
      `[SCHEDULED-CF-CLEANUP] Orphaned: ${orphaned.length} of ${allVideos.length} videos (${orphanedMinutes.toFixed(1)} min)`
    );

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SCHEDULED-CF-CLEANUP] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
