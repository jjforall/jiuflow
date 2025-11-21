import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "text and targetLang are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // キャッシュをチェック
    const { data: cached } = await supabase
      .from("translation_cache")
      .select("translated_text")
      .eq("source_lang", sourceLang || "ja")
      .eq("target_lang", targetLang)
      .eq("source_text", text)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ translatedText: cached.translated_text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AIで翻訳
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const languageNames: Record<string, string> = {
      ja: "Japanese",
      en: "English",
      pt: "Portuguese",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese",
      ko: "Korean",
      it: "Italian",
      ru: "Russian",
      ar: "Arabic",
      hi: "Hindi",
    };

    const systemPrompt = `You are a professional translator. Translate the following text to ${languageNames[targetLang] || targetLang}. 
Provide ONLY the translated text without any explanations, notes, or additional context.
Maintain the original tone and style.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI translation error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices[0].message.content.trim();

    // キャッシュに保存
    await supabase.from("translation_cache").insert({
      source_lang: sourceLang || "ja",
      target_lang: targetLang,
      source_text: text,
      translated_text: translatedText,
    });

    return new Response(
      JSON.stringify({ translatedText }),
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
