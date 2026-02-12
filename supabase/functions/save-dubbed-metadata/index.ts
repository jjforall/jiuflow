import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Bulk-save dubbed video metadata to techniques.video_metadata.
 * Uses service_role key to bypass RLS.
 *
 * POST body:
 * {
 *   "updates": [
 *     { "technique_id": "uuid", "lang": "en", "video_url": "https://..." },
 *     ...
 *   ],
 *   "secret": "pipeline-secret-key"
 * }
 */

const PIPELINE_SECRET = "jiuflow-dubbing-2026";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Simple secret auth for pipeline scripts
    if (body.secret !== PIPELINE_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const updates = body.updates as Array<{
      technique_id: string;
      lang: string;
      video_url: string;
      provider?: string;
    }>;

    if (!Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ error: "Missing updates array" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (updates.length > 600) {
      return new Response(JSON.stringify({ error: "Max 600 per request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch all technique IDs in one query
    const techIds = [...new Set(updates.map((u) => u.technique_id))];
    const { data: rows, error: fetchErr } = await supabase
      .from("techniques")
      .select("id, video_metadata")
      .in("id", techIds);

    if (fetchErr) throw fetchErr;

    const metaById = new Map<string, Record<string, unknown>>();
    (rows ?? []).forEach((r) => {
      metaById.set(r.id, (r.video_metadata ?? {}) as Record<string, unknown>);
    });

    const saved: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];

    // Group updates by technique_id to batch merge
    const grouped = new Map<string, Array<typeof updates[0]>>();
    for (const u of updates) {
      const existing = grouped.get(u.technique_id) ?? [];
      existing.push(u);
      grouped.set(u.technique_id, existing);
    }

    for (const [techId, langs] of grouped) {
      const existingMeta = metaById.get(techId) ?? {};
      const newMeta = { ...existingMeta };

      for (const u of langs) {
        newMeta[u.lang] = {
          video_url: u.video_url,
          provider: u.provider ?? "oss-pipeline",
          created_at: new Date().toISOString(),
        };
      }

      const { error: updErr } = await supabase
        .from("techniques")
        .update({ video_metadata: newMeta })
        .eq("id", techId);

      if (updErr) {
        for (const u of langs) {
          failed.push({ key: `${techId}:${u.lang}`, error: updErr.message });
        }
      } else {
        for (const u of langs) {
          saved.push(`${techId}:${u.lang}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ saved: saved.length, failed: failed.length, errors: failed.slice(0, 10) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("save-dubbed-metadata error", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
