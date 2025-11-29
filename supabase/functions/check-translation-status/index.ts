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
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
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

    console.log("Checking status for project:", projectId);

    // Get OAuth2 access token
    const accessToken = await getOAuthToken(RASK_AI_CLIENT_ID, RASK_AI_CLIENT_SECRET);

    // Get project status (正しいエンドポイント)
    const statusRes = await fetch(`https://api.rask.ai/v2/projects/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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

    const projectData = await statusRes.json();
    console.log("Project status:", projectData.status);
    console.log("Project progress:", projectData.progress);

    // statusフィールドを確認
    const isCompleted = projectData.status === "completed" || projectData.status === "done";
    const videoUrl = isCompleted ? projectData.translated_video : null;
    const progress = projectData.progress || 0;

    return new Response(
      JSON.stringify({
        status: projectData.status,
        videoUrl,
        progress,
        message: isCompleted 
          ? "Translation completed" 
          : `Translation in progress: ${projectData.status}`,
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
