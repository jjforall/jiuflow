import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("Full dubbing data:", JSON.stringify(dubbingData, null, 2));

    // ElevenLabs dubbing statuses: "dubbing", "dubbed", "failed"
    const isCompleted = dubbingData.status === "dubbed";
    const isFailed = dubbingData.status === "failed";
    
    // Calculate progress based on status
    let progress = 0;
    if (isCompleted) {
      progress = 100;
    } else if (dubbingData.status === "dubbing") {
      // Estimate progress based on expected duration
      progress = 50; // Default to 50% while dubbing
    }

    let videoUrl = null;

    // If completed, get the dubbed audio/video file
    if (isCompleted && targetLanguage) {
      try {
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

        if (audioRes.ok) {
          // ElevenLabs returns the audio/video directly
          // We need to upload it to a storage location and get a URL
          // For now, we'll use a signed URL approach or direct streaming
          
          // Check if there's a media_metadata with video
          const mediaMetadata = dubbingData.media_metadata;
          console.log("Media metadata:", JSON.stringify(mediaMetadata, null, 2));

          // Try to get video URL if available
          // ElevenLabs may provide a download URL or we need to stream it
          if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_STREAM_API_TOKEN && techniqueId) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            
            // Get technique name for video title
            const { data: technique } = await supabase
              .from('techniques')
              .select('name_ja')
              .eq('id', techniqueId)
              .single();

            const videoName = `${technique?.name_ja || techniqueId} (${targetLanguage})`;

            // For ElevenLabs, we need to download the audio and upload to Cloudflare
            // The audio endpoint returns the dubbed audio directly
            // For video with preserved original video track, we may need a different approach
            
            // Check content type to determine if it's video or audio
            const contentType = audioRes.headers.get("content-type");
            console.log("Content type from ElevenLabs:", contentType);

            if (contentType?.includes("video") || contentType?.includes("mp4")) {
              // It's a video file, upload directly to Cloudflare
              const audioBuffer = await audioRes.arrayBuffer();
              
              // Create a Blob URL or use a temporary storage
              // For now, let's try direct upload using the stream
              console.log("Received video file, size:", audioBuffer.byteLength);
              
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
                videoUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${cloudflareVideoId}/manifest/video.m3u8`;
                console.log("Uploaded to Cloudflare:", videoUrl);

                // Update technique with Cloudflare URL
                const fieldMap: Record<string, string> = {
                  ja: 'video_url_ja',
                  en: 'video_url',
                  pt: 'video_url_pt',
                };
                const updateField = fieldMap[targetLanguage] || `video_url_${targetLanguage}`;

                const { error: updateError } = await supabase
                  .from('techniques')
                  .update({ [updateField]: videoUrl })
                  .eq('id', techniqueId);

                if (updateError) {
                  console.error("Failed to update technique:", updateError);
                } else {
                  console.log(`Updated technique ${techniqueId} ${updateField} with Cloudflare URL`);
                }
              } else {
                const cfError = await cfUploadRes.text();
                console.error("Cloudflare upload failed:", cfError);
              }
            } else {
              console.log("Received audio-only file, content type:", contentType);
              // Audio-only response - may need to merge with original video
              // For now, log and continue
            }
          }
        } else {
          const audioError = await audioRes.text();
          console.error("Failed to get dubbed file:", audioError);
        }
      } catch (dubbedFileError) {
        console.error("Error getting dubbed file:", dubbedFileError);
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
  } catch (error: any) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
