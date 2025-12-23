import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoStatus {
  techniqueId: string;
  name: string;
  seriesPrefix: string;
  seriesOrder: number | null;
  cloudflareVideoId: string;
  status: string;
  readyToStream: boolean;
  inputWidth: number;
  inputHeight: number;
  duration: number;
  isProperlyEncoded: boolean;
  qualityLevels: number;
  qualityHeights: number[];
  error?: string;
}

// Parse HLS manifest to count quality levels
async function parseHlsManifest(
  manifestUrl: string,
  videoIdForLog: string
): Promise<{ levels: number; heights: number[]; ok: boolean; status?: number }>
{
  try {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
      console.log(
        `[CHECK-ENCODING] Failed to fetch manifest for ${videoIdForLog}: ${response.status} (${manifestUrl})`
      );
      return { levels: 0, heights: [], ok: false, status: response.status };
    }

    const manifest = await response.text();

    // Parse RESOLUTION tags from HLS master manifest
    const resolutionMatches = manifest.matchAll(/RESOLUTION=\d+x(\d+)/g);
    const heights: number[] = [];

    for (const match of resolutionMatches) {
      const height = parseInt(match[1]);
      if (!Number.isNaN(height) && !heights.includes(height)) {
        heights.push(height);
      }
    }

    heights.sort((a, b) => b - a); // Sort descending

    console.log(
      `[CHECK-ENCODING] Video ${videoIdForLog} has ${heights.length} quality levels: ${heights.join(", ")}`
    );

    return { levels: heights.length, heights, ok: true };
  } catch (error) {
    console.error(
      `[CHECK-ENCODING] Error parsing manifest for ${videoIdForLog}:`,
      error
    );
    return { levels: 0, heights: [], ok: false };
  }
}

