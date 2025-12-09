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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { action, videoId, title } = body;

    if (action === "create-video") {
      // Create a new video in Bunny Stream library
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
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bunny create video error:", errorText);
        throw new Error(`Failed to create video: ${response.status}`);
      }

      const videoData = await response.json();
      console.log("Created Bunny video:", videoData.guid);

      return new Response(
        JSON.stringify({
          videoId: videoData.guid,
          libraryId: BUNNY_LIBRARY_ID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-upload-url") {
      // Get TUS upload URL for the video
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
        throw new Error(`Failed to get video info: ${response.status}`);
      }

      // Return the direct upload endpoint
      return new Response(
        JSON.stringify({
          uploadUrl: `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
          apiKey: BUNNY_API_KEY,
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
      // For HLS/thumbnail, Bunny uses a specific CDN format
      const cdnBase = `https://vz-558812.b-cdn.net`;
      
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
