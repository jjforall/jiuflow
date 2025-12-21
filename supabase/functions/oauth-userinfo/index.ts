import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'invalid_request',
      error_description: 'Method not allowed',
    }), { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get access token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Missing or invalid Authorization header',
      }), { status: 401, headers: corsHeaders });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    console.log('OAuth userinfo request with token:', accessToken.substring(0, 10) + '...');

    // Find and validate access token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('oauth_access_tokens')
      .select('user_id, scope, expires_at, revoked_at')
      .eq('token', accessToken)
      .single();

    if (tokenError || !tokenData) {
      console.error('Invalid token:', tokenError);
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Unknown access token',
      }), { status: 401, headers: corsHeaders });
    }

    // Check if token is revoked or expired
    if (tokenData.revoked_at) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Token has been revoked',
      }), { status: 401, headers: corsHeaders });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Token has expired',
      }), { status: 401, headers: corsHeaders });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, avatar_url, username, bio, belt_history, home_dojo')
      .eq('id', tokenData.user_id)
      .single();

    // Get user email from auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tokenData.user_id);

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(JSON.stringify({
        error: 'server_error',
        error_description: 'User profile not found',
      }), { status: 500, headers: corsHeaders });
    }

    // Build response based on scope
    const scopes = tokenData.scope?.split(' ') || ['profile'];
    const response: Record<string, unknown> = {
      sub: profile.id, // Subject - unique identifier
    };

    // Profile scope
    if (scopes.includes('profile')) {
      response.name = profile.display_name;
      response.preferred_username = profile.username;
      response.picture = profile.avatar_url;
      response.profile = `https://jiuflow.art/user/${profile.username || profile.id}`;
      
      // Additional JiuFlow-specific fields
      response.bio = profile.bio;
      response.belt_history = profile.belt_history;
      response.home_dojo = profile.home_dojo;
    }

    // Email scope
    if (scopes.includes('email') && authUser?.user?.email) {
      response.email = authUser.user.email;
      response.email_verified = authUser.user.email_confirmed_at ? true : false;
    }

    console.log('Returning userinfo for user:', profile.id);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: unknown) {
    console.error('OAuth userinfo error:', error);
    return new Response(JSON.stringify({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: corsHeaders });
  }
});
