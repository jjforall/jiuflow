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

      // Note: The actual playback URL will be obtained after upload completes
      // by calling get-video-status action which returns the correct playback.hls URL
      // The videoId is returned so client can poll for status
      return new Response(
        JSON.stringify({
          uploadUrl: result.result.uploadURL,
          videoId: result.result.uid,
          // Don't return playbackUrl here - it must be fetched after upload completes
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-tus-session") {
      const { fileSize, fileName, fileType, maxDurationSeconds } = body;

      if (!fileSize || typeof fileSize !== "number") {
        throw new Error("fileSize is required");
      }

      const safeFileName = String(fileName || `Video_${Date.now()}`);
      const safeFileType = String(fileType || "video/mp4");
      const safeMaxDurationSeconds = Number(maxDurationSeconds || 7200); // default 2 hours

      // Resumable uploads for files over 200MB must use tus via /stream?direct_user=true
      // Cloudflare expects Upload-Metadata values in base64.
      const uploadMetadata = [
        `name ${btoa(unescape(encodeURIComponent(safeFileName)))}`,
        `filetype ${btoa(unescape(encodeURIComponent(safeFileType)))}`,
        `maxDurationSeconds ${btoa(String(safeMaxDurationSeconds))}`,
      ].join(",");

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Tus-Resumable": "1.0.0",
            "Upload-Length": String(fileSize),
            "Upload-Metadata": uploadMetadata,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CLOUDFLARE-STREAM] Failed to create TUS session:", response.status, errorText);
        throw new Error(`Failed to create TUS session (${response.status})`);
      }

      const location = response.headers.get("Location") || response.headers.get("location");
      if (!location) {
        throw new Error("Failed to create TUS session (Location header missing)");
      }

      const uploadUrl = new URL(location, "https://upload.videodelivery.net").toString();

      // Cloudflare returns the media UID in stream-media-id header (when available)
      const streamMediaId =
        response.headers.get("stream-media-id") ||
        response.headers.get("Stream-Media-Id") ||
        response.headers.get("Stream-Media-ID");

      const inferredId = streamMediaId || uploadUrl.match(/([a-f0-9]{32})/i)?.[1] || null;

      console.log(`[CLOUDFLARE-STREAM] TUS session created for video: ${inferredId ?? "unknown"}`);

      return new Response(
        JSON.stringify({
          uploadUrl,
          videoId: inferredId,
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

    if (action === "list-all-videos") {
      // List all videos in the account with their encoding status
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?include_counts=true`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || "Failed to list videos");
      }

      const videos = result.result.map((video: any) => ({
        videoId: video.uid,
        name: video.meta?.name || "Unknown",
        status: video.status,
        readyToStream: video.readyToStream,
        input: video.input,
        duration: video.duration,
        created: video.created,
        size: video.size,
      }));

      console.log(`[CLOUDFLARE-STREAM] Listed ${videos.length} videos`);

      return new Response(
        JSON.stringify({
          total: result.result_info?.total_count || videos.length,
          videos,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "re-encode-video") {
      // Re-encode by copying the video from its download URL
      if (!videoId) {
        throw new Error("videoId is required");
      }

      // First, enable downloads for the video
      console.log(`[CLOUDFLARE-STREAM] Enabling downloads for video: ${videoId}`);
      const downloadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const downloadResult = await downloadResponse.json();
      console.log(`[CLOUDFLARE-STREAM] Download enable result:`, JSON.stringify(downloadResult));

      // Get the video details to find download URL
      const videoResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const videoResult = await videoResponse.json();
      
      if (!videoResult.success) {
        throw new Error(videoResult.errors?.[0]?.message || "Failed to get video details");
      }

      const video = videoResult.result;
      
      // Check if downloads are ready
      if (!downloadResult.success && !video.downloads?.default?.url) {
        return new Response(
          JSON.stringify({
            message: "Downloads not ready yet. Try again in a few minutes.",
            videoId,
            downloadStatus: downloadResult,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const downloadUrl = video.downloads?.default?.url || downloadResult.result?.default?.url;
      
      if (!downloadUrl) {
        return new Response(
          JSON.stringify({
            message: "Download URL not available. Video may need to be re-uploaded manually.",
            videoId,
            video: {
              status: video.status,
              readyToStream: video.readyToStream,
              input: video.input,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Copy the video to create a new encoded version
      console.log(`[CLOUDFLARE-STREAM] Copying video from: ${downloadUrl}`);
      const copyResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: downloadUrl,
            meta: {
              name: video.meta?.name || `Re-encoded from ${videoId}`,
              originalVideoId: videoId,
              reEncodedAt: new Date().toISOString(),
            },
          }),
        }
      );

      const copyResult = await copyResponse.json();

      if (!copyResult.success) {
        throw new Error(copyResult.errors?.[0]?.message || "Failed to copy video");
      }

      console.log(`[CLOUDFLARE-STREAM] Video copied successfully. New ID: ${copyResult.result.uid}`);

      return new Response(
        JSON.stringify({
          success: true,
          originalVideoId: videoId,
          newVideoId: copyResult.result.uid,
          newPlaybackUrl: copyResult.result.playback?.hls,
          status: copyResult.result.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-encoding-status") {
      // Check encoding status for a specific video
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
        throw new Error(result.errors?.[0]?.message || "Failed to get video");
      }

      const video = result.result;
      
      // Check if properly encoded (has multiple quality levels)
      const isProperlyEncoded = video.readyToStream && 
        video.status?.state === "ready" && 
        video.input?.width > 0;

      return new Response(
        JSON.stringify({
          videoId: video.uid,
          name: video.meta?.name || "Unknown",
          isProperlyEncoded,
          status: video.status,
          readyToStream: video.readyToStream,
          input: video.input,
          duration: video.duration,
          size: video.size,
          created: video.created,
          playback: video.playback,
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
