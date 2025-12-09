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

async function uploadToCloudflare(
  videoUrl: string,
  videoName: string,
  accountId: string,
  apiToken: string
): Promise<string> {
  console.log(`Uploading translated video to Cloudflare: ${videoName}`);
  
  const copyResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        meta: { name: videoName },
      }),
    }
  );

  if (!copyResponse.ok) {
    const errorText = await copyResponse.text();
    console.error("Cloudflare copy failed:", errorText);
    throw new Error(`Cloudflare upload failed: ${errorText}`);
  }

  const copyData = await copyResponse.json();
  const videoUid = copyData.result.uid;
  console.log(`Cloudflare is copying video, UID: ${videoUid}`);

  // Return HLS manifest URL
  return `https://customer-${accountId}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, techniqueId, targetLanguage } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RASK_AI_CLIENT_ID = Deno.env.get("RASK_AI_CLIENT_ID");
    const RASK_AI_CLIENT_SECRET = Deno.env.get("RASK_AI_CLIENT_SECRET");
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!RASK_AI_CLIENT_ID || !RASK_AI_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_CLIENT_ID and RASK_AI_CLIENT_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking status for project:", projectId);

    // Get OAuth2 access token
    const accessToken = await getOAuthToken(RASK_AI_CLIENT_ID, RASK_AI_CLIENT_SECRET);

    // Get project status
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
    console.log("Full project data:", JSON.stringify(projectData, null, 2));

    // Check if completed
    const isCompleted = projectData.status === "completed" || 
                       projectData.status === "done" || 
                       projectData.status === "merging_done";
    
    // Get translated video URL
    let videoUrl = isCompleted 
      ? (projectData.translated_video || projectData.output_url || projectData.video_url)
      : null;
    
    const progress = projectData.progress || (isCompleted ? 100 : 0);
    
    console.log("Video URL extracted:", videoUrl);

    // If completed and we have a video URL, upload to Cloudflare
    if (isCompleted && videoUrl && techniqueId && targetLanguage) {
      if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
        console.error("Cloudflare credentials not configured");
      } else {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          
          // Get technique name for video title
          const { data: technique } = await supabase
            .from('techniques')
            .select('name_ja')
            .eq('id', techniqueId)
            .single();

          const videoName = `${technique?.name_ja || techniqueId} (${targetLanguage})`;
          
          // Upload to Cloudflare Stream
          const cloudflareUrl = await uploadToCloudflare(
            videoUrl,
            videoName,
            CLOUDFLARE_ACCOUNT_ID,
            CLOUDFLARE_STREAM_API_TOKEN
          );
          
          console.log(`Cloudflare URL: ${cloudflareUrl}`);

          // Determine which field to update based on target language
          const fieldMap: Record<string, string> = {
            ja: 'video_url_ja',
            en: 'video_url',
            pt: 'video_url_pt',
          };
          const updateField = fieldMap[targetLanguage] || `video_url_${targetLanguage}`;

          // Update technique with Cloudflare URL
          const { error: updateError } = await supabase
            .from('techniques')
            .update({ [updateField]: cloudflareUrl })
            .eq('id', techniqueId);

          if (updateError) {
            console.error("Failed to update technique:", updateError);
          } else {
            console.log(`Updated technique ${techniqueId} ${updateField} with Cloudflare URL`);
            videoUrl = cloudflareUrl; // Return the Cloudflare URL
          }
        } catch (cloudflareError) {
          console.error("Cloudflare upload error:", cloudflareError);
          // Continue with original URL if Cloudflare upload fails
        }
      }
    }

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