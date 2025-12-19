import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segments, language = 'ja' } = await req.json();

    if (!segments || !Array.isArray(segments)) {
      throw new Error('segments array is required');
    }

    // Process segments in batches to avoid rate limits
    const formattedSegments = [];
    
    for (const segment of segments) {
      const prompt = language === 'ja' 
        ? `以下の文字起こしテキストを自然な日本語に整形してください。
要件:
- 適切な句読点（。、）を追加
- 不要な空白を削除
- 「えー」「あー」などのフィラーは削除
- 意味を変えずに読みやすく

入力テキスト:
${segment.text}

整形後のテキストのみを出力してください（説明不要）:`
        : `Format this transcript text to be more readable:
- Add proper punctuation
- Remove unnecessary spaces
- Remove filler words like "um", "uh"
- Keep the meaning intact

Input:
${segment.text}

Output only the formatted text:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_AI_API_KEY')}`,
          'Content-Type': 'application/json',
          'X-Lovable-API-Version': '1.0.0',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('AI API error:', error);
        // If AI fails, keep original text
        formattedSegments.push(segment);
        continue;
      }

      const data = await response.json();
      const formattedText = data.choices?.[0]?.message?.content?.trim() || segment.text;

      formattedSegments.push({
        ...segment,
        text: formattedText
      });
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
