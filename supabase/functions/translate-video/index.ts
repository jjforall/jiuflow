import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenEndpoint = "https://rask-prod.auth.us-east-2.amazoncognito.com/oauth2/token";
  
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "api/source api/input api/output api/limit",
  });

  console.log("Fetching OAuth2 token from Rask.ai...");
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OAuth2 token error:", response.status, errorText);
    throw new Error(`Failed to get OAuth2 token: ${errorText}`);
  }

  const data = await response.json();
  console.log("OAuth2 token obtained successfully");
  return data.access_token;
}

// Cloudflare Stream から video_id を抽出
function extractCloudflareVideoId(url: string): string | null {
  // Pattern: https://customer-xxx.cloudflarestream.com/{video_id}/manifest/video.m3u8
  const match = url.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)\//);
  return match ? match[1] : null;
}

// Cloudflare Stream API で署名付きダウンロードURLを取得
async function getCloudflareDownloadUrl(videoId: string): Promise<string | null> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("Cloudflare credentials not configured");
    return null;
  }

  try {
    // Cloudflare Stream API でダウンロードを有効化
    const enableResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!enableResponse.ok) {
      const errorText = await enableResponse.text();
      console.log("Enable downloads response:", enableResponse.status, errorText);
      // 既にダウンロードが有効な場合は 409 が返ることがある
    }

    // ダウンロードURLを取得
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
    console.log("Cloudflare downloads response:", JSON.stringify(data));

    // default download URL を返す
    if (data.result?.default?.url) {
      return data.result.default.url;
    }

    return null;
  } catch (error) {
    console.error("Cloudflare API error:", error);
    return null;
  }
}

// HLS URL (.m3u8) を MP4 ダウンロードURLに変換
async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  // Bunny CDN or other direct MP4 URLs - return as is
  if (url.toLowerCase().endsWith(".mp4")) {
    return { url };
  }

  // Cloudflare Stream の場合は API で署名付きURLを取得
  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("Detected Cloudflare Stream video:", cfVideoId);
    const downloadUrl = await getCloudflareDownloadUrl(cfVideoId);
    if (downloadUrl) {
      console.log("Got Cloudflare download URL:", downloadUrl);
      return { url: downloadUrl };
    }
    return { 
      url: url, 
      error: "Failed to get Cloudflare download URL. Please ensure MP4 downloads are enabled for this video." 
    };
  }

  // その他の m3u8 は変換を試みる
  if (url.includes(".m3u8")) {
    const converted = url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
    return { url: converted };
  }

  return { url };
}

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

    // HLS URLをダウンロード可能なURLに変換
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
    console.log("Converting video URL:", { original: videoUrl, converted: mp4Url });

    const RASK_AI_CLIENT_ID = Deno.env.get("RASK_AI_CLIENT_ID");
    const RASK_AI_CLIENT_SECRET = Deno.env.get("RASK_AI_CLIENT_SECRET");
    
    if (!RASK_AI_CLIENT_ID || !RASK_AI_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "RASK_AI_CLIENT_ID and RASK_AI_CLIENT_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ターゲット言語のみRask正式コードにマッピング（destination languages）
    const DST_LANGUAGE_MAP: Record<string, string> = {
      ja: "ja-jp",
      en: "en-us",
      pt: "pt-br",
      es: "es-es",
      fr: "fr-fr",
      de: "de-de",
      zh: "zh-cn",
      ko: "ko-kr",
      it: "it-it",
      ru: "ru-ru",
      ar: "ar-ae",
      hi: "hi-in",
    };

    // ソース言語は2文字コード（Rask source languages）
    const srcLang = (sourceLanguage || "ja").toLowerCase();
    
    // ターゲット言語はRaskの地域コード
    const targetLangBase = targetLanguage.toLowerCase();
    const dstLang = DST_LANGUAGE_MAP[targetLangBase];

    if (!dstLang) {
      return new Response(
        JSON.stringify({
          error: "Unsupported translation language",
          details: `Rask API does not support language code: ${targetLanguage}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting video translation:", { originalUrl: videoUrl, mp4Url, srcLang, dstLang, techniqueId });

    // Get OAuth2 access token
    const accessToken = await getOAuthToken(RASK_AI_CLIENT_ID, RASK_AI_CLIENT_SECRET);

    // Step 1: Upload media by link (MP4 URLを使用)
    console.log("Step 1: Uploading media by link with MP4 URL:", mp4Url);
    const uploadResponse = await fetch("https://api.rask.ai/api/library/v1/media/link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        link: mp4Url,  // MP4 URLを使用
        kind: "video",
        name: `Technique ${techniqueId}`,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Rask.ai upload error:", uploadResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload video to Rask.ai", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;
    console.log("Media uploaded successfully:", videoId);

    // Step 2: Create project (正しいエンドポイント)
    console.log("Step 2: Creating project...");
    const createProjectResponse = await fetch("https://api.rask.ai/v2/projects", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_id: videoId,
        name: `Technique ${techniqueId} - ${targetLanguage}`,
        src_lang: srcLang,
        dst_lang: dstLang,
      }),
    });

    if (!createProjectResponse.ok) {
      const errorText = await createProjectResponse.text();
      console.error("Rask.ai project creation error:", createProjectResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create project in Rask.ai", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await createProjectResponse.json();
    const projectId = projectData.id;
    console.log("Project created successfully:", projectId);

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Translation started successfully",
        targetLanguage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
