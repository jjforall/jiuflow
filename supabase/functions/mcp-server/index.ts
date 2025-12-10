import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; permissions: string[] }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('id, permissions, expires_at, is_active')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !keyData) {
    return { valid: false, permissions: [] };
  }
  
  if (!keyData.is_active) {
    return { valid: false, permissions: [] };
  }
  
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, permissions: [] };
  }
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);
  
  return { valid: true, permissions: keyData.permissions || ['read'] };
}

// MCP Tool definitions
const tools = [
  {
    name: "list_celebrities",
    description: "選手（有名人）の一覧を取得します。検索やページネーションに対応しています。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前で検索" },
        limit: { type: "number", description: "取得件数（デフォルト: 50）" },
        offset: { type: "number", description: "オフセット（デフォルト: 0）" },
      },
    },
  },
  {
    name: "get_celebrity",
    description: "指定したIDの選手情報を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "選手ID（UUID）" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_celebrity",
    description: "新しい選手を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "表示名" },
        bio: { type: "string", description: "プロフィール" },
        home_dojo: { type: "string", description: "所属道場" },
      },
      required: ["display_name"],
    },
  },
  {
    name: "update_celebrity",
    description: "選手情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "選手ID（UUID）" },
        display_name: { type: "string", description: "表示名" },
        bio: { type: "string", description: "プロフィール" },
        home_dojo: { type: "string", description: "所属道場" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_celebrity",
    description: "選手を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "選手ID（UUID）" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_tournaments",
    description: "大会の一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前で検索" },
        upcoming: { type: "boolean", description: "今後の大会のみ取得" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_tournament",
    description: "指定したIDの大会情報を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "大会ID（UUID）" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_tournament",
    description: "新しい大会を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "大会名（英語）" },
        name_ja: { type: "string", description: "大会名（日本語）" },
        start_date: { type: "string", description: "開始日（YYYY-MM-DD）" },
        end_date: { type: "string", description: "終了日（YYYY-MM-DD）" },
        venue_id: { type: "string", description: "会場ID" },
        series: { type: "string", description: "シリーズ名" },
      },
      required: ["name", "name_ja", "start_date"],
    },
  },
  {
    name: "update_tournament",
    description: "大会情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "大会ID（UUID）" },
        name: { type: "string", description: "大会名（英語）" },
        name_ja: { type: "string", description: "大会名（日本語）" },
        start_date: { type: "string", description: "開始日" },
        end_date: { type: "string", description: "終了日" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_tournament",
    description: "大会を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "大会ID（UUID）" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_venues",
    description: "会場の一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前や都市で検索" },
        country: { type: "string", description: "国コード（例: JP）" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_venue",
    description: "指定したIDの会場情報を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会場ID（UUID）" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_venue",
    description: "新しい会場を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "会場名（英語）" },
        name_ja: { type: "string", description: "会場名（日本語）" },
        city: { type: "string", description: "都市" },
        country: { type: "string", description: "国コード" },
        address: { type: "string", description: "住所" },
        capacity: { type: "number", description: "収容人数" },
      },
      required: ["name", "name_ja"],
    },
  },
  {
    name: "update_venue",
    description: "会場情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会場ID（UUID）" },
        name: { type: "string", description: "会場名（英語）" },
        name_ja: { type: "string", description: "会場名（日本語）" },
        city: { type: "string", description: "都市" },
        address: { type: "string", description: "住所" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_venue",
    description: "会場を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "会場ID（UUID）" },
      },
      required: ["id"],
    },
  },
];

async function executeTool(toolName: string, args: Record<string, unknown>, permissions: string[]): Promise<unknown> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const hasWritePermission = permissions.includes('write') || permissions.includes('admin');

  // Celebrity tools
  if (toolName === 'list_celebrities') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase
      .from('celebrities')
      .select('*', { count: 'exact' })
      .order('display_name')
      .range(offset, offset + limit - 1);
    
    if (args.search) {
      query = query.or(`display_name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    }
    
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  
  if (toolName === 'get_celebrity') {
    const { data, error } = await supabase
      .from('celebrities')
      .select('*')
      .eq('id', args.id)
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'create_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase
      .from('celebrities')
      .insert(args)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'update_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase
      .from('celebrities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'delete_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('celebrities').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // Tournament tools
  if (toolName === 'list_tournaments') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase
      .from('tournaments')
      .select('*, venue:venues(id, name, name_ja)', { count: 'exact' })
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (args.search) {
      query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    }
    if (args.upcoming) {
      query = query.gte('start_date', new Date().toISOString().split('T')[0]);
    }
    
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  
  if (toolName === 'get_tournament') {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, venue:venues(*)')
      .eq('id', args.id)
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'create_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase
      .from('tournaments')
      .insert(args)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'update_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'delete_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('tournaments').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // Venue tools
  if (toolName === 'list_venues') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase
      .from('venues')
      .select('*', { count: 'exact' })
      .order('name')
      .range(offset, offset + limit - 1);
    
    if (args.search) {
      query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%,city.ilike.%${args.search}%`);
    }
    if (args.country) {
      query = query.eq('country', args.country);
    }
    
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  
  if (toolName === 'get_venue') {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', args.id)
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'create_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase
      .from('venues')
      .insert(args)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'update_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase
      .from('venues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (toolName === 'delete_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('venues').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required. Set x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { valid, permissions } = await validateApiKey(apiKey);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // MCP Protocol endpoints
    if (req.method === 'GET') {
      // Server info endpoint
      if (path === 'mcp-server' || path === '') {
        return new Response(JSON.stringify({
          name: "jiuflow-mcp-server",
          version: "1.0.0",
          description: "JiuFlow MCP Server - 選手・大会・会場データを管理",
          capabilities: {
            tools: true,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // List tools endpoint
      if (path === 'tools') {
        return new Response(JSON.stringify({ tools }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      // Call tool endpoint
      if (path === 'call' || body.method === 'tools/call') {
        const { name, arguments: args } = body.params || body;
        
        if (!name) {
          return new Response(
            JSON.stringify({ error: 'Tool name required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const result = await executeTool(name, args || {}, permissions);
        
        return new Response(JSON.stringify({
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // List tools (JSON-RPC style)
      if (body.method === 'tools/list') {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { tools },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Initialize
      if (body.method === 'initialize') {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: {
              name: "jiuflow-mcp-server",
              version: "1.0.0",
            },
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('MCP Server Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
