import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenEndpoint = "https://rask-prod.auth.us-east-2.amazoncognito.com/oauth2/token";
  
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "api/source api/input api/output api/limit",
  });

  console.log("Fetching OAuth2 token from Rask.ai...");
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OAuth2 token error:", response.status, errorText);
    throw new Error(`Failed to get OAuth2 token: ${errorText}`);
  }

  const data = await response.json();
  console.log("OAuth2 token obtained successfully");
  return data.access_token;
}

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

    const RASK_AI_CLIENT_ID = Deno.env.get("RASK_AI_CLIENT_ID");
    const RASK_AI_CLIENT_SECRET = Deno.env.get("RASK_AI_CLIENT_SECRET");
    
    if (!RASK_AI_CLIENT_ID || !RASK_AI_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_CLIENT_ID and RASK_AI_CLIENT_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting video translation:", { videoUrl, sourceLanguage, targetLanguage, techniqueId });

    // Get OAuth2 access token
    const accessToken = await getOAuthToken(RASK_AI_CLIENT_ID, RASK_AI_CLIENT_SECRET);

    // Step 1: Upload media by link (正しいエンドポイント)
    console.log("Step 1: Uploading media by link...");
    const uploadResponse = await fetch("https://api.rask.ai/api/library/v1/media/link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        link: videoUrl,
        kind: "video",
        name: `Technique ${techniqueId}`,
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
    const videoId = uploadData.id;
    console.log("Media uploaded successfully:", videoId);

    // Step 2: Create project (正しいエンドポイント)
    console.log("Step 2: Creating project...");
    const createProjectResponse = await fetch("https://api.rask.ai/v2/projects", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_id: videoId,
        name: `Technique ${techniqueId} - ${targetLanguage}`,
        src_lang: sourceLanguage || "ja",
        dst_lang: targetLanguage,
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
