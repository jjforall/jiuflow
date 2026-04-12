import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSafeIlikeFilter } from "../_shared/search-utils.ts";
import { validateApiKeyWithRateLimit, rateLimitResponse } from "../_shared/api-key-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    const { valid, permissions, rateLimited, rateLimitResetMs } = await validateApiKeyWithRateLimit(apiKey);
    
    if (rateLimited) {
      return rateLimitResponse(rateLimitResetMs!);
    }
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    // GET - List or get single tournament
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*, venue:venues(*)')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const search = url.searchParams.get('search');
        const upcoming = url.searchParams.get('upcoming') === 'true';
        
        let query = supabase
          .from('tournaments')
          .select('*, venue:venues(id, name, name_ja)', { count: 'exact' })
          .order('start_date', { ascending: true })
          .range(offset, offset + limit - 1);
        
        const searchFilter = buildSafeIlikeFilter(['name', 'name_ja'], search);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
        
        if (upcoming) {
          query = query.gte('start_date', new Date().toISOString().split('T')[0]);
        }
        
        const { data, error, count } = await query;
        if (error) throw error;
        
        return new Response(JSON.stringify({ data, total: count, limit, offset }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Check write permission
    if (!permissions.includes('write') && !permissions.includes('admin')) {
      return new Response(
        JSON.stringify({ error: 'Write permission required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST - Create tournament
    if (req.method === 'POST') {
      const body = await req.json();
      const { data, error } = await supabase
        .from('tournaments')
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // PUT - Update tournament
    if (req.method === 'PUT') {
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'ID required for update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const body = await req.json();
      const { data, error } = await supabase
        .from('tournaments')
        .update(body)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // DELETE - Delete tournament
    if (req.method === 'DELETE') {
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'ID required for delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
