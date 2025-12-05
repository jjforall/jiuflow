import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGES = ["en", "ja", "pt"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, id, content, title, source_lang } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const targetLangs = LANGUAGES.filter(l => l !== source_lang);
    
    const translateText = async (text: string, targetLang: string): Promise<string> => {
      if (!text || text.trim() === "") return "";
      
      const langNames: Record<string, string> = {
        en: "English",
        ja: "Japanese",
        pt: "Portuguese"
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
    const table = type === "thread" ? "community_threads" : "community_posts";
    const { error } = await supabaseClient
      .from(table)
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    console.log(`Translated ${type} ${id} from ${source_lang} to ${targetLangs.join(", ")}`);

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
