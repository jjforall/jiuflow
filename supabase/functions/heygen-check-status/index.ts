import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function uploadToCloudflare(videoUrl: string, videoName: string): Promise<string> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare credentials not configured");
  }

  console.log("[uploadToCloudflare] Uploading video:", videoName);

  // Use copy endpoint to upload from URL
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: videoUrl,
        meta: { name: videoName },
      }),
    }
  );

  const data = await response.json();
  console.log("[uploadToCloudflare] Cloudflare response:", JSON.stringify(data).substring(0, 500));

  if (!data.success || !data.result?.uid) {
    throw new Error(`Cloudflare upload failed: ${JSON.stringify(data.errors)}`);
  }

  const videoId = data.result.uid;
  // Use stable videodelivery.net URL format (not customer subdomain which can vary)
  const manifestUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;

  console.log("[uploadToCloudflare] Upload complete, manifest URL:", manifestUrl);
  return manifestUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const { projectId, techniqueId, targetLanguage } = await req.json();

    console.log("[heygen-check-status] Request:", { projectId, techniqueId, targetLanguage });

    if (!projectId) {
      throw new Error("projectId is required");
    }

    // Check translation status
    const statusResponse = await fetch(
      `https://api.heygen.com/v1/video_translate/${projectId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": heygenApiKey,
        },
      }
    );

    const statusData = await statusResponse.json();
    console.log("[heygen-check-status] HeyGen status response:", JSON.stringify(statusData).substring(0, 1000));

    if (!statusResponse.ok || statusData.error) {
      throw new Error(statusData.error?.message || statusData.message || "HeyGen status check failed");
    }

    const data = statusData.data;
    const status = data?.status?.toLowerCase() || "unknown";

    // Map HeyGen status to our standard format
    let progress = 0;
    let statusMessage = "";
    let completed = false;
    let failed = false;

    switch (status) {
      case "pending":
        progress = 10;
        statusMessage = "待機中...";
        break;
      case "processing":
        progress = 50;
        statusMessage = "翻訳処理中...";
        break;
      case "completed":
      case "success":
        progress = 100;
        statusMessage = "完了";
        completed = true;
        break;
      case "failed":
      case "error":
        progress = 0;
        statusMessage = "エラーが発生しました";
        failed = true;
        break;
      default:
        progress = 25;
        statusMessage = `処理中: ${status}`;
    }

    let videoUrl: string | null = null;

    // If completed, upload to Cloudflare and update database
    if (completed && data.video_url && techniqueId && targetLanguage) {
      console.log("[heygen-check-status] Translation completed, uploading to Cloudflare...");

      try {
        // Upload to Cloudflare Stream
        const cloudflareUrl = await uploadToCloudflare(
          data.video_url,
          `technique-${techniqueId}-${targetLanguage}`
        );
        videoUrl = cloudflareUrl;

        // Update database
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);

          // First get existing metadata
          const { data: technique } = await supabase
            .from("techniques")
            .select("video_metadata")
            .eq("id", techniqueId)
            .single();

          const existingMetadata = technique?.video_metadata || {};
          const translations = existingMetadata.translations || {};

          // Add new translation
          translations[targetLanguage] = {
            url: cloudflareUrl,
            provider: "heygen",
            created_at: new Date().toISOString(),
          };

          // Update with merged metadata
          const { error: updateError } = await supabase
            .from("techniques")
            .update({
              video_metadata: {
                ...existingMetadata,
                translations,
              },
            })
            .eq("id", techniqueId);

          if (updateError) {
            console.error("[heygen-check-status] Database update error:", updateError);
          } else {
            console.log("[heygen-check-status] Database updated successfully");
          }
        }
      } catch (uploadError) {
        console.error("[heygen-check-status] Upload/update error:", uploadError);
        // Don't fail the whole request, just log the error
      }
    }

    return new Response(
      JSON.stringify({
        status,
        progress,
        statusMessage,
        videoUrl,
        completed,
        failed,
        rawData: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[heygen-check-status] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        failed: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
