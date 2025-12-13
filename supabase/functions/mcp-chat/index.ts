import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatRequest {
  messages: ChatMessage[];
  provider: string;
  model: string;
  apiKeys?: Record<string, string>;
}

// Define available tools for database operations
const tools = [
  {
    type: "function",
    function: {
      name: "list_tournaments",
      description: "大会一覧を取得します。JiuFlowに登録されている柔術の大会情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          upcoming_only: { type: "boolean", description: "今後開催される大会のみ表示" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_celebrities",
      description: "選手一覧を取得します。柔術の有名選手・レジェンドの情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          featured_only: { type: "boolean", description: "注目選手のみ表示" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_techniques",
      description: "テクニック一覧を取得します。柔術のテクニック・技の情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          category: { type: "string", description: "カテゴリでフィルタ" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_dojos",
      description: "道場一覧を取得します。柔術道場・ジムの情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_venues",
      description: "会場一覧を取得します。大会が開催される会場の情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          country: { type: "string", description: "国コードでフィルタ（例: JP）" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_database",
      description: "データベースを検索します。選手名、大会名、道場名などで検索できます。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード" },
          table: { type: "string", enum: ["celebrities", "tournaments", "techniques", "dojos", "venues"], description: "検索対象テーブル" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_statistics",
      description: "統計情報を取得します。登録数などの概要情報を返します。",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Execute tool calls
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const supabase = createSupabaseClient();
  
  try {
    switch (name) {
      case 'list_tournaments': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('tournaments')
          .select('id, name, name_ja, date_start, date_end, location, location_ja, category, country')
          .order('date_start', { ascending: false })
          .limit(limit);
        
        if (args.upcoming_only) {
          query = query.gte('date_start', new Date().toISOString().split('T')[0]);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return "大会データが見つかりませんでした。";
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'list_celebrities': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('celebrities')
          .select('id, display_name, name_ja, bio, home_dojo, belt_history, featured')
          .order('sort_order', { ascending: true })
          .limit(limit);
        
        if (args.featured_only) {
          query = query.eq('featured', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return "選手データが見つかりませんでした。";
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'list_techniques': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('techniques')
          .select('id, name, name_ja, category, description_ja, series_name')
          .order('display_order', { ascending: true })
          .limit(limit);
        
        if (args.category) {
          query = query.eq('category', args.category as string);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return "テクニックデータが見つかりませんでした。";
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'list_dojos': {
        const limit = (args.limit as number) || 20;
        const { data, error } = await supabase
          .from('dojos')
          .select('id, name, name_ja, location, website, instagram')
          .limit(limit);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return "道場データが見つかりませんでした。";
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'list_venues': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('venues')
          .select('id, name, name_ja, address_ja, city, country, capacity')
          .limit(limit);
        
        if (args.country) {
          query = query.eq('country', args.country as string);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return "会場データが見つかりませんでした。";
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'search_database': {
        const searchQuery = args.query as string;
        const table = args.table as string || 'celebrities';
        
        let data, error;
        
        switch (table) {
          case 'celebrities':
            ({ data, error } = await supabase
              .from('celebrities')
              .select('id, display_name, name_ja, bio, home_dojo')
              .or(`display_name.ilike.%${searchQuery}%,name_ja.ilike.%${searchQuery}%`)
              .limit(10));
            break;
          case 'tournaments':
            ({ data, error } = await supabase
              .from('tournaments')
              .select('id, name, name_ja, start_date, location')
              .or(`name.ilike.%${searchQuery}%,name_ja.ilike.%${searchQuery}%`)
              .limit(10));
            break;
          case 'techniques':
            ({ data, error } = await supabase
              .from('techniques')
              .select('id, name, name_ja, category')
              .or(`name.ilike.%${searchQuery}%,name_ja.ilike.%${searchQuery}%`)
              .limit(10));
            break;
          case 'dojos':
            ({ data, error } = await supabase
              .from('dojos')
              .select('id, name, name_ja, location')
              .or(`name.ilike.%${searchQuery}%,name_ja.ilike.%${searchQuery}%`)
              .limit(10));
            break;
          case 'venues':
            ({ data, error } = await supabase
              .from('venues')
              .select('id, name, name_ja, city')
              .or(`name.ilike.%${searchQuery}%,name_ja.ilike.%${searchQuery}%`)
              .limit(10));
            break;
          default:
            return "不明なテーブルです。";
        }
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return `「${searchQuery}」に一致するデータが見つかりませんでした。`;
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'get_statistics': {
        const [celebrities, tournaments, techniques, dojos, venues] = await Promise.all([
          supabase.from('celebrities').select('id', { count: 'exact', head: true }),
          supabase.from('tournaments').select('id', { count: 'exact', head: true }),
          supabase.from('techniques').select('id', { count: 'exact', head: true }),
          supabase.from('dojos').select('id', { count: 'exact', head: true }),
          supabase.from('venues').select('id', { count: 'exact', head: true }),
        ]);
        
        return JSON.stringify({
          celebrities: celebrities.count || 0,
          tournaments: tournaments.count || 0,
          techniques: techniques.count || 0,
          dojos: dojos.count || 0,
          venues: venues.count || 0,
        }, null, 2);
      }
      
      default:
        return `不明なツール: ${name}`;
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function callLovableAI(messages: ChatMessage[], model: string): Promise<{ content: string; tool_calls?: ToolCall[] }> {
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
        { 
          role: 'system', 
          content: `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。
データベースからの情報が必要な場合は、適切なツールを使用してください。
ツールから取得したデータは、ユーザーにわかりやすく整形して表示してください。` 
        },
        ...messages,
      ],
      tools: tools,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  return {
    content: message?.content || '',
    tool_calls: message?.tool_calls,
  };
}

async function callOpenAI(messages: ChatMessage[], model: string, apiKey: string): Promise<{ content: string; tool_calls?: ToolCall[] }> {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set it in Settings.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。
データベースからの情報が必要な場合は、適切なツールを使用してください。
ツールから取得したデータは、ユーザーにわかりやすく整形して表示してください。` 
        },
        ...messages,
      ],
      tools: tools,
      tool_choice: "auto",
      max_completion_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', response.status, errorText);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  return {
    content: message?.content || '',
    tool_calls: message?.tool_calls,
  };
}

async function callAnthropic(messages: ChatMessage[], model: string, apiKey: string): Promise<{ content: string; tool_calls?: ToolCall[] }> {
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured. Please set it in Settings.');
  }

  // Convert tools to Anthropic format
  const anthropicTools = tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

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
      system: `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。
データベースからの情報が必要な場合は、適切なツールを使用してください。
ツールから取得したデータは、ユーザーにわかりやすく整形して表示してください。`,
      messages: messages.map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content })),
      tools: anthropicTools,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic error:', response.status, errorText);
    throw new Error(`Anthropic error: ${response.status}`);
  }

  const data = await response.json();
  
  // Check for tool use in response
  const toolUseBlock = data.content?.find((block: { type: string }) => block.type === 'tool_use');
  if (toolUseBlock) {
    return {
      content: '',
      tool_calls: [{
        id: toolUseBlock.id,
        type: 'function',
        function: {
          name: toolUseBlock.name,
          arguments: JSON.stringify(toolUseBlock.input),
        },
      }],
    };
  }
  
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  return {
    content: textBlock?.text || '',
  };
}

async function callGroq(messages: ChatMessage[], model: string, apiKey: string): Promise<{ content: string; tool_calls?: ToolCall[] }> {
  const key = apiKey || Deno.env.get('GROQ_API_KEY') || '';
  if (!key) {
    throw new Error('Groq API key is not configured. Please set it in Settings.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。
データベースからの情報が必要な場合は、適切なツールを使用してください。
ツールから取得したデータは、ユーザーにわかりやすく整形して表示してください。` 
        },
        ...messages,
      ],
      tools: tools,
      tool_choice: "auto",
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
  const message = data.choices?.[0]?.message;
  
  return {
    content: message?.content || '',
    tool_calls: message?.tool_calls,
  };
}

async function callPerplexity(messages: ChatMessage[], model: string, apiKey: string): Promise<{ content: string }> {
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured. Please set it in Settings.');
  }

  // Perplexity doesn't support tool calling, so we just do a regular chat
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。' },
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
  return {
    content: data.choices?.[0]?.message?.content || '',
  };
}

async function processWithTools(
  messages: ChatMessage[], 
  provider: string, 
  model: string, 
  apiKeys: Record<string, string>
): Promise<string> {
  let result: { content: string; tool_calls?: ToolCall[] };
  
  // First call to get initial response or tool calls
  switch (provider) {
    case 'lovable':
      result = await callLovableAI(messages, model);
      break;
    case 'openai':
      result = await callOpenAI(messages, model, apiKeys.OPENAI_API_KEY || '');
      break;
    case 'anthropic':
      result = await callAnthropic(messages, model, apiKeys.ANTHROPIC_API_KEY || '');
      break;
    case 'groq':
      result = await callGroq(messages, model, apiKeys.GROQ_API_KEY || '');
      break;
    case 'perplexity':
      // Perplexity doesn't support tools
      const perplexityResult = await callPerplexity(messages, model, apiKeys.PERPLEXITY_API_KEY || '');
      return perplexityResult.content;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  
  // If no tool calls, return content directly
  if (!result.tool_calls || result.tool_calls.length === 0) {
    return result.content;
  }
  
  // Execute tool calls
  const toolResults: ChatMessage[] = [];
  for (const toolCall of result.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);
    const toolResult = await executeTool(toolCall.function.name, args);
    
    toolResults.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult,
    });
  }
  
  // Add assistant message with tool calls and tool results to messages
  const updatedMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: result.content || '', tool_calls: result.tool_calls },
    ...toolResults,
  ];
  
  // Make a follow-up call to get final response
  let finalResult: { content: string; tool_calls?: ToolCall[] };
  
  switch (provider) {
    case 'lovable':
      finalResult = await callLovableAI(updatedMessages, model);
      break;
    case 'openai':
      finalResult = await callOpenAI(updatedMessages, model, apiKeys.OPENAI_API_KEY || '');
      break;
    case 'anthropic':
      finalResult = await callAnthropic(updatedMessages, model, apiKeys.ANTHROPIC_API_KEY || '');
      break;
    case 'groq':
      finalResult = await callGroq(updatedMessages, model, apiKeys.GROQ_API_KEY || '');
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  
  return finalResult.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider, model, apiKeys = {} }: ChatRequest = await req.json();

    console.log(`MCP Chat request - Provider: ${provider}, Model: ${model}`);

    const content = await processWithTools(messages, provider, model, apiKeys);

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
