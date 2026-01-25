import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptionText, techniqueId } = await req.json();

    if (!transcriptionText) {
      throw new Error("transcriptionText is required");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch all available notations for context
    const { data: notations, error: notationsError } = await supabase
      .from("bjj_notations")
      .select("code, name_ja, category")
      .eq("is_active", true)
      .order("display_order");

    if (notationsError) {
      console.error("Failed to fetch notations:", notationsError);
    }

    const notationsList = notations
      ?.map((n) => `${n.code}: ${n.name_ja} (${n.category})`)
      .join("\n") || "";

    // Create prompt for AI
    const systemPrompt = `あなたは柔術（BJJ）テクニック動画の分析アシスタントです。
与えられた文字起こしテキストを分析し、動画のメタデータを抽出してください。

以下のJSON形式で回答してください（JSON以外の文字は出力しないでください）：
{
  "title_ja": "テクニック名（日本語、簡潔に10〜30文字）",
  "description_ja": "テクニックの説明（日本語、1〜3文、50〜150文字）",
  "suggested_tags": ["コード1", "コード2"] // 下記の利用可能なタグコードから1〜5個選択
}

利用可能な技術タグ（BJJ Notations）:
${notationsList}

注意:
- suggested_tagsには上記リストのコード（例: "CG", "ARM"）のみを使用
- 動画内容に直接関連するタグのみを選択
- タイトルは具体的で検索しやすいものに
- 説明は動画の内容を簡潔に要約`;

    const userPrompt = `以下の柔術テクニック動画の文字起こしテキストを分析してください：

【文字起こし】
${transcriptionText.substring(0, 3000)}${transcriptionText.length > 3000 ? '...(省略)' : ''}`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response (in case AI added extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate the response structure
    const result = {
      title_ja: extractedData.title_ja || "",
      description_ja: extractedData.description_ja || "",
      suggested_tags: Array.isArray(extractedData.suggested_tags) 
        ? extractedData.suggested_tags.filter((t: unknown) => typeof t === 'string')
        : [],
    };

    // Validate tags against actual notation codes
    if (notations && result.suggested_tags.length > 0) {
      const validCodes = new Set(notations.map(n => n.code));
      result.suggested_tags = result.suggested_tags.filter((code: string) => validCodes.has(code));
    }

    console.log("[extract-video-metadata] Extracted:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[extract-video-metadata] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        title_ja: "",
        description_ja: "",
        suggested_tags: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
