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
    const { videoUrl, sourceLanguage, targetLanguage, techniqueId } = await req.json();

    if (!videoUrl || !targetLanguage || !techniqueId) {
      return new Response(
        JSON.stringify({ error: "videoUrl, targetLanguage, and techniqueId are required" }),
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

    const headers = {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    };

    console.log("Starting translation:", { targetLanguage, techniqueId });

    // Step 1: Create project
    console.log("Step 1: Creating project...");
    const projectRes = await fetch(`${RASK_API_BASE}/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: `Technique ${techniqueId} - ${targetLanguage}` }),
    });

    if (!projectRes.ok) {
      const error = await projectRes.text();
      console.error("Project creation error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create project", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const project = await projectRes.json();
    const projectId = project.data.id;
    console.log("Project created:", projectId);

    // Step 2: Upload video file
    console.log("Step 2: Uploading video...");
    const videoRes = await fetch(videoUrl);
    const videoBlob = await videoRes.blob();
    
    const uploadRes = await fetch(`${RASK_API_BASE}/projects/${projectId}/files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "video/mp4",
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      console.error("Upload error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to upload video", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Video uploaded successfully");

    // Step 3: Start translation
    console.log("Step 3: Starting translation...");
    const processRes = await fetch(`${RASK_API_BASE}/projects/${projectId}/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: sourceLanguage || "ja",
        to: targetLanguage,
        type: "dubbing",
      }),
    });

    if (!processRes.ok) {
      const error = await processRes.text();
      console.error("Process error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to start translation", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Translation started successfully");

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Translation started successfully",
        targetLanguage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
