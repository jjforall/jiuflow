import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, targetLanguage } = await req.json();

    if (!projectId || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "projectId and targetLanguage are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RASK_AI_API_KEY = Deno.env.get("RASK_AI_API_KEY");
    if (!RASK_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking translation status:", { projectId, targetLanguage });

    // Get project status
    const statusResponse = await fetch(`https://api.rask.ai/v2/project/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${RASK_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Rask.ai status check error:", statusResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to check translation status", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await statusResponse.json();
    console.log("Project status:", projectData);

    // Check if translation is complete
    const translation = projectData.translations?.find((t: any) => t.language === targetLanguage);
    
    if (!translation) {
      return new Response(
        JSON.stringify({ 
          status: "not_found",
          message: "Translation not found for target language"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = {
      status: translation.status, // e.g., "processing", "completed", "failed"
      videoUrl: translation.video_url || null,
      progress: translation.progress || 0,
      message: translation.status === "completed" 
        ? "Translation completed successfully"
        : `Translation in progress: ${translation.progress || 0}%`,
    };

    return new Response(
      JSON.stringify(response),
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
