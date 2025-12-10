import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, accept',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MCP_PROTOCOL_VERSION = "2024-11-05";

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
  // ========== Celebrity Tools ==========
  {
    name: "list_celebrities",
    description: "選手（有名人）の一覧を取得します。検索やページネーションに対応。",
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
      properties: { id: { type: "string", description: "選手ID（UUID）" } },
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
      properties: { id: { type: "string", description: "選手ID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Tournament Tools ==========
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
      properties: { id: { type: "string", description: "大会ID（UUID）" } },
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
        date_start: { type: "string", description: "開始日（YYYY-MM-DD）" },
        date_end: { type: "string", description: "終了日（YYYY-MM-DD）" },
        location: { type: "string", description: "開催地（英語）" },
        location_ja: { type: "string", description: "開催地（日本語）" },
        organizer: { type: "string", description: "主催者" },
        country: { type: "string", description: "国コード" },
      },
      required: ["name", "name_ja", "date_start", "location", "organizer"],
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
        date_start: { type: "string", description: "開始日" },
        date_end: { type: "string", description: "終了日" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_tournament",
    description: "大会を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "大会ID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Venue Tools ==========
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
      properties: { id: { type: "string", description: "会場ID（UUID）" } },
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
      required: ["name", "country"],
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
        capacity: { type: "number", description: "収容人数" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_venue",
    description: "会場を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "会場ID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Technique Tools ==========
  {
    name: "list_techniques",
    description: "テクニックの一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前で検索" },
        category: { type: "string", description: "カテゴリで絞り込み" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_technique",
    description: "指定したIDのテクニック情報を取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "テクニックID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "create_technique",
    description: "新しいテクニックを作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "テクニック名（英語）" },
        name_ja: { type: "string", description: "テクニック名（日本語）" },
        name_pt: { type: "string", description: "テクニック名（ポルトガル語）" },
        category: { type: "string", description: "カテゴリ" },
        description: { type: "string", description: "説明（英語）" },
        description_ja: { type: "string", description: "説明（日本語）" },
        video_url: { type: "string", description: "動画URL" },
        is_sample: { type: "boolean", description: "サンプルかどうか" },
      },
      required: ["name", "name_ja", "name_pt", "category"],
    },
  },
  {
    name: "update_technique",
    description: "テクニック情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "テクニックID（UUID）" },
        name: { type: "string", description: "テクニック名（英語）" },
        name_ja: { type: "string", description: "テクニック名（日本語）" },
        category: { type: "string", description: "カテゴリ" },
        description_ja: { type: "string", description: "説明（日本語）" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_technique",
    description: "テクニックを削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "テクニックID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Dojo Tools ==========
  {
    name: "list_dojos",
    description: "道場の一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前で検索" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_dojo",
    description: "指定したIDの道場情報を取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "道場ID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "create_dojo",
    description: "新しい道場を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "道場名（英語）" },
        name_ja: { type: "string", description: "道場名（日本語）" },
        name_pt: { type: "string", description: "道場名（ポルトガル語）" },
        location: { type: "string", description: "所在地" },
        description: { type: "string", description: "説明（英語）" },
        description_ja: { type: "string", description: "説明（日本語）" },
        website: { type: "string", description: "ウェブサイト" },
        email: { type: "string", description: "メールアドレス" },
        phone: { type: "string", description: "電話番号" },
      },
      required: ["name", "name_ja", "name_pt"],
    },
  },
  {
    name: "update_dojo",
    description: "道場情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "道場ID（UUID）" },
        name: { type: "string", description: "道場名（英語）" },
        name_ja: { type: "string", description: "道場名（日本語）" },
        location: { type: "string", description: "所在地" },
        description_ja: { type: "string", description: "説明（日本語）" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_dojo",
    description: "道場を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "道場ID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Event Tools ==========
  {
    name: "list_events",
    description: "イベントの一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "タイトルで検索" },
        upcoming: { type: "boolean", description: "今後のイベントのみ取得" },
        event_type: { type: "string", description: "イベントタイプで絞り込み" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_event",
    description: "指定したIDのイベント情報を取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "イベントID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "create_event",
    description: "新しいイベントを作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "タイトル" },
        description: { type: "string", description: "説明" },
        event_date: { type: "string", description: "開催日時（ISO 8601形式）" },
        event_type: { type: "string", description: "イベントタイプ" },
        location: { type: "string", description: "開催場所" },
        max_participants: { type: "number", description: "最大参加人数" },
        price: { type: "number", description: "参加費" },
        is_public: { type: "boolean", description: "公開するか" },
      },
      required: ["title", "event_date", "event_type"],
    },
  },
  {
    name: "update_event",
    description: "イベント情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "イベントID（UUID）" },
        title: { type: "string", description: "タイトル" },
        description: { type: "string", description: "説明" },
        event_date: { type: "string", description: "開催日時" },
        location: { type: "string", description: "開催場所" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "イベントを削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "イベントID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Music Track Tools ==========
  {
    name: "list_music_tracks",
    description: "音楽トラックの一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "タイトルで検索" },
        is_active: { type: "boolean", description: "有効なトラックのみ" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_music_track",
    description: "指定したIDの音楽トラック情報を取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "トラックID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "create_music_track",
    description: "新しい音楽トラックを作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "タイトル" },
        artist: { type: "string", description: "アーティスト" },
        audio_url: { type: "string", description: "音声URL" },
        thumbnail_url: { type: "string", description: "サムネイルURL" },
        duration_seconds: { type: "number", description: "再生時間（秒）" },
        is_active: { type: "boolean", description: "有効かどうか" },
      },
      required: ["title", "audio_url"],
    },
  },
  {
    name: "update_music_track",
    description: "音楽トラック情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "トラックID（UUID）" },
        title: { type: "string", description: "タイトル" },
        artist: { type: "string", description: "アーティスト" },
        is_active: { type: "boolean", description: "有効かどうか" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_music_track",
    description: "音楽トラックを削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "トラックID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Organization Tools ==========
  {
    name: "list_organizations",
    description: "団体の一覧を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名前で検索" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_organization",
    description: "指定したIDの団体情報を取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "団体ID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "create_organization",
    description: "新しい団体を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "団体名（英語）" },
        name_ja: { type: "string", description: "団体名（日本語）" },
        name_pt: { type: "string", description: "団体名（ポルトガル語）" },
        description: { type: "string", description: "説明" },
        website: { type: "string", description: "ウェブサイト" },
        logo_url: { type: "string", description: "ロゴURL" },
      },
      required: ["name", "name_ja", "name_pt"],
    },
  },
  {
    name: "update_organization",
    description: "団体情報を更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "団体ID（UUID）" },
        name: { type: "string", description: "団体名（英語）" },
        name_ja: { type: "string", description: "団体名（日本語）" },
        description: { type: "string", description: "説明" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_organization",
    description: "団体を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "団体ID（UUID）" } },
      required: ["id"],
    },
  },

  // ========== Contact Message Tools ==========
  {
    name: "list_contact_messages",
    description: "お問い合わせメッセージの一覧を取得します。（read権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "ステータスで絞り込み（unread/read/replied）" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "get_contact_message",
    description: "指定したIDのお問い合わせを取得します。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "メッセージID（UUID）" } },
      required: ["id"],
    },
  },
  {
    name: "update_contact_message_status",
    description: "お問い合わせのステータスを更新します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "メッセージID（UUID）" },
        status: { type: "string", description: "新しいステータス（unread/read/replied）" },
      },
      required: ["id", "status"],
    },
  },

  // ========== Celebrity Lineage Tools ==========
  {
    name: "list_celebrity_lineage",
    description: "選手の系統関係を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        celebrity_id: { type: "string", description: "選手IDで絞り込み" },
        limit: { type: "number", description: "取得件数" },
        offset: { type: "number", description: "オフセット" },
      },
    },
  },
  {
    name: "create_celebrity_lineage",
    description: "選手間の師弟関係を作成します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: {
        instructor_id: { type: "string", description: "師匠の選手ID" },
        student_id: { type: "string", description: "弟子の選手ID" },
        belt_level: { type: "string", description: "授与した帯" },
        started_at: { type: "string", description: "開始日" },
        notes: { type: "string", description: "備考" },
      },
      required: ["instructor_id", "student_id"],
    },
  },
  {
    name: "delete_celebrity_lineage",
    description: "選手間の師弟関係を削除します。（write権限必要）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "系統ID（UUID）" } },
      required: ["id"],
    },
  },
];