function extractCloudflareVideoId(videoUrl: string): string | null {
  const patterns = [
    /cloudflarestream\.com\/([a-f0-9]{32})\//i,
    /videodelivery\.net\/([a-f0-9]{32})\//i,
    /iframe\.videodelivery\.net\/([a-f0-9]{32})/i,
  ];

  for (const pattern of patterns) {
    const match = videoUrl.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("[CHECK-ENCODING] Missing Cloudflare credentials");
    return new Response(
      JSON.stringify({ error: "Cloudflare Stream not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check admin authorization
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    console.log(`[CHECK-ENCODING] Admin user authenticated: ${user.id}`);

    const body = await req.json().catch(() => ({}));
    const { action, videoId } = body;

    if (action === "check-all") {
      // Get all techniques with Cloudflare video URLs
      const { data: techniques, error: dbError } = await supabaseClient
        .from('techniques')
        .select('id, name_ja, series_prefix, series_order, video_url')
        .not('video_url', 'is', null)
        .or('video_url.ilike.%cloudflarestream.com%,video_url.ilike.%videodelivery.net%')
        .order('series_prefix')
        .order('series_order');

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log(`[CHECK-ENCODING] Found ${techniques?.length || 0} techniques with Cloudflare videos`);

      const results: VideoStatus[] = [];
      const notEncoded: VideoStatus[] = [];

      for (const technique of techniques || []) {
        // Extract video ID from URL
        const videoUrl = String(technique.video_url || '');
        const cfVideoId = extractCloudflareVideoId(videoUrl);

        if (!cfVideoId) {
          results.push({
            techniqueId: technique.id,
            name: technique.name_ja,
            seriesPrefix: technique.series_prefix || '',
            seriesOrder: technique.series_order,
            cloudflareVideoId: 'UNKNOWN',
            status: 'unknown',
            readyToStream: false,
            inputWidth: 0,
            inputHeight: 0,
            duration: 0,
            isProperlyEncoded: false,
            qualityLevels: 0,
            qualityHeights: [],
            error: 'Could not extract video ID from URL',
          });
          continue;
        }
        try {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cfVideoId}`,
            {
              headers: {
                "Authorization": `Bearer ${apiToken}`,
              },
            }
          );

          const result = await response.json();

          if (!result.success) {
            results.push({
              techniqueId: technique.id,
              name: technique.name_ja,
              seriesPrefix: technique.series_prefix || '',
              seriesOrder: technique.series_order,
              cloudflareVideoId: cfVideoId,
              status: 'error',
              readyToStream: false,
              inputWidth: 0,
              inputHeight: 0,
              duration: 0,
              isProperlyEncoded: false,
              qualityLevels: 0,
              qualityHeights: [],
              error: result.errors?.[0]?.message || 'API error',
            });
            continue;
          }

          const video = result.result;

          // Use the technique URL (or fallback) to fetch the HLS master manifest and count variants
          const manifestUrl =
            (typeof technique.video_url === "string" && technique.video_url.includes(".m3u8")
              ? technique.video_url
              : `https://videodelivery.net/${cfVideoId}/manifest/video.m3u8`);

          const manifestInfo = await parseHlsManifest(manifestUrl, cfVideoId);

          const isStreamReady =
            video.readyToStream &&
            video.status?.state === "ready" &&
            video.input?.width > 0 &&
            video.input?.height > 0;

          // Consider it has ABR if it has more than 1 quality level
          const hasMultipleQualities = manifestInfo.levels > 1;
          const isProperlyEncoded = isStreamReady && hasMultipleQualities;

          const status: VideoStatus = {
            techniqueId: technique.id,
            name: technique.name_ja,
            seriesPrefix: technique.series_prefix || '',
            seriesOrder: technique.series_order,
            cloudflareVideoId: cfVideoId,
            status: video.status?.state || 'unknown',
            readyToStream: video.readyToStream || false,
            inputWidth: video.input?.width || 0,
            inputHeight: video.input?.height || 0,
            duration: video.duration || 0,
            isProperlyEncoded,
            qualityLevels: manifestInfo.levels,
            qualityHeights: manifestInfo.heights,
            ...(manifestInfo.ok
              ? {}
              : {
                  error: `manifest_fetch_failed${manifestInfo.status ? ` (${manifestInfo.status})` : ''}`,
                }),
          };

          results.push(status);

          if (!status.isProperlyEncoded) {
            notEncoded.push(status);
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          results.push({
            techniqueId: technique.id,
            name: technique.name_ja,
            seriesPrefix: technique.series_prefix || '',
            seriesOrder: technique.series_order,
            cloudflareVideoId: cfVideoId,
            status: 'error',
            readyToStream: false,
            inputWidth: 0,
            inputHeight: 0,
            duration: 0,
            isProperlyEncoded: false,
            qualityLevels: 0,
            qualityHeights: [],
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(`[CHECK-ENCODING] Checked ${results.length} videos, ${notEncoded.length} not properly encoded`);

      return new Response(
        JSON.stringify({
          total: results.length,
          properlyEncoded: results.length - notEncoded.length,
          notEncoded: notEncoded.length,
          notEncodedVideos: notEncoded,
          allVideos: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "re-encode" && videoId) {
      // Enable downloads for the video
      console.log(`[CHECK-ENCODING] Enabling downloads for video: ${videoId}`);
      
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
      console.log(`[CHECK-ENCODING] Download enable result:`, JSON.stringify(downloadResult));

      // Wait a bit for download to be prepared
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the download URL
      const getResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const getResult = await getResponse.json();
      console.log(`[CHECK-ENCODING] Get downloads result:`, JSON.stringify(getResult));

      if (!getResult.success || !getResult.result?.default?.url) {
        // Check video details for preview URL
        const videoResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
          {
            headers: {
              "Authorization": `Bearer ${apiToken}`,
            },
          }
        );

        const videoResult = await videoResponse.json();
        
        return new Response(
          JSON.stringify({
            success: false,
            message: "Download URL not ready. Downloads may need more time to process.",
            videoId,
            downloadStatus: getResult.result?.default?.status || "unknown",
            videoStatus: videoResult.result?.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const downloadUrl = getResult.result.default.url;

      // Get original video details for metadata
      const videoResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        }
      );

      const videoResult = await videoResponse.json();
      const originalVideo = videoResult.result;

      // Copy the video to create a new encoded version
      console.log(`[CHECK-ENCODING] Copying video from: ${downloadUrl}`);
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
              name: originalVideo?.meta?.name || `Re-encoded from ${videoId}`,
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

      console.log(`[CHECK-ENCODING] Video re-encoded. New ID: ${copyResult.result.uid}`);

      return new Response(
        JSON.stringify({
          success: true,
          originalVideoId: videoId,
          newVideoId: copyResult.result.uid,
          newPlaybackUrl: `https://videodelivery.net/${copyResult.result.uid}/manifest/video.m3u8`,
          status: copyResult.result.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check-all' or 're-encode'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-ENCODING] Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
