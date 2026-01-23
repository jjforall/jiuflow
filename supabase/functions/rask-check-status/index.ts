import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Rask.ai OAuth token
async function getRaskAccessToken(): Promise<string> {
  const clientId = Deno.env.get("RASK_AI_CLIENT_ID");
  const clientSecret = Deno.env.get("RASK_AI_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Rask.ai credentials not configured");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(
    "https://rask-prod.auth.us-east-2.amazoncognito.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "api/source api/input api/output api/limit",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Rask auth error:", response.status, errorText);
    throw new Error(`Rask.ai authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Upload video to Cloudflare Stream
async function uploadToCloudflare(
  videoUrl: string,
  videoName: string
): Promise<string> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare credentials not configured");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: videoUrl,
        meta: { name: videoName },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare upload failed: ${errorText}`);
  }

  const data = await response.json();
  const videoId = data.result.uid;
  
  // Generate manifest URL
  const customerSubdomain = `customer-${accountId.substring(0, 8)}`;
  return `https://${customerSubdomain}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
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

    // Get Rask.ai access token
    const accessToken = await getRaskAccessToken();

    // Check project status
    const statusResponse = await fetch(`https://api.rask.ai/v2/projects/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Rask status check error:", statusResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to check Rask.ai project status", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await statusResponse.json();
    console.log("Rask project status:", projectData);

    const status = projectData.status;
    let progress = 0;
    let statusMessage = "";
    let videoUrl: string | null = null;

    // Map Rask.ai status to progress
    switch (status) {
      case "waiting":
        progress = 5;
        statusMessage = "Waiting to start...";
        break;
      case "uploading":
        progress = 10;
        statusMessage = "Uploading media...";
        break;
      case "transcribing":
        progress = 30;
        statusMessage = "Transcribing audio...";
        break;
      case "translating":
        progress = 50;
        statusMessage = "Translating content...";
        break;
      case "voice_cloning":
        progress = 70;
        statusMessage = "Cloning voices...";
        break;
      case "dubbing":
        progress = 85;
        statusMessage = "Dubbing video...";
        break;
      case "completed":
      case "done":
        progress = 100;
        statusMessage = "Translation completed!";
        
        // Get the dubbed video URL
        if (projectData.video_url || projectData.dubbed_url) {
          const dubbedUrl = projectData.video_url || projectData.dubbed_url;
          console.log("Dubbed video URL from Rask:", dubbedUrl);

          // Upload to Cloudflare Stream
          if (techniqueId && targetLanguage) {
            try {
              videoUrl = await uploadToCloudflare(
                dubbedUrl,
                `technique-${techniqueId}-${targetLanguage}`
              );
              console.log("Uploaded to Cloudflare:", videoUrl);

              // Update technique in database
              const supabaseUrl = Deno.env.get("SUPABASE_URL");
              const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

              if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);

                // Determine which video_url field to update
                const videoUrlField = `video_url_${targetLanguage}`;
                
                const { error: updateError } = await supabase
                  .from("techniques")
                  .update({ [videoUrlField]: videoUrl })
                  .eq("id", techniqueId);

                if (updateError) {
                  console.error("Failed to update technique:", updateError);
                } else {
                  console.log(`Updated technique ${techniqueId} with ${videoUrlField}: ${videoUrl}`);
                }
              }
            } catch (uploadError) {
              console.error("Failed to upload to Cloudflare:", uploadError);
            }
          }
        }
        break;
      case "failed":
      case "error":
        progress = 0;
        statusMessage = `Translation failed: ${projectData.error_message || "Unknown error"}`;
        break;
      default:
        progress = 20;
        statusMessage = `Processing: ${status}`;
    }

    return new Response(
      JSON.stringify({
        status,
        progress,
        statusMessage,
        videoUrl,
        completed: status === "completed" || status === "done",
        failed: status === "failed" || status === "error",
        rawData: projectData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rask status check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
