import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildSafeIlikeFilter } from "../_shared/search-utils.ts";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "../_shared/rate-limit.ts";

// Environment variables for authentication
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Verify admin authentication
async function verifyAdminAuth(req: Request): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  // Check if user has admin role
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const { data: adminRole } = await supabaseService
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!adminRole) {
    return { authorized: false, error: 'Admin role required' };
  }

  return { authorized: true, userId: user.id };
}

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
  // === 読み取り系ツール ===
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
      name: "list_users",
      description: "ユーザー（会員）一覧を取得します。プロフィール情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          public_only: { type: "boolean", description: "公開プロフィールのみ表示" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_subscriptions",
      description: "サブスクリプション一覧を取得します。有料会員の情報を返します。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "取得件数（デフォルト: 20）" },
          status: { type: "string", enum: ["active", "trialing", "canceled", "past_due"], description: "ステータスでフィルタ" }
        }
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
          limit: { type: "number", description: "取得件数（デフォルト: 20）" }
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
          table: { type: "string", enum: ["celebrities", "tournaments", "techniques", "dojos", "venues", "profiles"], description: "検索対象テーブル" }
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
  },
  {
    type: "function",
    function: {
      name: "get_record_by_id",
      description: "IDを指定して特定のレコードを取得します。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ["celebrities", "tournaments", "techniques", "dojos", "venues", "profiles", "organizations"], description: "テーブル名" },
          id: { type: "string", description: "レコードのUUID" }
        },
        required: ["table", "id"]
      }
    }
  },
  // === 作成系ツール ===
  {
    type: "function",
    function: {
      name: "create_tournament",
      description: "新しい大会を作成します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "大会名（英語）" },
          name_ja: { type: "string", description: "大会名（日本語）" },
          date_start: { type: "string", description: "開催日（YYYY-MM-DD形式）" },
          date_end: { type: "string", description: "終了日（YYYY-MM-DD形式、任意）" },
          location: { type: "string", description: "開催地（英語）" },
          location_ja: { type: "string", description: "開催地（日本語）" },
          organizer: { type: "string", description: "主催者" },
          category: { type: "string", description: "カテゴリ（gi/nogi/both）" },
          country: { type: "string", description: "国コード（例: JP）" }
        },
        required: ["name", "date_start", "location", "organizer"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_celebrity",
      description: "新しい選手を登録します。",
      parameters: {
        type: "object",
        properties: {
          display_name: { type: "string", description: "表示名（英語）" },
          name_ja: { type: "string", description: "名前（日本語）" },
          bio: { type: "string", description: "経歴・プロフィール（英語）" },
          bio_ja: { type: "string", description: "経歴・プロフィール（日本語）" },
          home_dojo: { type: "string", description: "所属道場" },
          birth_date: { type: "string", description: "生年月日（YYYY-MM-DD形式）" },
          featured: { type: "boolean", description: "注目選手として表示" }
        },
        required: ["display_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_technique",
      description: "新しいテクニックを登録します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "テクニック名（英語）" },
          name_ja: { type: "string", description: "テクニック名（日本語）" },
          name_pt: { type: "string", description: "テクニック名（ポルトガル語）" },
          category: { type: "string", description: "カテゴリ" },
          description: { type: "string", description: "説明（英語）" },
          description_ja: { type: "string", description: "説明（日本語）" },
          visibility: { type: "string", enum: ["public", "members", "premium"], description: "公開範囲" }
        },
        required: ["name", "name_ja", "name_pt", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_dojo",
      description: "新しい道場を登録します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "道場名（英語）" },
          name_ja: { type: "string", description: "道場名（日本語）" },
          name_pt: { type: "string", description: "道場名（ポルトガル語）" },
          location: { type: "string", description: "住所" },
          description: { type: "string", description: "説明（英語）" },
          description_ja: { type: "string", description: "説明（日本語）" },
          website: { type: "string", description: "ウェブサイトURL" },
          email: { type: "string", description: "メールアドレス" },
          phone: { type: "string", description: "電話番号" },
          instagram: { type: "string", description: "Instagram" }
        },
        required: ["name", "name_ja", "name_pt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_venue",
      description: "新しい会場を登録します。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "会場名（英語）" },
          name_ja: { type: "string", description: "会場名（日本語）" },
          address: { type: "string", description: "住所（英語）" },
          address_ja: { type: "string", description: "住所（日本語）" },
          city: { type: "string", description: "都市名" },
          country: { type: "string", description: "国コード（例: JP）" },
          capacity: { type: "number", description: "収容人数" }
        },
        required: ["name", "country"]
      }
    }
  },
  // === 更新系ツール ===
  {
    type: "function",
    function: {
      name: "update_tournament",
      description: "既存の大会情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "大会のUUID" },
          name: { type: "string", description: "大会名（英語）" },
          name_ja: { type: "string", description: "大会名（日本語）" },
          date_start: { type: "string", description: "開催日" },
          date_end: { type: "string", description: "終了日" },
          location: { type: "string", description: "開催地（英語）" },
          location_ja: { type: "string", description: "開催地（日本語）" },
          category: { type: "string", description: "カテゴリ" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_celebrity",
      description: "既存の選手情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "選手のUUID" },
          display_name: { type: "string", description: "表示名" },
          name_ja: { type: "string", description: "名前（日本語）" },
          bio: { type: "string", description: "経歴（英語）" },
          bio_ja: { type: "string", description: "経歴（日本語）" },
          home_dojo: { type: "string", description: "所属道場" },
          featured: { type: "boolean", description: "注目選手として表示" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_technique",
      description: "既存のテクニック情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "テクニックのUUID" },
          name: { type: "string", description: "テクニック名（英語）" },
          name_ja: { type: "string", description: "テクニック名（日本語）" },
          category: { type: "string", description: "カテゴリ" },
          description: { type: "string", description: "説明（英語）" },
          description_ja: { type: "string", description: "説明（日本語）" },
          visibility: { type: "string", enum: ["public", "members", "premium"], description: "公開範囲" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_dojo",
      description: "既存の道場情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "道場のUUID" },
          name: { type: "string", description: "道場名（英語）" },
          name_ja: { type: "string", description: "道場名（日本語）" },
          location: { type: "string", description: "住所" },
          website: { type: "string", description: "ウェブサイト" },
          email: { type: "string", description: "メール" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_venue",
      description: "既存の会場情報を更新します。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "会場のUUID" },
          name: { type: "string", description: "会場名（英語）" },
          name_ja: { type: "string", description: "会場名（日本語）" },
          address: { type: "string", description: "住所（英語）" },
          address_ja: { type: "string", description: "住所（日本語）" },
          capacity: { type: "number", description: "収容人数" }
        },
        required: ["id"]
      }
    }
  },
  // === 削除系ツール ===
  {
    type: "function",
    function: {
      name: "delete_record",
      description: "レコードを削除します。注意: この操作は取り消せません。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ["celebrities", "tournaments", "techniques", "dojos", "venues"], description: "テーブル名" },
          id: { type: "string", description: "削除するレコードのUUID" },
          confirm: { type: "boolean", description: "削除を確認（trueを指定）" }
        },
        required: ["table", "id", "confirm"]
      }
    }
  },
  // === 特殊操作ツール ===
  {
    type: "function",
    function: {
      name: "bulk_update",
      description: "複数のレコードを一括更新します。",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ["celebrities", "tournaments", "techniques", "dojos", "venues"], description: "テーブル名" },
          filter_column: { type: "string", description: "フィルタ列名" },
          filter_value: { type: "string", description: "フィルタ値" },
          updates: { type: "object", description: "更新内容（キーと値のオブジェクト）" }
        },
        required: ["table", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "カスタムSQLクエリを実行します（読み取り専用）。複雑な集計やJOINが必要な場合に使用。",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "何を取得したいかの説明" }
        },
        required: ["description"]
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
        const allowedTables = ['celebrities', 'tournaments', 'techniques', 'dojos', 'venues'];
        
        if (!allowedTables.includes(table)) {
          return "不明なテーブルです。";
        }
        
        let data, error;
        
        const tableFieldMap: Record<string, { from: string; select: string; fields: string[] }> = {
          celebrities: { from: 'celebrities', select: 'id, display_name, name_ja, bio, home_dojo', fields: ['display_name', 'name_ja'] },
          tournaments: { from: 'tournaments', select: 'id, name, name_ja, date_start, location', fields: ['name', 'name_ja'] },
          techniques: { from: 'techniques', select: 'id, name, name_ja, category', fields: ['name', 'name_ja'] },
          dojos: { from: 'dojos', select: 'id, name, name_ja, location', fields: ['name', 'name_ja'] },
          venues: { from: 'venues', select: 'id, name, name_ja, city', fields: ['name', 'name_ja'] },
        };
        
        const config = tableFieldMap[table];
        const searchFilter = buildSafeIlikeFilter(config.fields, searchQuery);
        
        if (!searchFilter) {
          return `検索クエリが無効です。`;
        }
        
        ({ data, error } = await supabase
          .from(config.from)
          .select(config.select)
          .or(searchFilter)
          .limit(10));
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          return `「${searchQuery}」に一致するデータが見つかりませんでした。`;
        }
        
        return JSON.stringify(data, null, 2);
      }
      
      case 'get_statistics': {
        const [celebrities, tournaments, techniques, dojos, venues, profiles, subscriptions] = await Promise.all([
          supabase.from('celebrities').select('id', { count: 'exact', head: true }),
          supabase.from('tournaments').select('id', { count: 'exact', head: true }),
          supabase.from('techniques').select('id', { count: 'exact', head: true }),
          supabase.from('dojos').select('id', { count: 'exact', head: true }),
          supabase.from('venues').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        ]);
        
        return JSON.stringify({
          celebrities: celebrities.count || 0,
          tournaments: tournaments.count || 0,
          techniques: techniques.count || 0,
          dojos: dojos.count || 0,
          venues: venues.count || 0,
          profiles: profiles.count || 0,
          active_subscriptions: subscriptions.count || 0,
        }, null, 2);
      }
      
      case 'list_users': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, home_dojo, is_public, belt_history, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (args.public_only) {
          query = query.eq('is_public', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return JSON.stringify(data || [], null, 2);
      }
      
      case 'list_subscriptions': {
        const limit = (args.limit as number) || 20;
        let query = supabase
          .from('subscriptions')
          .select('id, user_id, plan_type, status, current_period_end, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (args.status) {
          query = query.eq('status', args.status as string);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return JSON.stringify(data || [], null, 2);
      }
      
      case 'list_organizations': {
        const limit = (args.limit as number) || 20;
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, name_ja, description, website, logo_url')
          .limit(limit);
        
        if (error) throw error;
        return JSON.stringify(data || [], null, 2);
      }
      
      case 'get_record_by_id': {
        const table = args.table as string;
        const id = args.id as string;
        
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return JSON.stringify(data, null, 2);
      }
      
      // === 作成系 ===
      case 'create_tournament': {
        const { data, error } = await supabase
          .from('tournaments')
          .insert({
            name: args.name as string,
            name_ja: args.name_ja as string || args.name as string,
            date_start: args.date_start as string,
            date_end: args.date_end as string,
            location: args.location as string,
            location_ja: args.location_ja as string || args.location as string,
            organizer: args.organizer as string,
            category: args.category as string || 'gi',
            country: args.country as string || 'JP',
          })
          .select()
          .single();
        
        if (error) throw error;
        return `大会「${args.name}」を作成しました。ID: ${data.id}`;
      }
      
      case 'create_celebrity': {
        const { data, error } = await supabase
          .from('celebrities')
          .insert({
            display_name: args.display_name as string,
            name_ja: args.name_ja as string,
            bio: args.bio as string,
            bio_ja: args.bio_ja as string,
            home_dojo: args.home_dojo as string,
            birth_date: args.birth_date as string,
            featured: args.featured as boolean || false,
          })
          .select()
          .single();
        
        if (error) throw error;
        return `選手「${args.display_name}」を登録しました。ID: ${data.id}`;
      }
      
      case 'create_technique': {
        const { data, error } = await supabase
          .from('techniques')
          .insert({
            name: args.name as string,
            name_ja: args.name_ja as string,
            name_pt: args.name_pt as string || args.name as string,
            category: args.category as string,
            description: args.description as string,
            description_ja: args.description_ja as string,
            visibility: args.visibility as string || 'public',
          })
          .select()
          .single();
        
        if (error) throw error;
        return `テクニック「${args.name}」を登録しました。ID: ${data.id}`;
      }
      
      case 'create_dojo': {
        const { data, error } = await supabase
          .from('dojos')
          .insert({
            name: args.name as string,
            name_ja: args.name_ja as string,
            name_pt: args.name_pt as string || args.name as string,
            location: args.location as string,
            description: args.description as string,
            description_ja: args.description_ja as string,
            website: args.website as string,
            email: args.email as string,
            phone: args.phone as string,
            instagram: args.instagram as string,
          })
          .select()
          .single();
        
        if (error) throw error;
        return `道場「${args.name}」を登録しました。ID: ${data.id}`;
      }
      
      case 'create_venue': {
        const { data, error } = await supabase
          .from('venues')
          .insert({
            name: args.name as string,
            name_ja: args.name_ja as string,
            address: args.address as string,
            address_ja: args.address_ja as string,
            city: args.city as string,
            country: args.country as string,
            capacity: args.capacity as number,
          })
          .select()
          .single();
        
        if (error) throw error;
        return `会場「${args.name}」を登録しました。ID: ${data.id}`;
      }
      
      // === 更新系 ===
      case 'update_tournament': {
        const id = args.id as string;
        const updates: Record<string, unknown> = {};
        
        if (args.name) updates.name = args.name;
        if (args.name_ja) updates.name_ja = args.name_ja;
        if (args.date_start) updates.date_start = args.date_start;
        if (args.date_end) updates.date_end = args.date_end;
        if (args.location) updates.location = args.location;
        if (args.location_ja) updates.location_ja = args.location_ja;
        if (args.category) updates.category = args.category;
        
        const { error } = await supabase
          .from('tournaments')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        return `大会（ID: ${id}）を更新しました。`;
      }
      
      case 'update_celebrity': {
        const id = args.id as string;
        const updates: Record<string, unknown> = {};
        
        if (args.display_name) updates.display_name = args.display_name;
        if (args.name_ja) updates.name_ja = args.name_ja;
        if (args.bio) updates.bio = args.bio;
        if (args.bio_ja) updates.bio_ja = args.bio_ja;
        if (args.home_dojo) updates.home_dojo = args.home_dojo;
        if (args.featured !== undefined) updates.featured = args.featured;
        
        const { error } = await supabase
          .from('celebrities')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        return `選手（ID: ${id}）を更新しました。`;
      }
      
      case 'update_technique': {
        const id = args.id as string;
        const updates: Record<string, unknown> = {};
        
        if (args.name) updates.name = args.name;
        if (args.name_ja) updates.name_ja = args.name_ja;
        if (args.category) updates.category = args.category;
        if (args.description) updates.description = args.description;
        if (args.description_ja) updates.description_ja = args.description_ja;
        if (args.visibility) updates.visibility = args.visibility;
        
        const { error } = await supabase
          .from('techniques')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        return `テクニック（ID: ${id}）を更新しました。`;
      }
      
      case 'update_dojo': {
        const id = args.id as string;
        const updates: Record<string, unknown> = {};
        
        if (args.name) updates.name = args.name;
        if (args.name_ja) updates.name_ja = args.name_ja;
        if (args.location) updates.location = args.location;
        if (args.website) updates.website = args.website;
        if (args.email) updates.email = args.email;
        
        const { error } = await supabase
          .from('dojos')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        return `道場（ID: ${id}）を更新しました。`;
      }
      
      case 'update_venue': {
        const id = args.id as string;
        const updates: Record<string, unknown> = {};
        
        if (args.name) updates.name = args.name;
        if (args.name_ja) updates.name_ja = args.name_ja;
        if (args.address) updates.address = args.address;
        if (args.address_ja) updates.address_ja = args.address_ja;
        if (args.capacity) updates.capacity = args.capacity;
        
        const { error } = await supabase
          .from('venues')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        return `会場（ID: ${id}）を更新しました。`;
      }
      
      // === 削除系 ===
      case 'delete_record': {
        const table = args.table as string;
        const id = args.id as string;
        const confirm = args.confirm as boolean;
        
        if (!confirm) {
          return "削除を実行するには confirm: true を指定してください。";
        }
        
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return `${table}からレコード（ID: ${id}）を削除しました。`;
      }
      
      // === 一括更新 ===
      case 'bulk_update': {
        const table = args.table as string;
        const updates = args.updates as Record<string, unknown>;
        
        let query = supabase.from(table).update(updates);
        
        if (args.filter_column && args.filter_value) {
          query = query.eq(args.filter_column as string, args.filter_value);
        }
        
        const { error, count } = await query;
        
        if (error) throw error;
        return `${table}で${count || 0}件のレコードを更新しました。`;
      }
      
      case 'execute_sql_query': {
        // This is a placeholder - we don't execute raw SQL for security
        return `SQLクエリの直接実行はセキュリティ上の理由からサポートされていません。代わりに他のツールを使用してください。
要求内容: ${args.description}`;
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

interface ProcessResult {
  content: string;
  debug: {
    toolsUsed: string[];
    toolCalls: Array<{ name: string; args: any; result: string }>;
    aiCalls: number;
    rawResponses: Array<{ type: string; hasToolCalls: boolean; contentLength: number }>;
  };
}

async function processWithTools(
  messages: ChatMessage[], 
  provider: string, 
  model: string, 
  apiKeys: Record<string, string>
): Promise<ProcessResult> {
  const debug = {
    toolsUsed: [] as string[],
    toolCalls: [] as Array<{ name: string; args: any; result: string }>,
    aiCalls: 0,
    rawResponses: [] as Array<{ type: string; hasToolCalls: boolean; contentLength: number }>,
  };

  let result: { content: string; tool_calls?: ToolCall[] };
  
  // First call to get initial response or tool calls
  debug.aiCalls++;
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
      debug.rawResponses.push({ type: 'initial', hasToolCalls: false, contentLength: perplexityResult.content.length });
      return { content: perplexityResult.content, debug };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  
  debug.rawResponses.push({ 
    type: 'initial', 
    hasToolCalls: !!(result.tool_calls && result.tool_calls.length > 0), 
    contentLength: result.content?.length || 0 
  });
  
  // If no tool calls, return content directly
  if (!result.tool_calls || result.tool_calls.length === 0) {
    return { content: result.content, debug };
  }
  
  // Execute tool calls
  const toolResults: ChatMessage[] = [];
  for (const toolCall of result.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);
    const toolResult = await executeTool(toolCall.function.name, args);
    
    debug.toolsUsed.push(toolCall.function.name);
    debug.toolCalls.push({
      name: toolCall.function.name,
      args,
      result: toolResult.substring(0, 500) + (toolResult.length > 500 ? '...' : ''),
    });
    
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
  debug.aiCalls++;
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
  
  debug.rawResponses.push({ 
    type: 'final', 
    hasToolCalls: !!(finalResult.tool_calls && finalResult.tool_calls.length > 0), 
    contentLength: finalResult.content?.length || 0 
  });
  
  return { content: finalResult.content, debug };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Verify admin authentication before processing any requests
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized) {
      console.log(`MCP Chat auth failed: ${authResult.error}`);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, provider, model, apiKeys = {} }: ChatRequest = await req.json();

    console.log(`MCP Chat request - Provider: ${provider}, Model: ${model}, User: ${authResult.userId}`);

    const result = await processWithTools(messages, provider, model, apiKeys);

    return new Response(
      JSON.stringify({ 
        content: result.content,
        debug: result.debug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
