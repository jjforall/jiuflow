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

// HLS URL (.m3u8) を MP4 ダウンロードURLに変換
function convertToMp4Url(url: string): string {
  // Cloudflare Stream HLS URL pattern:
  // https://customer-xxx.cloudflarestream.com/{video_id}/manifest/video.m3u8
  // Convert to download URL:
  // https://customer-xxx.cloudflarestream.com/{video_id}/downloads/default.mp4

  if (url.includes("cloudflarestream.com") && url.includes("/manifest/video.m3u8")) {
    return url.replace("/manifest/video.m3u8", "/downloads/default.mp4");
  }

  // Bunny CDN or other direct MP4 URLs - return as is
  if (url.toLowerCase().endsWith(".mp4")) {
    return url;
  }

  // For other HLS URLs, try to get MP4 variant
  if (url.includes(".m3u8")) {
    // Try common patterns
    return url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
  }

  return url;
}

async function probeContentType(url: string): Promise<{ ok: boolean; status: number; contentType: string | null }> {
  // Some CDNs don't support HEAD for signed/download URLs, so we fallback to a tiny Range GET.
  try {
    let resp = await fetch(url, { method: "HEAD", redirect: "follow" });

    if (!resp.ok || resp.status === 405) {
      resp = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          Range: "bytes=0-0",
        },
      });
    }

    return {
      ok: resp.ok,
      status: resp.status,
      contentType: resp.headers.get("content-type"),
    };
  } catch (_e) {
    return { ok: false, status: 0, contentType: null };
  }
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

    // HLS URLをMP4に変換
    const mp4Url = convertToMp4Url(videoUrl);
    console.log("Converting video URL:", { original: videoUrl, converted: mp4Url });

    // MP4 URL が実際に video/* を返すか確認（text/plain 等のエラーページを弾く）
    const probe = await probeContentType(mp4Url);
    const ct = (probe.contentType || "").toLowerCase();
    if (!probe.ok || !ct.startsWith("video/")) {
      console.error("MP4 URL probe failed:", probe);
      return new Response(
        JSON.stringify({
          error: "Video source is not a downloadable MP4",
          details: `Expected content-type video/* but got '${probe.contentType ?? "unknown"}' (HTTP ${probe.status}). Please provide a direct MP4 URL or enable MP4 downloads for this video source.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
