import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Rask.ai OAuth token
async function getRaskAccessToken(): Promise<string> {
  const clientId = Deno.env.get("RASK_AI_CLIENT_ID");
  const clientSecret = Deno.env.get("RASK_AI_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Rask.ai credentials not configured");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(
    "https://rask-prod.auth.us-east-2.amazoncognito.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "api/source api/input api/output api/limit",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Rask auth error:", response.status, errorText);
    throw new Error(`Rask.ai authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Extract Cloudflare Stream video ID from URL
function extractCloudflareVideoId(url: string): string | null {
  const match = url.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)\//);
  return match ? match[1] : null;
}

// Get Cloudflare download URL for video
async function getCloudflareDownloadUrl(videoId: string): Promise<string | null> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("Cloudflare credentials not configured");
    return null;
  }

  try {
    // Enable downloads for the video
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Get download URL
    const getResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error("Get downloads error:", getResponse.status, errorText);
      return null;
    }

    const data = await getResponse.json();
    return data.result?.default?.url || null;
  } catch (error) {
    console.error("Cloudflare API error:", error);
    return null;
  }
}

// Get downloadable URL for video
async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  if (url.toLowerCase().endsWith(".mp4")) {
    return { url };
  }

  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("Detected Cloudflare Stream video:", cfVideoId);
    const downloadUrl = await getCloudflareDownloadUrl(cfVideoId);
    if (downloadUrl) {
      return { url: downloadUrl };
    }
    return { 
      url, 
      error: "Failed to get Cloudflare download URL" 
    };
  }

  if (url.includes(".m3u8")) {
    const converted = url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
    return { url: converted };
  }

  return { url };
}

// Language code mapping for Rask.ai
const RASK_LANGUAGE_MAP: Record<string, string> = {
  ja: "ja-JP",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
  ko: "ko-KR",
  it: "it-IT",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  sv: "sv-SE",
  id: "id-ID",
  ms: "ms-MY",
  ro: "ro-RO",
  uk: "uk-UA",
  el: "el-GR",
  cs: "cs-CZ",
  da: "da-DK",
  fi: "fi-FI",
  bg: "bg-BG",
  hr: "hr-HR",
  sk: "sk-SK",
  ta: "ta-IN",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, sourceLanguage, targetLanguage, techniqueId } = await req.json();

    if (!videoUrl || !targetLanguage || !techniqueId) {
      return new Response(
        JSON.stringify({ error: "videoUrl, targetLanguage, and techniqueId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get downloadable URL
    const downloadResult = await getDownloadableUrl(videoUrl);
    if (downloadResult.error) {
      console.error("Failed to get downloadable URL:", downloadResult.error);
      return new Response(
        JSON.stringify({
          error: "Video source is not downloadable",
          details: downloadResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mp4Url = downloadResult.url;
    console.log("Video URL:", { original: videoUrl, converted: mp4Url });

    // Get Rask.ai access token
    const accessToken = await getRaskAccessToken();
    console.log("Got Rask.ai access token");

    // Map language codes
    const srcLang = RASK_LANGUAGE_MAP[(sourceLanguage || "ja").toLowerCase()] || "ja-JP";
    const dstLang = RASK_LANGUAGE_MAP[targetLanguage.toLowerCase()];

    if (!dstLang) {
      return new Response(
        JSON.stringify({
          error: "Unsupported translation language",
          details: `Rask.ai does not support language code: ${targetLanguage}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting Rask.ai translation:", { mp4Url, srcLang, dstLang, techniqueId });

    // Step 1: Upload media by link
    // Rask.ai requires the URL to return proper Content-Type header
    // For Cloudflare Stream, we need to use the signed download URL with .mp4 extension hint
    console.log("Uploading media to Rask.ai:", { mp4Url });
    
    // Ensure URL ends with .mp4 hint for proper MIME type detection
    let finalUrl = mp4Url;
    if (!mp4Url.toLowerCase().includes('.mp4')) {
      // Add .mp4 extension hint as query param if not already a direct mp4
      const urlObj = new URL(mp4Url);
      urlObj.searchParams.set('format', 'mp4');
      finalUrl = urlObj.toString();
    }
    
    console.log("Final URL for Rask.ai:", finalUrl);
    
    // Use the v2 projects endpoint with direct URL instead of media library
    // This approach creates a project directly with the video URL
    const projectResponse = await fetch("https://api.rask.ai/v2/projects", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: mp4Url,
        src_lang: srcLang,
        dst_lang: dstLang,
        name: `Technique ${techniqueId} - ${targetLanguage}`,
        speaker_detection: "auto",
      }),
    });

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error("Rask project creation error:", {
        status: projectResponse.status,
        statusText: projectResponse.statusText,
        body: errorText,
      });
      
      // If direct URL fails, try the file upload approach
      if (projectResponse.status === 400) {
        console.log("Direct URL failed, attempting to fetch and upload video data...");
        
        // Fetch the video content
        const videoResponse = await fetch(mp4Url);
        if (!videoResponse.ok) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch video for upload", 
              details: `Video fetch failed: ${videoResponse.status}`,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const videoBlob = await videoResponse.blob();
        console.log("Video fetched, size:", videoBlob.size, "type:", videoBlob.type);
        
        // Create form data for multipart upload
        const formData = new FormData();
        formData.append("file", videoBlob, `technique_${techniqueId}.mp4`);
        formData.append("src_lang", srcLang);
        formData.append("dst_lang", dstLang);
        formData.append("name", `Technique ${techniqueId} - ${targetLanguage}`);
        formData.append("speaker_detection", "auto");
        
        const uploadProjectResponse = await fetch("https://api.rask.ai/v2/projects", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
          body: formData,
        });
        
        if (!uploadProjectResponse.ok) {
          const uploadErrorText = await uploadProjectResponse.text();
          console.error("Rask file upload error:", uploadProjectResponse.status, uploadErrorText);
          return new Response(
            JSON.stringify({ 
              error: "Failed to upload video to Rask.ai", 
              details: uploadErrorText,
              status: uploadProjectResponse.status,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const uploadProjectData = await uploadProjectResponse.json();
        console.log("Rask project created via file upload:", uploadProjectData);
        
        return new Response(
          JSON.stringify({
            success: true,
            projectId: uploadProjectData.id,
            message: "Translation started successfully with Rask.ai (file upload)",
            targetLanguage,
            provider: "rask",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to create Rask.ai project", 
          details: errorText,
          status: projectResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await projectResponse.json();
    const projectId = projectData.id;
    console.log("Rask project created:", { projectId });

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Translation started successfully with Rask.ai",
        targetLanguage,
        provider: "rask",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rask translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
