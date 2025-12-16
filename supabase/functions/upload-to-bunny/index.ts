import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error("Bunny.net credentials not configured");
    }

    // Authenticate user with retry logic for transient failures
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Retry auth up to 3 times for transient failures
    let user = null;
    let authError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabaseClient.auth.getUser();
      user = result.data?.user;
      authError = result.error;
      if (user) break;
      if (attempt < 2) {
        console.log(`Auth attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (authError || !user) {
      console.error("Auth failed after retries:", authError?.message);
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { action, videoId, title } = body;

    if (action === "create-video") {
      // Create a new video in Bunny Stream library with transcoding enabled
      const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: "POST",
          headers: {
            "AccessKey": BUNNY_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title || `Video_${Date.now()}`,
            // Ensure transcoding is enabled for adaptive bitrate streaming
            enabledResolutions: "240p,360p,480p,720p,1080p",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bunny create video error:", errorText);
        throw new Error(`Failed to create video: ${response.status}`);
      }

      const videoData = await response.json();
      console.log("Created Bunny video with transcoding:", videoData.guid, "resolutions:", videoData.enabledResolutions);

      return new Response(
        JSON.stringify({
          videoId: videoData.guid,
          libraryId: BUNNY_LIBRARY_ID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reencode-video") {
      // Re-encode existing video to ensure all resolutions are available
      const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}/reencode`,
        {
          method: "POST",
          headers: {
            "AccessKey": BUNNY_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bunny reencode error:", errorText);
        throw new Error(`Failed to reencode video: ${response.status}`);
      }

      console.log("Re-encoding started for video:", videoId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Re-encoding started",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-upload-url") {
      // Create a signature for TUS upload (expires in 24 hours)
      const expirationTime = Math.floor(Date.now() / 1000) + 86400;
      
      // For Bunny Stream TUS uploads, we need to create an authorization signature
      // The signature format is: SHA256(library_id + api_key + expiration_time + video_id)
      const encoder = new TextEncoder();
      const data = encoder.encode(BUNNY_LIBRARY_ID + BUNNY_API_KEY + expirationTime + videoId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Return TUS upload endpoint with signature
      return new Response(
        JSON.stringify({
          tusEndpoint: `https://video.bunnycdn.com/tusupload`,
          videoId: videoId,
          libraryId: BUNNY_LIBRARY_ID,
          expirationTime: expirationTime,
          signature: signature,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-video-status") {
      // Get video processing status
      const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
          method: "GET",
          headers: {
            "AccessKey": BUNNY_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bunny get status error:", errorText);
        throw new Error(`Failed to get video status: ${response.status}`);
      }

      const videoData = await response.json();
      console.log("Video status data:", JSON.stringify(videoData));
      
      // Status: 0 = created, 1 = uploaded, 2 = processing, 3 = transcoding, 4 = finished, 5 = error
      const isReady = videoData.status === 4;
      // Also consider status 3 (transcoding) as still processing but progressing
      const isProcessing = videoData.status === 2 || videoData.status === 3;
      
      // Use library ID for embed URL (this is correct format)
      const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
      // For HLS/thumbnail, Bunny uses a CDN format with library ID
      const cdnBase = `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net`;
      
      return new Response(
        JSON.stringify({
          ready: isReady,
          status: videoData.status,
          isProcessing,
          encodeProgress: videoData.encodeProgress || 0,
          playbackUrl: isReady ? embedUrl : null,
          hlsUrl: isReady ? `${cdnBase}/${videoId}/playlist.m3u8` : null,
          thumbnailUrl: isReady ? `${cdnBase}/${videoId}/thumbnail.jpg` : null,
          duration: videoData.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
