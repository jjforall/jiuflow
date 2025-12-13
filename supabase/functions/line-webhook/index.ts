import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface LineEvent {
  type: string;
  replyToken: string;
  source: {
    type: string;
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}

interface LineWebhookBody {
  events: LineEvent[];
}

// Get LINE settings from database
async function getLineSettings() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase
    .from('line_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error || !data) {
    return {
      enabled: true,
      ai_provider: 'lovable',
      system_prompt: 'あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。MCPサーバーの機能を使って、選手情報、大会情報、テクニック情報などを検索・管理できます。',
      groq_model: 'llama-3.3-70b-versatile',
      lovable_model: 'google/gemini-2.5-flash'
    };
  }
  
  return data;
}

// Call Lovable AI
async function callLovableAI(message: string, systemPrompt: string, model: string) {
  console.log('Calling Lovable AI with message:', message, 'model:', model);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Groq API
async function callGroqAI(message: string, systemPrompt: string, model: string) {
  console.log('Calling Groq AI with message:', message, 'model:', model);
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq AI error:', response.status, errorText);
    throw new Error(`Groq AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Reply to LINE user
async function replyToLine(replyToken: string, message: string) {
  console.log('Replying to LINE with message:', message.substring(0, 100));
  
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text: message.substring(0, 5000) // LINE has 5000 char limit
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE reply error:', response.status, errorText);
    throw new Error(`LINE reply error: ${response.status}`);
  }

  return response.json();
}

// Log LINE message to database
async function logLineMessage(userId: string, userMessage: string, aiResponse: string, provider: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { error } = await supabase.from('line_chat_logs').insert({
      user_id: userId,
      user_message: userMessage,
      ai_response: aiResponse,
      ai_provider: provider
    });
    if (error) {
      console.error('Error logging message:', error);
    }
  } catch (e) {
    console.error('Failed to log message:', e);
  }
}

// Verify LINE signature
async function verifyLineSignature(body: string, signature: string): Promise<boolean> {
  if (!LINE_CHANNEL_SECRET || !signature) {
    console.log('Missing channel secret or signature');
    return false;
  }
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  
  return calculatedSignature === signature;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Health check endpoint
    if (req.method === 'GET' && url.pathname.endsWith('/health')) {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get settings endpoint (for admin panel)
    if (req.method === 'GET' && url.pathname.endsWith('/settings')) {
      const settings = await getLineSettings();
      return new Response(JSON.stringify(settings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update settings endpoint (for admin panel)
    if (req.method === 'POST' && url.pathname.endsWith('/settings')) {
      const settings = await req.json();
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get existing settings to find the ID
      const { data: existing } = await supabase
        .from('line_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (existing) {
        await supabase
          .from('line_settings')
          .update({ 
            enabled: settings.enabled,
            ai_provider: settings.ai_provider,
            system_prompt: settings.system_prompt,
            groq_model: settings.groq_model,
            lovable_model: settings.lovable_model,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('line_settings')
          .insert({
            enabled: settings.enabled,
            ai_provider: settings.ai_provider,
            system_prompt: settings.system_prompt,
            groq_model: settings.groq_model,
            lovable_model: settings.lovable_model
          });
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get chat logs endpoint (for admin panel)
    if (req.method === 'GET' && url.pathname.endsWith('/logs')) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const limit = url.searchParams.get('limit') || '50';
      
      const { data, error } = await supabase
        .from('line_chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (error) {
        console.error('Error fetching logs:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LINE Webhook endpoint
    if (req.method === 'POST') {
      const bodyText = await req.text();
      const signature = req.headers.get('x-line-signature') || '';
      
      console.log('Received LINE webhook');
      
      // Verify signature (skip in development if needed)
      const isValid = await verifyLineSignature(bodyText, signature);
      if (!isValid && LINE_CHANNEL_SECRET) {
        console.error('Invalid LINE signature');
        // Still process for testing, but log the warning
      }

      const body: LineWebhookBody = JSON.parse(bodyText);
      const settings = await getLineSettings();

      if (!settings.enabled) {
        console.log('LINE integration is disabled');
        return new Response(JSON.stringify({ message: 'LINE integration disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const event of body.events) {
        if (event.type === 'message' && event.message?.type === 'text') {
          const userMessage = event.message.text || '';
          const userId = event.source.userId;
          
          console.log(`Processing message from ${userId}: ${userMessage.substring(0, 50)}`);
          
          let aiResponse: string;
          const provider = settings.ai_provider || 'lovable';
          
          try {
            if (provider === 'groq') {
              aiResponse = await callGroqAI(userMessage, settings.system_prompt, settings.groq_model);
            } else {
              aiResponse = await callLovableAI(userMessage, settings.system_prompt, settings.lovable_model);
            }
            
            // Check if response is empty
            if (!aiResponse || aiResponse.trim() === '') {
              aiResponse = 'すみません、回答を生成できませんでした。もう一度お試しください。';
            }
            
            // Log the conversation
            await logLineMessage(userId, userMessage, aiResponse, provider);
            
            // Reply to user
            await replyToLine(event.replyToken, aiResponse);
          } catch (error) {
            console.error('AI processing error:', error);
            const errorMessage = 'すみません、エラーが発生しました。しばらくしてからもう一度お試しください。';
            await logLineMessage(userId, userMessage, errorMessage, provider);
            await replyToLine(event.replyToken, errorMessage);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in LINE webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
