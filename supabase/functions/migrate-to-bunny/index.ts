import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationResult {
  id: string;
  name: string;
  source: string;
  status: "success" | "error" | "skipped";
  message: string;
  newVideoUrl?: string;
  newThumbnailUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error("Bunny.net credentials not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    
    // Admin check based on username or other criteria
    const isAdmin = profile?.username === "admin" || user.email?.includes("admin");
    if (!isAdmin) {
      // Also check user roles if available
      const { data: roles } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasAdminRole = roles?.some(r => r.role === "admin");
      if (!hasAdminRole) {
        throw new Error("Admin access required");
      }
    }

    const body = await req.json();
    const { action, techniqueId, dryRun = false } = body;

    // Get count of videos to migrate
    if (action === "get-count") {
      const { data: techniques, error } = await supabaseClient
        .from("techniques")
        .select("id, video_url, video_url_ja");

      if (error) throw error;

      let cloudflareCount = 0;
      let supabaseCount = 0;
      let bunnyCount = 0;

      techniques?.forEach((t) => {
        const urls = [t.video_url, t.video_url_ja].filter(Boolean);
        urls.forEach((url) => {
          if (url.includes("cloudflarestream.com") || url.includes("videodelivery.net")) {
            cloudflareCount++;
          } else if (url.includes("supabase.co/storage")) {
            supabaseCount++;
          } else if (url.includes("b-cdn.net") || url.includes("bunnycdn.com")) {
            bunnyCount++;
          }
        });
      });

      return new Response(
        JSON.stringify({
          cloudflareCount,
          supabaseCount,
          bunnyCount,
          totalToMigrate: cloudflareCount + supabaseCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Migrate all videos
    if (action === "migrate-all") {
      const { data: techniques, error } = await supabaseClient
        .from("techniques")
        .select("id, name_ja, video_url, video_url_ja, thumbnail_url")
        .order("series_prefix")
        .order("series_order");

      if (error) throw error;

      const results: MigrationResult[] = [];
      const cdnBase = `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net`;

      for (const technique of techniques || []) {
        const urls = [
          { field: "video_url", url: technique.video_url },
          { field: "video_url_ja", url: technique.video_url_ja },
        ].filter((u) => u.url);

        for (const { field, url } of urls) {
          // Skip if already on Bunny.net
          if (url.includes("b-cdn.net") || url.includes("bunnycdn.com")) {
            results.push({
              id: technique.id,
              name: technique.name_ja || "Unknown",
              source: "bunny",
              status: "skipped",
              message: "既にBunny.netにホストされています",
            });
            continue;
          }

          // Determine source platform
          let sourceUrl = "";
          let source = "";

          if (url.includes("cloudflarestream.com") || url.includes("videodelivery.net")) {
            // Extract Cloudflare video ID and get direct download URL
            const videoIdMatch = url.match(/\/([a-f0-9]{32})\/?/);
            if (videoIdMatch) {
              sourceUrl = `https://videodelivery.net/${videoIdMatch[1]}/downloads/default.mp4`;
              source = "cloudflare";
            }
          } else if (url.includes("supabase.co/storage")) {
            sourceUrl = url;
            source = "supabase";
          }

          if (!sourceUrl) {
            results.push({
              id: technique.id,
              name: technique.name_ja || "Unknown",
              source: "unknown",
              status: "skipped",
              message: "不明なURL形式",
            });
            continue;
          }

          if (dryRun) {
            results.push({
              id: technique.id,
              name: technique.name_ja || "Unknown",
              source,
              status: "success",
              message: `[DRY RUN] 移行対象: ${sourceUrl.substring(0, 50)}...`,
            });
            continue;
          }

          try {
            console.log(`Migrating ${technique.name_ja} from ${source}...`);

            // Step 1: Create video in Bunny
            const createResponse = await fetch(
              `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
              {
                method: "POST",
                headers: {
                  AccessKey: BUNNY_API_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: technique.name_ja || `Technique_${technique.id}`,
                  enabledResolutions: "240p,360p,480p,720p,1080p",
                }),
              }
            );

            if (!createResponse.ok) {
              const errorText = await createResponse.text();
              throw new Error(`Failed to create Bunny video: ${errorText}`);
            }

            const videoData = await createResponse.json();
            const bunnyVideoId = videoData.guid;
            console.log(`Created Bunny video: ${bunnyVideoId}`);

            // Step 2: Fetch video from source and upload to Bunny
            const fetchResponse = await fetch(
              `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}/fetch`,
              {
                method: "POST",
                headers: {
                  AccessKey: BUNNY_API_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: sourceUrl,
                }),
              }
            );

            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              console.error(`Fetch upload failed for ${technique.name_ja}:`, errorText);
              throw new Error(`Failed to fetch upload: ${errorText}`);
            }

            console.log(`Fetch upload initiated for ${bunnyVideoId}`);

            // Step 3: Generate new URLs
            const newVideoUrl = `${cdnBase}/${bunnyVideoId}/playlist.m3u8`;
            const newThumbnailUrl = `${cdnBase}/${bunnyVideoId}/thumbnail.jpg`;

            // Step 4: Update database with new URLs
            const updateData: Record<string, string> = {
              [field]: newVideoUrl,
            };
            
            // Also update thumbnail if it was the primary video
            if (field === "video_url") {
              updateData.thumbnail_url = newThumbnailUrl;
            }

            const { error: updateError } = await supabaseClient
              .from("techniques")
              .update(updateData)
              .eq("id", technique.id);

            if (updateError) {
              throw new Error(`Failed to update database: ${updateError.message}`);
            }

            results.push({
              id: technique.id,
              name: technique.name_ja || "Unknown",
              source,
              status: "success",
              message: "移行完了",
              newVideoUrl,
              newThumbnailUrl: field === "video_url" ? newThumbnailUrl : undefined,
            });

            // Small delay between uploads to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Migration error for ${technique.name_ja}:`, error);
            results.push({
              id: technique.id,
              name: technique.name_ja || "Unknown",
              source,
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;
      const skippedCount = results.filter((r) => r.status === "skipped").length;

      return new Response(
        JSON.stringify({
          success: true,
          message: `移行完了: 成功 ${successCount}件, エラー ${errorCount}件, スキップ ${skippedCount}件`,
          results,
          summary: {
            success: successCount,
            error: errorCount,
            skipped: skippedCount,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Migrate single technique
    if (action === "migrate-single" && techniqueId) {
      const { data: technique, error } = await supabaseClient
        .from("techniques")
        .select("id, name_ja, video_url, video_url_ja, thumbnail_url")
        .eq("id", techniqueId)
        .single();

      if (error || !technique) {
        throw new Error("Technique not found");
      }

      // Same logic as migrate-all but for single technique
      const cdnBase = `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net`;
      const results: MigrationResult[] = [];

      const urls = [
        { field: "video_url", url: technique.video_url },
        { field: "video_url_ja", url: technique.video_url_ja },
      ].filter((u) => u.url);

      for (const { field, url } of urls) {
        if (url.includes("b-cdn.net") || url.includes("bunnycdn.com")) {
          results.push({
            id: technique.id,
            name: technique.name_ja || "Unknown",
            source: "bunny",
            status: "skipped",
            message: "既にBunny.netにホストされています",
          });
          continue;
        }

        let sourceUrl = "";
        let source = "";

        if (url.includes("cloudflarestream.com") || url.includes("videodelivery.net")) {
          const videoIdMatch = url.match(/\/([a-f0-9]{32})\/?/);
          if (videoIdMatch) {
            sourceUrl = `https://videodelivery.net/${videoIdMatch[1]}/downloads/default.mp4`;
            source = "cloudflare";
          }
        } else if (url.includes("supabase.co/storage")) {
          sourceUrl = url;
          source = "supabase";
        }

        if (!sourceUrl) {
          results.push({
            id: technique.id,
            name: technique.name_ja || "Unknown",
            source: "unknown",
            status: "skipped",
            message: "不明なURL形式",
          });
          continue;
        }

        try {
          // Create video in Bunny
          const createResponse = await fetch(
            `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
            {
              method: "POST",
              headers: {
                AccessKey: BUNNY_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: technique.name_ja || `Technique_${technique.id}`,
                enabledResolutions: "240p,360p,480p,720p,1080p",
              }),
            }
          );

          if (!createResponse.ok) {
            throw new Error(`Failed to create Bunny video`);
          }

          const videoData = await createResponse.json();
          const bunnyVideoId = videoData.guid;

          // Fetch and upload
          const fetchResponse = await fetch(
            `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}/fetch`,
            {
              method: "POST",
              headers: {
                AccessKey: BUNNY_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: sourceUrl,
              }),
            }
          );

          if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch upload`);
          }

          const newVideoUrl = `${cdnBase}/${bunnyVideoId}/playlist.m3u8`;
          const newThumbnailUrl = `${cdnBase}/${bunnyVideoId}/thumbnail.jpg`;

          const updateData: Record<string, string> = {
            [field]: newVideoUrl,
          };
          
          if (field === "video_url") {
            updateData.thumbnail_url = newThumbnailUrl;
          }

          const { error: updateError } = await supabaseClient
            .from("techniques")
            .update(updateData)
            .eq("id", technique.id);

          if (updateError) {
            throw new Error(`Failed to update database`);
          }

          results.push({
            id: technique.id,
            name: technique.name_ja || "Unknown",
            source,
            status: "success",
            message: "移行完了",
            newVideoUrl,
            newThumbnailUrl: field === "video_url" ? newThumbnailUrl : undefined,
          });
        } catch (error) {
          results.push({
            id: technique.id,
            name: technique.name_ja || "Unknown",
            source,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: results.every((r) => r.status !== "error"),
          results,
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
