import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BJJ_SYSTEM_PROMPT_JA = `あなたはブラジリアン柔術（BJJ）に精通した専門エディターです。以下のJSON形式の字幕データを、構造を維持したまま校正してください。

【厳守ルール】
・タイムコード（start, end）は1ミリ秒も変更せず、そのまま出力すること。
・フィラー（えー、あの、その、えっと等）を削除し、自然な文章に整えること。
・柔術専門用語の誤字を修正すること（例：クローズカード→クローズドガード、腕十字→腕十字、スイープ→スイープ、SJJJF、SWEEP、YAWARA、野島）。
・適切な位置に句読点（、。）を追加すること。
・1つのセグメントが長すぎる場合は、意味の区切りで2つに分割し、start/endの時間を文字数比で按分すること。

出力形式：[{ "start": number, "end": number, "text": string }]
入力JSONのみを校正し、校正後のJSON配列のみを出力してください。説明やマークダウンは不要です。`;

const BJJ_SYSTEM_PROMPT_EN = `You are a professional editor specializing in Brazilian Jiu-Jitsu (BJJ). Proofread the following subtitle data in JSON format while maintaining the structure.

Rules:
- Do NOT change timecodes (start, end) at all.
- Remove filler words like "um", "uh", "like", "you know".
- Fix BJJ terminology spelling (e.g., closed guard, arm bar, sweep, SJJJF).
- Add proper punctuation.
- If a segment is too long, split it at a natural break and distribute start/end proportionally by character count.

Output format: [{ "start": number, "end": number, "text": string }]
Output only the corrected JSON array. No explanation or markdown.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segments, language = 'ja' } = await req.json();

    if (!segments || !Array.isArray(segments)) {
      throw new Error('segments array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = language === 'ja' ? BJJ_SYSTEM_PROMPT_JA : BJJ_SYSTEM_PROMPT_EN;

    // Send all segments as a single JSON block for context-aware correction
    const inputJson = JSON.stringify(segments.map((s: { start: number; end: number; text: string }) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputJson }
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', response.status, error);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fallback: return original segments
      return new Response(
        JSON.stringify({ segments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse the AI response as JSON array
    let formattedSegments;
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      formattedSegments = JSON.parse(cleaned);

      if (!Array.isArray(formattedSegments)) {
        throw new Error('Response is not an array');
      }

      // Validate each segment has required fields
      formattedSegments = formattedSegments.map((s: { start?: number; end?: number; text?: string }, idx: number) => ({
        start: typeof s.start === 'number' ? s.start : segments[idx]?.start ?? 0,
        end: typeof s.end === 'number' ? s.end : segments[idx]?.end ?? 0,
        text: typeof s.text === 'string' ? s.text : segments[idx]?.text ?? '',
      }));

      console.log(`Formatted ${segments.length} segments -> ${formattedSegments.length} segments`);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON, falling back:', parseError);
      console.error('Raw content:', rawContent.substring(0, 200));
      formattedSegments = segments;
    }

    return new Response(
      JSON.stringify({ segments: formattedSegments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in format-transcription:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
