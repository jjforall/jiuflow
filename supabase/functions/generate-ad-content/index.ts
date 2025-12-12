import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdGenerationRequest {
  productName: string;
  productDescription: string;
  targetAudience: string;
  platform: 'google' | 'meta';
  objective: string;
  tone?: string;
  language?: string;
}

interface GeneratedAdContent {
  headlines: string[];
  descriptions: string[];
  callToActions: string[];
  keywords: string[];
  targetingHints: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { 
      productName, 
      productDescription, 
      targetAudience, 
      platform, 
      objective,
      tone = 'professional',
      language = 'ja'
    }: AdGenerationRequest = await req.json();

    console.log('[AD-GEN] Generating ad content for:', productName, 'platform:', platform);

    const platformSpecificInstructions = platform === 'google' 
      ? `
Google Ads specifications:
- Headlines: Maximum 30 characters each, create 5 variations
- Descriptions: Maximum 90 characters each, create 3 variations
- Include relevant keywords for search ads
`
      : `
Meta Ads specifications:
- Headlines: Maximum 40 characters each, create 5 variations
- Primary text: Maximum 125 characters, create 3 variations
- Focus on visual appeal and emotional connection
`;

    const languageInstructions = language === 'ja' 
      ? 'すべてのコンテンツは日本語で生成してください。'
      : language === 'pt'
      ? 'Generate all content in Portuguese.'
      : 'Generate all content in English.';

    const systemPrompt = `You are an expert digital advertising copywriter specializing in ${platform === 'google' ? 'Google Ads' : 'Meta (Facebook/Instagram) Ads'}. 
${languageInstructions}

${platformSpecificInstructions}

Objective: ${objective}
Tone: ${tone}

Respond with a JSON object containing:
{
  "headlines": ["headline1", "headline2", ...],
  "descriptions": ["desc1", "desc2", ...],
  "callToActions": ["cta1", "cta2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "targetingHints": ["hint1", "hint2", ...]
}`;

    const userPrompt = `Create compelling ad content for the following:

Product/Service: ${productName}
Description: ${productDescription}
Target Audience: ${targetAudience}

Generate high-converting ad copy that resonates with the target audience and achieves the campaign objective.`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[AD-GEN] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated from AI');
    }

    console.log('[AD-GEN] Raw AI response:', content.slice(0, 500));

    // Parse JSON from the response
    let generatedContent: GeneratedAdContent;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      generatedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[AD-GEN] JSON parse error:', parseError);
      // Fallback structure if parsing fails
      generatedContent = {
        headlines: [productName],
        descriptions: [productDescription.slice(0, 90)],
        callToActions: ['今すぐチェック', '詳細を見る', '無料で始める'],
        keywords: productName.split(/\s+/),
        targetingHints: [targetAudience],
      };
    }

    console.log('[AD-GEN] Generated content successfully');

    return new Response(
      JSON.stringify({ success: true, data: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AD-GEN] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