async function executeTool(toolName: string, args: Record<string, unknown>, permissions: string[]): Promise<unknown> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const hasWritePermission = permissions.includes('write') || permissions.includes('admin');

  // ========== Celebrity Tools ==========
  if (toolName === 'list_celebrities') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('celebrities').select('*', { count: 'exact' }).order('display_name').range(offset, offset + limit - 1);
    if (args.search) query = query.or(`display_name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_celebrity') {
    const { data, error } = await supabase.from('celebrities').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('celebrities').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('celebrities').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_celebrity') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('celebrities').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Tournament Tools ==========
  if (toolName === 'list_tournaments') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('tournaments').select('*', { count: 'exact' }).order('date_start', { ascending: false }).range(offset, offset + limit - 1);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    if (args.upcoming) query = query.gte('date_start', new Date().toISOString().split('T')[0]);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_tournament') {
    const { data, error } = await supabase.from('tournaments').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('tournaments').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('tournaments').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_tournament') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('tournaments').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Venue Tools ==========
  if (toolName === 'list_venues') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('venues').select('*', { count: 'exact' }).order('name').range(offset, offset + limit - 1);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%,city.ilike.%${args.search}%`);
    if (args.country) query = query.eq('country', args.country);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_venue') {
    const { data, error } = await supabase.from('venues').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('venues').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('venues').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_venue') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('venues').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Technique Tools ==========
  if (toolName === 'list_techniques') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('techniques').select('*', { count: 'exact' }).order('display_order').range(offset, offset + limit - 1);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    if (args.category) query = query.eq('category', args.category);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_technique') {
    const { data, error } = await supabase.from('techniques').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_technique') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('techniques').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_technique') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('techniques').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_technique') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('techniques').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Dojo Tools ==========
  if (toolName === 'list_dojos') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('dojos').select('*', { count: 'exact' }).order('name').range(offset, offset + limit - 1);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_dojo') {
    const { data, error } = await supabase.from('dojos').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_dojo') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('dojos').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_dojo') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('dojos').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_dojo') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('dojos').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Event Tools ==========
  if (toolName === 'list_events') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('events').select('*', { count: 'exact' }).order('event_date', { ascending: false }).range(offset, offset + limit - 1);
    if (args.search) query = query.ilike('title', `%${args.search}%`);
    if (args.upcoming) query = query.gte('event_date', new Date().toISOString());
    if (args.event_type) query = query.eq('event_type', args.event_type);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_event') {
    const { data, error } = await supabase.from('events').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_event') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('events').insert({ ...args, organizer_id: '00000000-0000-0000-0000-000000000000' }).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_event') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('events').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_event') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('events').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Music Track Tools ==========
  if (toolName === 'list_music_tracks') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('music_tracks').select('*', { count: 'exact' }).order('sort_order').range(offset, offset + limit - 1);
    if (args.search) query = query.ilike('title', `%${args.search}%`);
    if (args.is_active !== undefined) query = query.eq('is_active', args.is_active);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_music_track') {
    const { data, error } = await supabase.from('music_tracks').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_music_track') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('music_tracks').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_music_track') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('music_tracks').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_music_track') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('music_tracks').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Organization Tools ==========
  if (toolName === 'list_organizations') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('organizations').select('*', { count: 'exact' }).order('name').range(offset, offset + limit - 1);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,name_ja.ilike.%${args.search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_organization') {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'create_organization') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('organizations').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_organization') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { id, ...updateData } = args;
    const { data, error } = await supabase.from('organizations').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_organization') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('organizations').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  // ========== Contact Message Tools ==========
  if (toolName === 'list_contact_messages') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('contact_messages').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (args.status) query = query.eq('status', args.status);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'get_contact_message') {
    const { data, error } = await supabase.from('contact_messages').select('*').eq('id', args.id).single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'update_contact_message_status') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('contact_messages').update({ status: args.status }).eq('id', args.id).select().single();
    if (error) throw error;
    return data;
  }

  // ========== Celebrity Lineage Tools ==========
  if (toolName === 'list_celebrity_lineage') {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    let query = supabase.from('celebrity_lineage').select('*, instructor:celebrities!instructor_id(*), student:celebrities!student_id(*)', { count: 'exact' }).range(offset, offset + limit - 1);
    if (args.celebrity_id) query = query.or(`instructor_id.eq.${args.celebrity_id},student_id.eq.${args.celebrity_id}`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, limit, offset };
  }
  if (toolName === 'create_celebrity_lineage') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { data, error } = await supabase.from('celebrity_lineage').insert(args).select().single();
    if (error) throw error;
    return data;
  }
  if (toolName === 'delete_celebrity_lineage') {
    if (!hasWritePermission) throw new Error('Write permission required');
    const { error } = await supabase.from('celebrity_lineage').delete().eq('id', args.id);
    if (error) throw error;
    return { success: true };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

// Create JSON-RPC response
function createJsonRpcResponse(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function createJsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

serve(async (req) => {
  console.log(`[MCP Server] ${req.method} request received`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('[MCP Server] No API key provided');
      return new Response(
        JSON.stringify(createJsonRpcError(null, -32000, 'API key required. Set x-api-key header.')),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { valid, permissions } = await validateApiKey(apiKey);
    
    if (!valid) {
      console.log('[MCP Server] Invalid API key');
      return new Response(
        JSON.stringify(createJsonRpcError(null, -32000, 'Invalid or expired API key')),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[MCP Server] API key validated, permissions:', permissions);

    // Handle GET requests for basic info
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        name: "jiuflow-mcp-server",
        version: "2.0.0",
        description: "JiuFlow MCP Server - 選手・大会・会場・テクニック・道場・イベント・音楽・団体を管理",
        protocolVersion: MCP_PROTOCOL_VERSION,
        toolCount: tools.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle POST requests - MCP JSON-RPC protocol
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('[MCP Server] Received JSON-RPC request:', JSON.stringify(body));
      
      const { method, params, id, jsonrpc } = body;
      
      if (jsonrpc !== "2.0") {
        return new Response(
          JSON.stringify(createJsonRpcError(id, -32600, 'Invalid Request: must be JSON-RPC 2.0')),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle initialize method
      if (method === 'initialize') {
        console.log('[MCP Server] Handling initialize request');
        const response = createJsonRpcResponse(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "jiuflow-mcp-server", version: "2.0.0" },
        });
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle initialized notification
      if (method === 'notifications/initialized' || method === 'initialized') {
        return new Response(JSON.stringify(createJsonRpcResponse(id, {})), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle tools/list method
      if (method === 'tools/list') {
        console.log('[MCP Server] Handling tools/list request');
        const response = createJsonRpcResponse(id, { tools });
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle tools/call method
      if (method === 'tools/call') {
        console.log('[MCP Server] Handling tools/call request');
        const { name, arguments: args } = params || {};
        
        if (!name) {
          return new Response(
            JSON.stringify(createJsonRpcError(id, -32602, 'Invalid params: tool name required')),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const result = await executeTool(name, args || {}, permissions);
          const response = createJsonRpcResponse(id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          });
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (toolError: unknown) {
          const message = toolError instanceof Error ? toolError.message : 'Unknown error';
          console.error('[MCP Server] Tool execution error:', message);
          return new Response(
            JSON.stringify(createJsonRpcResponse(id, {
              content: [{ type: "text", text: `Error: ${message}` }],
              isError: true,
            })),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Handle ping method
      if (method === 'ping') {
        return new Response(JSON.stringify(createJsonRpcResponse(id, {})), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Method not found
      console.log('[MCP Server] Unknown method:', method);
      return new Response(
        JSON.stringify(createJsonRpcError(id, -32601, `Method not found: ${method}`)),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(createJsonRpcError(null, -32600, 'Invalid Request: method must be POST')),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[MCP Server] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify(createJsonRpcError(null, -32603, `Internal error: ${message}`)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
