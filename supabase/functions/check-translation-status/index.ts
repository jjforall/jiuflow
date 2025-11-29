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
    const { projectId, targetLanguage } = await req.json();

    if (!projectId || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "projectId and targetLanguage are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RASK_AI_CLIENT_ID = Deno.env.get("RASK_AI_CLIENT_ID");
    const RASK_AI_CLIENT_SECRET = Deno.env.get("RASK_AI_CLIENT_SECRET");
    
    if (!RASK_AI_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_CLIENT_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!RASK_AI_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_CLIENT_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking translation status:", { projectId, targetLanguage });

    // Get OAuth2 access token
    const accessToken = await getOAuthToken(RASK_AI_CLIENT_ID, RASK_AI_CLIENT_SECRET);

    // Get project status
    const statusResponse = await fetch(`https://api.rask.ai/v1/project/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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
