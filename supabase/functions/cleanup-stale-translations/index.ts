import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional parameters
    let hoursThreshold = 2; // Default: 2 hours
    try {
      const body = await req.json();
      if (body.hoursThreshold && typeof body.hoursThreshold === 'number') {
        hoursThreshold = Math.max(1, Math.min(body.hoursThreshold, 72)); // Clamp between 1-72 hours
      }
    } catch {
      // Use default if no body
    }

    console.log(`[cleanup-stale-translations] Cleaning up jobs older than ${hoursThreshold} hours`);

    // Find stale translations (processing/pending for more than threshold hours)
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const { data: staleJobs, error: fetchError } = await supabase
      .from('translation_history')
      .select('id, project_id, technique_id, provider, target_language, started_at')
      .in('status', ['processing', 'pending'])
      .lt('started_at', thresholdDate.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch stale jobs: ${fetchError.message}`);
    }

    if (!staleJobs || staleJobs.length === 0) {
      console.log('[cleanup-stale-translations] No stale jobs found');
      return new Response(
        JSON.stringify({
          success: true,
          message: "No stale jobs found",
          cleanedCount: 0,
          jobs: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[cleanup-stale-translations] Found ${staleJobs.length} stale jobs`);

    // Update stale jobs to failed status
    const { error: updateError } = await supabase
      .from('translation_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .in('id', staleJobs.map(job => job.id));

    if (updateError) {
      throw new Error(`Failed to update stale jobs: ${updateError.message}`);
    }

    const jobsSummary = staleJobs.map(job => ({
      projectId: job.project_id,
      provider: job.provider,
      targetLanguage: job.target_language,
      startedAt: job.started_at,
    }));

    console.log(`[cleanup-stale-translations] Successfully cleaned up ${staleJobs.length} jobs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${staleJobs.length} stale translation jobs`,
        cleanedCount: staleJobs.length,
        jobs: jobsSummary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[cleanup-stale-translations] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
