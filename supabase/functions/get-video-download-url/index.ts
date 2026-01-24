import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCloudflareStreamDownloadUrl } from "../_shared/cloudflare-download.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, anonKey);
    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check admin role
    const callerId = userRes.user.id;
    const { data: callerRole, error: roleErr } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json().catch(() => null);
    const videoUrl = body?.videoUrl as string | undefined;

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Missing videoUrl" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract video ID from URL
    const patterns = [
      /videodelivery\.net\/([a-zA-Z0-9]+)/i,
      /cloudflarestream\.com\/([a-zA-Z0-9]+)/i,
      /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/i,
    ];

    let videoId: string | null = null;
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match?.[1]) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return new Response(JSON.stringify({ error: "Could not extract video ID from URL" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN") ?? "";

    if (!accountId || !apiToken) {
      return new Response(JSON.stringify({ error: "Cloudflare credentials not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const downloadUrl = await getCloudflareStreamDownloadUrl({
      videoId,
      accountId,
      apiToken,
    });

    return new Response(JSON.stringify({ downloadUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("get-video-download-url error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
