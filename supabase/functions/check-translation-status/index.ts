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
    const { projectId, techniqueId, targetLanguage } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId (dubbing_id) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First check if video is already uploaded (avoid re-downloading on every poll)
    if (techniqueId && targetLanguage) {
      const { data: existingTechnique } = await supabase
        .from('techniques')
        .select('video_metadata')
        .eq('id', techniqueId)
        .single();

      const existingVideoUrl = existingTechnique?.video_metadata?.[targetLanguage]?.video_url;
      if (existingVideoUrl) {
        console.log(`Video already uploaded for ${targetLanguage}, returning cached URL`);
        return new Response(
          JSON.stringify({
            status: "dubbed",
            videoUrl: existingVideoUrl,
            progress: 100,
            message: "Translation completed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Checking dubbing status for:", projectId);

    // Get dubbing status from ElevenLabs
    const statusRes = await fetch(`https://api.elevenlabs.io/v1/dubbing/${projectId}`, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
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

    const dubbingData = await statusRes.json();
    console.log("Dubbing status:", dubbingData.status);

    // ElevenLabs dubbing statuses: "dubbing", "dubbed", "failed"
    const isCompleted = dubbingData.status === "dubbed";
    const isFailed = dubbingData.status === "failed";
    
    // Calculate progress based on status
    let progress = 0;
    if (isCompleted) {
      progress = 100;
    } else if (dubbingData.status === "dubbing") {
      progress = 50;
    }

    let videoUrl = null;

    // If completed, download and upload to Cloudflare
    if (isCompleted && targetLanguage && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_STREAM_API_TOKEN && techniqueId) {
      try {
        console.log("Downloading dubbed video from ElevenLabs...");
        
        // Get dubbed file from ElevenLabs
        const audioRes = await fetch(
          `https://api.elevenlabs.io/v1/dubbing/${projectId}/audio/${targetLanguage}`,
          {
            method: "GET",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
            },
          }
        );

        if (!audioRes.ok) {
          const audioError = await audioRes.text();
          console.error("Failed to get dubbed file:", audioError);
          // Still return success status, upload can be retried
          return new Response(
            JSON.stringify({
              status: dubbingData.status,
              videoUrl: null,
              progress: 100,
              message: "Translation completed, processing video...",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const contentType = audioRes.headers.get("content-type");
        console.log("Content type from ElevenLabs:", contentType);

        if (contentType?.includes("video") || contentType?.includes("mp4")) {
          const audioBuffer = await audioRes.arrayBuffer();
          console.log("Received video file, size:", audioBuffer.byteLength);
          
          // Get technique name for video title
          const { data: technique } = await supabase
            .from('techniques')
            .select('name_ja, video_metadata')
            .eq('id', techniqueId)
            .single();

          // Upload to Cloudflare using direct upload
          const uploadFormData = new FormData();
          uploadFormData.append("file", new Blob([audioBuffer], { type: "video/mp4" }), "dubbed_video.mp4");
          
          const cfUploadRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
              },
              body: uploadFormData,
            }
          );

          if (cfUploadRes.ok) {
            const cfData = await cfUploadRes.json();
            const cloudflareVideoId = cfData.result.uid;
            videoUrl = `https://videodelivery.net/${cloudflareVideoId}/manifest/video.m3u8`;
            console.log("Uploaded to Cloudflare:", videoUrl);

            // Save to video_metadata
            const existingMetadata = technique?.video_metadata || {};
            const updatedMetadata = {
              ...existingMetadata,
              [targetLanguage]: {
                video_url: videoUrl,
                provider: "elevenlabs",
                created_at: new Date().toISOString(),
              },
            };

            const { error: updateError } = await supabase
              .from('techniques')
              .update({ video_metadata: updatedMetadata })
              .eq('id', techniqueId);

            if (updateError) {
              console.error("Failed to update technique video_metadata:", updateError);
            } else {
              console.log(`Updated technique ${techniqueId} video_metadata.${targetLanguage}`);
            }
          } else {
            const cfError = await cfUploadRes.text();
            console.error("Cloudflare upload failed:", cfError);
          }
        } else {
          console.log("Received audio-only file, content type:", contentType);
        }
      } catch (uploadError) {
        console.error("Error during upload:", uploadError);
        // Don't fail the whole request, return status without video URL
      }
    }

    return new Response(
      JSON.stringify({
        status: dubbingData.status,
        videoUrl,
        progress,
        message: isCompleted 
          ? "Translation completed" 
          : isFailed
            ? `Translation failed: ${dubbingData.error || "Unknown error"}`
            : `Translation in progress: ${dubbingData.status}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
