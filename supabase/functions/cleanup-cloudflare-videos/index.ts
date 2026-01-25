import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract Cloudflare Stream ID from various URL formats
function extractCloudflareId(url: string | null | undefined): string | null {
  if (!url) return null;
  
  const patterns = [
    /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /videodelivery\.net\/([a-zA-Z0-9]+)/,
    /iframe\.videodelivery\.net\/([a-zA-Z0-9]+)/,
    /customer-[a-z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Fetch all videos from Cloudflare Stream with pagination
async function fetchAllCloudflareVideos(
  accountId: string,
  apiToken: string
): Promise<Array<{ uid: string; duration: number; created: string; meta?: { name?: string } }>> {
  const allVideos: Array<{ uid: string; duration: number; created: string; meta?: { name?: string } }> = [];
  let cursor: string | null = null;
  
  do {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`);
    url.searchParams.set("per_page", "100");
    if (cursor) {
      url.searchParams.set("after", cursor);
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.result && Array.isArray(data.result)) {
      allVideos.push(...data.result);
    }
    
    // Check for pagination cursor
    cursor = data.result_info?.cursor || null;
    
    // Safety check - if we got less than 100, we're done
    if (!data.result || data.result.length < 100) {
      cursor = null;
    }
  } while (cursor);
  
  return allVideos;
}

// Delete a video from Cloudflare Stream
async function deleteCloudflareVideo(
  videoId: string,
  accountId: string,
  apiToken: string
): Promise<boolean> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  
  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify admin role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get Cloudflare credentials
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    
    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({ error: "Cloudflare credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get mode from request
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "preview";
    
    console.log(`Running cleanup in ${mode} mode...`);
    
    // 1. Fetch all videos from Cloudflare
    console.log("Fetching all videos from Cloudflare Stream...");
    const allVideos = await fetchAllCloudflareVideos(accountId, apiToken);
    console.log(`Found ${allVideos.length} videos in Cloudflare Stream`);
    
    // Calculate total duration
    const totalMinutes = allVideos.reduce((sum, v) => sum + (v.duration || 0), 0) / 60;
    console.log(`Total duration: ${totalMinutes.toFixed(2)} minutes`);
    
    // 2. Fetch techniques from database
    const { data: techniques, error: dbError } = await supabase
      .from("techniques")
      .select("id, name, video_url, video_url_ja, video_url_pt, video_metadata");
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    console.log(`Found ${techniques?.length || 0} techniques in database`);
    
    // 3. Build set of IDs to keep
    const keepIds = new Set<string>();
    const keepDetails: Array<{ id: string; source: string; techniqueName: string }> = [];
    
    for (const technique of techniques || []) {
      // Main video URLs
      const mainUrls = [
        { url: technique.video_url, lang: "main" },
        { url: technique.video_url_ja, lang: "ja" },
        { url: technique.video_url_pt, lang: "pt" },
      ];
      
      for (const { url, lang } of mainUrls) {
        const id = extractCloudflareId(url);
        if (id && !keepIds.has(id)) {
          keepIds.add(id);
          keepDetails.push({ id, source: `video_url_${lang}`, techniqueName: technique.name });
        }
      }
      
      // Dubbed versions in video_metadata
      if (technique.video_metadata && typeof technique.video_metadata === "object") {
        const metadata = technique.video_metadata as Record<string, { video_url?: string }>;
        const languages = ["en", "es", "pt", "zh", "fr", "de", "ko", "it", "ru", "ar", "hi", "ja"];
        
        for (const lang of languages) {
          const langData = metadata[lang];
          if (langData?.video_url) {
            const id = extractCloudflareId(langData.video_url);
            if (id && !keepIds.has(id)) {
              keepIds.add(id);
              keepDetails.push({ id, source: `metadata.${lang}`, techniqueName: technique.name });
            }
          }
        }
      }
    }
    
    console.log(`Found ${keepIds.size} unique video IDs to keep`);
    
    // 4. Identify videos to delete
    const toDelete = allVideos.filter((v) => !keepIds.has(v.uid));
    const toKeep = allVideos.filter((v) => keepIds.has(v.uid));
    
    const deleteMinutes = toDelete.reduce((sum, v) => sum + (v.duration || 0), 0) / 60;
    const keepMinutes = toKeep.reduce((sum, v) => sum + (v.duration || 0), 0) / 60;
    
    console.log(`Videos to delete: ${toDelete.length} (${deleteMinutes.toFixed(2)} minutes)`);
    console.log(`Videos to keep: ${toKeep.length} (${keepMinutes.toFixed(2)} minutes)`);
    
    // 5. Preview mode - return summary
    if (mode === "preview") {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "preview",
          summary: {
            totalVideosInCloudflare: allVideos.length,
            totalMinutesInCloudflare: Math.round(totalMinutes * 100) / 100,
            videosToKeep: toKeep.length,
            minutesToKeep: Math.round(keepMinutes * 100) / 100,
            videosToDelete: toDelete.length,
            minutesToDelete: Math.round(deleteMinutes * 100) / 100,
            estimatedSpaceRecovery: `${Math.round(deleteMinutes)} minutes`,
          },
          toDelete: toDelete.map((v) => ({
            uid: v.uid,
            duration: Math.round((v.duration || 0) / 60 * 100) / 100,
            created: v.created,
            name: v.meta?.name || "Unknown",
          })),
          toKeep: toKeep.map((v) => ({
            uid: v.uid,
            duration: Math.round((v.duration || 0) / 60 * 100) / 100,
            created: v.created,
            name: v.meta?.name || "Unknown",
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 6. Execute mode - delete videos
    if (mode === "execute") {
      const results: Array<{ uid: string; success: boolean; error?: string }> = [];
      
      for (const video of toDelete) {
        try {
          const success = await deleteCloudflareVideo(video.uid, accountId, apiToken);
          results.push({ uid: video.uid, success });
          
          if (success) {
            console.log(`Deleted video: ${video.uid}`);
          } else {
            console.error(`Failed to delete video: ${video.uid}`);
          }
          
          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error deleting video ${video.uid}:`, error);
          results.push({ uid: video.uid, success: false, error: String(error) });
        }
      }
      
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: "execute",
          summary: {
            totalDeleted: successCount,
            totalFailed: failCount,
            minutesRecovered: Math.round(deleteMinutes * 100) / 100,
          },
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid mode. Use 'preview' or 'execute'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
