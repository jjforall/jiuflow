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

    // HeyGen API returns video_translate_id WITH language suffix (e.g., abc123-en)
    // The suffix should NOT be removed - HeyGen expects the full ID including suffix
    const heygenProjectId = projectId;
    
    console.log("[heygen-check-status] Using projectId directly:", heygenProjectId);
    // Check translation status - use v2 API with path parameter (per official docs)
    const statusResponse = await fetch(
      `https://api.heygen.com/v2/video_translate/${heygenProjectId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": heygenApiKey,
        },
      }
    );

    // Check if response is HTML (error page) vs JSON
    const contentType = statusResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await statusResponse.text();
      console.error("[heygen-check-status] Non-JSON response:", text.substring(0, 500));
      throw new Error(`HeyGen returned non-JSON response (status ${statusResponse.status})`);
    }

    const statusData = await statusResponse.json();
    console.log("[heygen-check-status] HeyGen status response:", JSON.stringify(statusData).substring(0, 1000));

    // Handle HeyGen API errors more gracefully
    if (!statusResponse.ok || statusData.error) {
      const errorMessage = statusData.error?.message || statusData.message || "HeyGen status check failed";
      const errorCode = statusData.error?.code || "unknown";
      
      // Check for specific error cases
      if (errorMessage.includes("not found") || errorCode === "internal_error") {
        // Check if job has been running for more than 2 hours - if so, mark as failed
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Look up the job in translation_history using the original projectId (with suffix)
          const { data: historyData } = await supabase
            .from('translation_history')
            .select('started_at, id')
            .eq('project_id', projectId)
            .single();
          
          if (historyData?.started_at) {
            const elapsedHours = (Date.now() - new Date(historyData.started_at).getTime()) / (1000 * 60 * 60);
            
            // Reduced timeout from 2 hours to 1 hour for faster detection of stuck jobs
            if (elapsedHours > 1) {
              console.log(`[heygen-check-status] Job ${projectId} has been pending for ${elapsedHours.toFixed(1)} hours - marking as failed`);
              
              // Update the job status to failed
              await supabase
                .from('translation_history')
                .update({ 
                  status: 'failed', 
                  completed_at: new Date().toISOString(),
                })
                .eq('id', historyData.id);
              
              return new Response(
                JSON.stringify({
                  status: "failed",
                  progress: 0,
                  statusMessage: "翻訳ジョブがHeyGenで見つかりません（タイムアウト）",
                  videoUrl: null,
                  completed: false,
                  failed: true,
                  error: "Translation job not found in HeyGen after 2 hours (likely expired or never created)",
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
          }
        }
        
        // Job is less than 2 hours old - may still be propagating
        console.log("[heygen-check-status] Job not found yet - may be propagation delay");
        return new Response(
          JSON.stringify({
            status: "pending",
            progress: 5,
            statusMessage: "翻訳ジョブを初期化中です。しばらくお待ちください...",
            videoUrl: null,
            completed: false,
            failed: false,
            pendingRegistration: true,
            error: null,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(errorMessage);
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
        // HeyGen v2 API returns 'url' field for translated video
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
    // HeyGen v2 API uses 'url' field for the translated video
    const translatedVideoUrl = data?.url || data?.video_url;
    if (completed && translatedVideoUrl && techniqueId && targetLanguage) {
      console.log("[heygen-check-status] Translation completed, uploading to Cloudflare...");
      console.log("[heygen-check-status] Translated video URL:", translatedVideoUrl);

      try {
        // Upload to Cloudflare Stream
        const cloudflareUrl = await uploadToCloudflare(
          translatedVideoUrl,
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

          // 他のプロバイダーと同じ形式で保存: video_metadata[lang].video_url
          const updatedMetadata = {
            ...existingMetadata,
            [targetLanguage]: {
              video_url: cloudflareUrl,
              provider: "heygen",
              created_at: new Date().toISOString(),
            },
          };

          // Update with merged metadata
          const { error: updateError } = await supabase
            .from("techniques")
            .update({
              video_metadata: updatedMetadata,
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
