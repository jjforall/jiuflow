import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGES = ["en", "ja", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];

// Rate limit: 10 translations per 10 minutes per user
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT to verify identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit using user ID
    const rateLimitResult = checkRateLimit(`translate:${user.id}`, RATE_LIMIT_CONFIG);
    
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(rateLimitResult.resetInMs);
    }

    const { type, id, content, title, source_lang } = await req.json();

    // Input validation
    if (!type || !["thread", "post"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be 'thread' or 'post'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!source_lang || !LANGUAGES.includes(source_lang)) {
      return new Response(
        JSON.stringify({ error: "Invalid source_lang" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Content length limits
    const maxContentLength = 10000;
    const maxTitleLength = 500;
    
    if (content && content.length > maxContentLength) {
      return new Response(
        JSON.stringify({ error: `Content too long. Maximum ${maxContentLength} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (title && title.length > maxTitleLength) {
      return new Response(
        JSON.stringify({ error: `Title too long. Maximum ${maxTitleLength} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is the author of the content
    const table = type === "thread" ? "community_threads" : "community_posts";
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from(table)
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingRecord) {
      console.error("Record not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRecord.author_id !== user.id) {
      console.error(`User ${user.id} attempted to translate content owned by ${existingRecord.author_id}`);
      return new Response(
        JSON.stringify({ error: "You can only translate your own content" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const targetLangs = LANGUAGES.filter(l => l !== source_lang);
    
    const translateText = async (text: string, targetLang: string): Promise<string> => {
      if (!text || text.trim() === "") return "";
      
      const langNames: Record<string, string> = {
        en: "English",
        ja: "Japanese",
        pt: "Portuguese",
        es: "Spanish",
        fr: "French",
        de: "German",
        zh: "Chinese",
        ko: "Korean",
        it: "Italian",
        ru: "Russian",
        ar: "Arabic",
        hi: "Hindi"
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a translator. Translate the following text to ${langNames[targetLang]}. Keep the same formatting (markdown, line breaks, etc). Only output the translated text, nothing else.`
            },
            {
              role: "user",
              content: text
            }
          ],
        }),
      });

      if (!response.ok) {
        console.error("Translation API error:", response.status);
        return text; // Return original on error
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || text;
    };

    const updates: Record<string, string> = {};

    // Translate content to all target languages
    for (const targetLang of targetLangs) {
      if (content) {
        const translatedContent = await translateText(content, targetLang);
        updates[`content_${targetLang}`] = translatedContent;
      }
      if (title) {
        const translatedTitle = await translateText(title, targetLang);
        updates[`title_${targetLang}`] = translatedTitle;
      }
    }

    // Also store original in its language column
    if (content) {
      updates[`content_${source_lang}`] = content;
    }
    if (title) {
      updates[`title_${source_lang}`] = title;
    }

    // Update database
    const { error } = await supabaseAdmin
      .from(table)
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    console.log(`User ${user.id} translated ${type} ${id} from ${source_lang} to ${targetLangs.join(", ")}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
