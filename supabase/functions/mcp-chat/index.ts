import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider: string;
  model: string;
  apiKeys?: Record<string, string>;
}

async function callLovableAI(messages: ChatMessage[], model: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond in the same language as the user.' },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set it in Settings.');
  }

  const isNewModel = model.includes('gpt-5') || model.includes('o3') || model.includes('o4') || model.includes('gpt-4.1');
  
  const body: Record<string, unknown> = {
    model: model,
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant. Respond in the same language as the user.' },
      ...messages,
    ],
  };

  if (isNewModel) {
    body.max_completion_tokens = 2048;
  } else {
    body.max_tokens = 2048;
    body.temperature = 0.7;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', response.status, errorText);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured. Please set it in Settings.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2048,
      system: 'You are a helpful AI assistant. Respond in the same language as the user.',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic error:', response.status, errorText);
    throw new Error(`Anthropic error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callGroq(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Groq API key is not configured. Please set it in Settings.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond in the same language as the user.' },
        ...messages,
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq error:', response.status, errorText);
    throw new Error(`Groq error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callPerplexity(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured. Please set it in Settings.');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond in the same language as the user.' },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity error:', response.status, errorText);
    throw new Error(`Perplexity error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider, model, apiKeys = {} }: ChatRequest = await req.json();

    console.log(`MCP Chat request - Provider: ${provider}, Model: ${model}`);

    let content: string;

    switch (provider) {
      case 'lovable':
        content = await callLovableAI(messages, model);
        break;
      case 'openai':
        content = await callOpenAI(messages, model, apiKeys.OPENAI_API_KEY || '');
        break;
      case 'anthropic':
        content = await callAnthropic(messages, model, apiKeys.ANTHROPIC_API_KEY || '');
        break;
      case 'groq':
        content = await callGroq(messages, model, apiKeys.GROQ_API_KEY || Deno.env.get('GROQ_API_KEY') || '');
        break;
      case 'perplexity':
        content = await callPerplexity(messages, model, apiKeys.PERPLEXITY_API_KEY || '');
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
