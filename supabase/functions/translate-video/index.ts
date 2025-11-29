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
    const { videoUrl, sourceLanguage, targetLanguage, techniqueId } = await req.json();

    if (!videoUrl || !targetLanguage || !techniqueId) {
      return new Response(
        JSON.stringify({ error: "videoUrl, targetLanguage, and techniqueId are required" }),
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

    console.log("Starting video translation:", { videoUrl, sourceLanguage, targetLanguage, techniqueId });

    // Step 1: Upload media by link
    console.log("Step 1: Uploading media...");
    const uploadResponse = await fetch("https://api.rask.ai/v2/media/upload/link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RASK_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        link: videoUrl,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Rask.ai upload error:", uploadResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload video to Rask.ai", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.id;
    console.log("Media uploaded successfully:", mediaId);

    // Step 2: Create project
    console.log("Step 2: Creating project...");
    const createProjectResponse = await fetch("https://api.rask.ai/v2/project", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RASK_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_id: mediaId,
        source_language: sourceLanguage || "ja",
        target_languages: [targetLanguage],
      }),
    });

    if (!createProjectResponse.ok) {
      const errorText = await createProjectResponse.text();
      console.error("Rask.ai project creation error:", createProjectResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create project in Rask.ai", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await createProjectResponse.json();
    const projectId = projectData.id;
    console.log("Project created successfully:", projectId);

    // Step 3: Generate translation
    console.log("Step 3: Generating translation...");
    const generateResponse = await fetch(`https://api.rask.ai/v2/project/${projectId}/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RASK_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_language: targetLanguage,
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Rask.ai generation error:", generateResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate translation", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Translation generation started successfully");

    // Update technique with project info for tracking
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store project ID in a metadata field or custom column
    // For now, we'll return the project ID to the frontend
    console.log("Translation process initiated for technique:", techniqueId);

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Translation started. Check project status to get the translated video URL.",
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
