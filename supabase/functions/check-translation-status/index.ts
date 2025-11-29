import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RASK_API_BASE = "https://api.rask.ai/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = Deno.env.get("RASK_AI_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking status for project:", projectId);

    // Step 4: Check status
    const statusRes = await fetch(`${RASK_API_BASE}/projects/${projectId}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!statusRes.ok) {
      const error = await statusRes.text();
      console.error("Status check error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check status", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusRes.json();
    console.log("Status:", statusData.status);

    // Step 5: Get result if completed
    let videoUrl = null;
    if (statusData.status === "completed") {
      const resultRes = await fetch(`${RASK_API_BASE}/projects/${projectId}/result`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (resultRes.ok) {
        const resultData = await resultRes.json();
        videoUrl = resultData.url;
        console.log("Result URL:", videoUrl);
      }
    }

    return new Response(
      JSON.stringify({
        status: statusData.status,
        videoUrl,
        progress: statusData.progress || 0,
        message: statusData.status === "completed" 
          ? "Translation completed" 
          : `In progress: ${statusData.progress || 0}%`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
