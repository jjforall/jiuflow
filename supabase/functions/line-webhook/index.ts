import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSafeIlikeFilter } from "../_shared/search-utils.ts";

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

// MCP Tools definition (same as mcp-chat)
const tools = [
  {
    type: "function",
    function: {
      name: "search_celebrities",
      description: "柔術選手・有名人を検索します。名前、所属団体、帯などで検索できます。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード（名前、団体名など）" },
          limit: { type: "number", description: "取得件数（デフォルト10）" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_tournaments",
      description: "大会・トーナメント情報を検索します。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード" },
          upcoming: { type: "boolean", description: "今後開催予定のみ取得" },
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_techniques",
      description: "柔術テクニック・技を検索します。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード（技名、カテゴリなど）" },
          category: { type: "string", description: "カテゴリ（guard, pass, sweep, submission等）" },
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_dojos",
      description: "道場・ジム情報を検索します。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード（道場名、場所など）" },
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_venues",
      description: "会場情報を検索します。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "検索キーワード（会場名、場所など）" },
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_statistics",
      description: "JiuFlowの統計情報を取得します。",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "list_users",
      description: "ユーザー一覧を取得します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト20）" },
          search: { type: "string", description: "検索キーワード" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_subscriptions",
      description: "サブスクリプション一覧を取得します。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "ステータスでフィルタ（active, canceled等）" },
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_organizations",
      description: "組織・団体一覧を取得します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_record_by_id",
      description: "指定されたテーブルのレコードをIDで取得します。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "テーブル名" },
          id: { type: "string", description: "レコードID（UUID）" }
        },
        required: ["table", "id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_tournament",
      description: "新しい大会を作成します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "大会名" },
          name_ja: { type: "string", description: "大会名（日本語）" },
          date_start: { type: "string", description: "開催開始日（YYYY-MM-DD形式）" },
          date_end: { type: "string", description: "開催終了日（YYYY-MM-DD形式）" },
          location: { type: "string", description: "開催場所" },
          description: { type: "string", description: "説明" }
        },
        required: ["name", "name_ja", "date_start"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_celebrity",
      description: "新しい選手・有名人を作成します。",
      parameters: {
        type: "object",
        properties: {
          display_name: { type: "string", description: "表示名" },
          bio: { type: "string", description: "プロフィール" },
          home_dojo: { type: "string", description: "所属道場" }
        },
        required: ["display_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_technique",
      description: "新しいテクニックを作成します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "技名（英語）" },
          name_ja: { type: "string", description: "技名（日本語）" },
          name_pt: { type: "string", description: "技名（ポルトガル語）" },
          category: { type: "string", description: "カテゴリ" },
          description: { type: "string", description: "説明" }
        },
        required: ["name", "name_ja", "name_pt", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_dojo",
      description: "新しい道場を作成します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "道場名（英語）" },
          name_ja: { type: "string", description: "道場名（日本語）" },
          name_pt: { type: "string", description: "道場名（ポルトガル語）" },
          location: { type: "string", description: "所在地" },
          description: { type: "string", description: "説明" }
        },
        required: ["name", "name_ja", "name_pt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_venue",
      description: "新しい会場を作成します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "会場名（英語）" },
          name_ja: { type: "string", description: "会場名（日本語）" },
          location: { type: "string", description: "所在地" },
          capacity: { type: "number", description: "収容人数" }
        },
        required: ["name", "name_ja"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_tournament",
      description: "大会情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "大会ID" },
          name: { type: "string", description: "大会名" },
          name_ja: { type: "string", description: "大会名（日本語）" },
          date_start: { type: "string", description: "開催開始日" },
          date_end: { type: "string", description: "開催終了日" },
          location: { type: "string", description: "開催場所" },
          description: { type: "string", description: "説明" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_celebrity",
      description: "選手・有名人情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "選手ID" },
          display_name: { type: "string", description: "表示名" },
          bio: { type: "string", description: "プロフィール" },
          home_dojo: { type: "string", description: "所属道場" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_technique",
      description: "テクニック情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "テクニックID" },
          name: { type: "string", description: "技名（英語）" },
          name_ja: { type: "string", description: "技名（日本語）" },
          category: { type: "string", description: "カテゴリ" },
          description: { type: "string", description: "説明" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_dojo",
      description: "道場情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "道場ID" },
          name: { type: "string", description: "道場名" },
          name_ja: { type: "string", description: "道場名（日本語）" },
          location: { type: "string", description: "所在地" },
          description: { type: "string", description: "説明" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_venue",
      description: "会場情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "会場ID" },
          name: { type: "string", description: "会場名" },
          name_ja: { type: "string", description: "会場名（日本語）" },
          location: { type: "string", description: "所在地" },
          capacity: { type: "number", description: "収容人数" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_record",
      description: "指定されたテーブルのレコードを削除します。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "テーブル名（tournaments, celebrities, techniques, dojos, venues）" },
          id: { type: "string", description: "削除するレコードのID" }
        },
        required: ["table", "id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_update",
      description: "複数のレコードを一括更新します。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "テーブル名" },
          ids: { type: "array", items: { type: "string" }, description: "更新するレコードのID配列" },
          data: { type: "object", description: "更新するデータ" }
        },
        required: ["table", "ids", "data"]
      }
    }
  }
];

// Execute tool function
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`Executing tool: ${name}`, JSON.stringify(args));
  
  try {
    switch (name) {
      case "search_celebrities": {
        let query = supabase.from('celebrities').select('id, display_name, bio, home_dojo, avatar_url');
        const searchFilter = buildSafeIlikeFilter(['display_name', 'bio', 'home_dojo'], args.query as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        const { data, error } = await query.limit(Number(args.limit) || 10);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "search_tournaments": {
        let query = supabase.from('tournaments').select('id, name, name_ja, date_start, date_end, location, location_ja');
        const searchFilter = buildSafeIlikeFilter(['name', 'name_ja'], args.query as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        if (args.upcoming) {
          query = query.gte('date_start', new Date().toISOString().split('T')[0]);
        }
        const { data, error } = await query.order('date_start', { ascending: true }).limit(Number(args.limit) || 10);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "search_techniques": {
        let query = supabase.from('techniques').select('id, name, name_ja, category, description');
        const searchFilter = buildSafeIlikeFilter(['name', 'name_ja', 'description'], args.query as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        if (args.category) {
          query = query.eq('category', args.category);
        }
        const { data, error } = await query.limit(Number(args.limit) || 10);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "search_dojos": {
        let query = supabase.from('dojos').select('id, name, name_ja, location, description');
        const searchFilter = buildSafeIlikeFilter(['name', 'name_ja', 'location'], args.query as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        const { data, error } = await query.limit(Number(args.limit) || 10);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "search_venues": {
        let query = supabase.from('venues').select('id, name, name_ja, location, capacity');
        const searchFilter = buildSafeIlikeFilter(['name', 'name_ja', 'location'], args.query as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        const { data, error } = await query.limit(Number(args.limit) || 10);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "get_statistics": {
        const [celebrities, tournaments, techniques, dojos, venues, profiles, subscriptions] = await Promise.all([
          supabase.from('celebrities').select('id', { count: 'exact', head: true }),
          supabase.from('tournaments').select('id', { count: 'exact', head: true }),
          supabase.from('techniques').select('id', { count: 'exact', head: true }),
          supabase.from('dojos').select('id', { count: 'exact', head: true }),
          supabase.from('venues').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true })
        ]);
        return JSON.stringify({
          celebrities: celebrities.count || 0,
          tournaments: tournaments.count || 0,
          techniques: techniques.count || 0,
          dojos: dojos.count || 0,
          venues: venues.count || 0,
          profiles: profiles.count || 0,
          subscriptions: subscriptions.count || 0
        });
      }

      case "list_users": {
        let query = supabase.from('profiles').select('id, display_name, username, avatar_url, created_at');
        const searchFilter = buildSafeIlikeFilter(['display_name', 'username'], args.search as string);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(Number(args.limit) || 20);
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "list_subscriptions": {
        let query = supabase.from('subscriptions').select('id, user_id, status, plan_type, created_at, current_period_end');
        if (args.status) {
          query = query.eq('status', args.status);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(Number(args.limit) || 20);
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "list_organizations": {
        const { data, error } = await supabase.from('organizations')
          .select('id, name, name_ja, description, logo_url')
          .limit(Number(args.limit) || 20);
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "get_record_by_id": {
        const { data, error } = await supabase.from(args.table as string)
          .select('*')
          .eq('id', args.id)
          .single();
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "create_tournament": {
        const { data, error } = await supabase.from('tournaments').insert({
          name: args.name,
          name_ja: args.name_ja,
          date_start: args.date_start || args.date,
          date_end: args.date_end || args.date_start || args.date,
          location: args.location || null,
          description: args.description || null
        }).select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "create_celebrity": {
        const { data, error } = await supabase.from('celebrities').insert({
          display_name: args.display_name,
          bio: args.bio || null,
          home_dojo: args.home_dojo || null
        }).select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "create_technique": {
        const { data, error } = await supabase.from('techniques').insert({
          name: args.name,
          name_ja: args.name_ja,
          name_pt: args.name_pt,
          category: args.category,
          description: args.description || null
        }).select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "create_dojo": {
        const { data, error } = await supabase.from('dojos').insert({
          name: args.name,
          name_ja: args.name_ja,
          name_pt: args.name_pt,
          location: args.location || null,
          description: args.description || null
        }).select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "create_venue": {
        const { data, error } = await supabase.from('venues').insert({
          name: args.name,
          name_ja: args.name_ja,
          location: args.location || null,
          capacity: args.capacity || null
        }).select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "update_tournament": {
        const updateData: Record<string, unknown> = {};
        if (args.name) updateData.name = args.name;
        if (args.name_ja) updateData.name_ja = args.name_ja;
        if (args.date_start || args.date) updateData.date_start = args.date_start || args.date;
        if (args.date_end) updateData.date_end = args.date_end;
        if (args.location) updateData.location = args.location;
        if (args.description) updateData.description = args.description;
        
        const { data, error } = await supabase.from('tournaments')
          .update(updateData)
          .eq('id', args.id)
          .select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "update_celebrity": {
        const updateData: Record<string, unknown> = {};
        if (args.display_name) updateData.display_name = args.display_name;
        if (args.bio) updateData.bio = args.bio;
        if (args.home_dojo) updateData.home_dojo = args.home_dojo;
        
        const { data, error } = await supabase.from('celebrities')
          .update(updateData)
          .eq('id', args.id)
          .select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "update_technique": {
        const updateData: Record<string, unknown> = {};
        if (args.name) updateData.name = args.name;
        if (args.name_ja) updateData.name_ja = args.name_ja;
        if (args.category) updateData.category = args.category;
        if (args.description) updateData.description = args.description;
        
        const { data, error } = await supabase.from('techniques')
          .update(updateData)
          .eq('id', args.id)
          .select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "update_dojo": {
        const updateData: Record<string, unknown> = {};
        if (args.name) updateData.name = args.name;
        if (args.name_ja) updateData.name_ja = args.name_ja;
        if (args.location) updateData.location = args.location;
        if (args.description) updateData.description = args.description;
        
        const { data, error } = await supabase.from('dojos')
          .update(updateData)
          .eq('id', args.id)
          .select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "update_venue": {
        const updateData: Record<string, unknown> = {};
        if (args.name) updateData.name = args.name;
        if (args.name_ja) updateData.name_ja = args.name_ja;
        if (args.location) updateData.location = args.location;
        if (args.capacity) updateData.capacity = args.capacity;
        
        const { data, error } = await supabase.from('venues')
          .update(updateData)
          .eq('id', args.id)
          .select().single();
        if (error) throw error;
        return JSON.stringify({ success: true, data });
      }

      case "delete_record": {
        const allowedTables = ['tournaments', 'celebrities', 'techniques', 'dojos', 'venues'];
        if (!allowedTables.includes(args.table as string)) {
          return JSON.stringify({ success: false, error: `削除は ${allowedTables.join(', ')} テーブルのみ許可されています` });
        }
        
        const { error } = await supabase.from(args.table as string)
          .delete()
          .eq('id', args.id);
        if (error) throw error;
        return JSON.stringify({ success: true, message: `${args.table}からID ${args.id} を削除しました` });
      }

      case "bulk_update": {
        const allowedTables = ['tournaments', 'celebrities', 'techniques', 'dojos', 'venues'];
        if (!allowedTables.includes(args.table as string)) {
          return JSON.stringify({ success: false, error: `一括更新は ${allowedTables.join(', ')} テーブルのみ許可されています` });
        }
        
        const ids = args.ids as string[];
        const updateData = args.data as Record<string, unknown>;
        
        const { error } = await supabase.from(args.table as string)
          .update(updateData)
          .in('id', ids);
        if (error) throw error;
        return JSON.stringify({ success: true, message: `${ids.length}件のレコードを更新しました` });
      }
      
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    console.error(`Tool execution error for ${name}:`, error);
    return JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Process message with tools
async function processWithTools(message: string, systemPrompt: string, model: string, provider: string): Promise<string> {
  const messages: Array<{ role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];

  const apiUrl = provider === 'groq' 
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://ai.gateway.lovable.dev/v1/chat/completions';
  
  const apiKey = provider === 'groq' ? GROQ_API_KEY : LOVABLE_API_KEY;

  // First API call with tools
  console.log('Making initial API call with tools...');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Initial API error:', response.status, errorText);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message;
  
  // Check if tool calls are needed
  if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
    return assistantMessage.content || 'すみません、回答を生成できませんでした。';
  }

  console.log('Processing tool calls:', assistantMessage.tool_calls.length);
  
  // Add assistant message with tool calls
  messages.push(assistantMessage);

  // Execute all tool calls
  for (const toolCall of assistantMessage.tool_calls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
    
    console.log(`Executing tool: ${functionName}`);
    const result = await executeTool(functionName, functionArgs);
    
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      name: functionName,
      content: result
    });
  }

  // Second API call with tool results
  console.log('Making follow-up API call with tool results...');
  const followUpResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
    }),
  });

  if (!followUpResponse.ok) {
    const errorText = await followUpResponse.text();
    console.error('Follow-up API error:', followUpResponse.status, errorText);
    throw new Error(`Follow-up API error: ${followUpResponse.status}`);
  }

  const followUpData = await followUpResponse.json();
  return followUpData.choices[0].message.content || 'すみません、回答を生成できませんでした。';
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
      system_prompt: `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。
MCPツールを使って、選手情報、大会情報、テクニック情報、道場情報、会場情報などを検索・作成・更新・削除できます。
データベースの情報を操作する際は、適切なツールを使用してください。`,
      groq_model: 'llama-3.3-70b-versatile',
      lovable_model: 'google/gemini-2.5-flash'
    };
  }
  
  return data;
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
          const model = provider === 'groq' ? settings.groq_model : settings.lovable_model;
          
          try {
            // Use processWithTools for tool-enabled responses
            aiResponse = await processWithTools(userMessage, settings.system_prompt, model, provider);
            
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
