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

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("[CLOUDFLARE-STREAM] Missing credentials");
    return new Response(
      JSON.stringify({ error: "Cloudflare Stream not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    console.log(`[CLOUDFLARE-STREAM] User authenticated: ${user.id}`);

    const body = await req.json();
    const { action, videoId } = body;

    if (action === "get-upload-url") {
      // Get a direct upload URL from Cloudflare Stream
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxDurationSeconds: 600, // 10 minutes max
            requireSignedURLs: false,
            creator: user.id,
            meta: {
              userId: user.id,
              uploadedAt: new Date().toISOString(),
            },
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        console.error("[CLOUDFLARE-STREAM] Failed to get upload URL:", result.errors);
        throw new Error(result.errors?.[0]?.message || "Failed to get upload URL");
      }

      console.log(`[CLOUDFLARE-STREAM] Upload URL created for video: ${result.result.uid}`);

      // Create playback URL with account ID
      const playbackUrl = `https://customer-${accountId}.cloudflarestream.com/${result.result.uid}/manifest/video.m3u8`;

      return new Response(
        JSON.stringify({
          uploadUrl: result.result.uploadURL,
          videoId: result.result.uid,
          playbackUrl: playbackUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-video-status") {
      if (!videoId) {
        throw new Error("videoId is required");
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || "Failed to get video status");
      }

      const video = result.result;

      return new Response(
        JSON.stringify({
          status: video.status?.state || "unknown",
          ready: video.readyToStream || false,
          playbackUrl: video.playback?.hls || null,
          dashUrl: video.playback?.dash || null,
          thumbnail: video.thumbnail || null,
          duration: video.duration || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-video-details") {
      // Get detailed video info including encoding qualities
      if (!videoId) {
        throw new Error("videoId is required");
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || "Failed to get video details");
      }

      const video = result.result;
      
      console.log(`[CLOUDFLARE-STREAM] Video details for ${videoId}:`, JSON.stringify(video, null, 2));

      return new Response(
        JSON.stringify({
          videoId: video.uid,
          status: video.status,
          readyToStream: video.readyToStream,
          input: video.input,
          playback: video.playback,
          size: video.size,
          duration: video.duration,
          created: video.created,
          modified: video.modified,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-download-url") {
      // Get downloadable URL for migration to Bunny
      if (!videoId) {
        throw new Error("videoId is required");
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        // Try to get existing download URL
        const getResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
          {
            headers: {
              "Authorization": `Bearer ${apiToken}`,
            },
          }
        );
        const getResult = await getResponse.json();
        
        if (getResult.success && getResult.result?.preview) {
          return new Response(
            JSON.stringify({
              downloadUrl: getResult.result.preview,
              message: "Using preview URL",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(result.errors?.[0]?.message || "Failed to get download URL");
      }

      return new Response(
        JSON.stringify({
          downloadUrl: result.result?.default?.url || null,
          status: result.result?.default?.status || "unknown",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CLOUDFLARE-STREAM] Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
