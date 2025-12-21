import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Parse OAuth parameters
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const responseType = url.searchParams.get('response_type');
    const scope = url.searchParams.get('scope') || 'profile';
    const state = url.searchParams.get('state');
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method');

    console.log('OAuth authorize request:', { clientId, redirectUri, responseType, scope, state });

    // Validate required parameters
    if (!clientId || !redirectUri || responseType !== 'code') {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing or invalid required parameters (client_id, redirect_uri, response_type=code)',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client to validate OAuth client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate client_id and redirect_uri
    const { data: oauthClient, error: clientError } = await supabaseAdmin
      .from('oauth_clients')
      .select('id, name, logo_url, redirect_uris, is_active')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (clientError || !oauthClient) {
      console.error('Invalid client:', clientError);
      return new Response(JSON.stringify({
        error: 'invalid_client',
        error_description: 'Unknown or inactive client',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate redirect_uri is registered (supports exact match or prefix match)
    const normalizeUri = (uri: string) => uri.replace(/\/$/, ''); // Remove trailing slash
    const normalizedRedirect = normalizeUri(redirectUri);
    const isValidRedirect = oauthClient.redirect_uris.some((registeredUri: string) => {
      const normalizedRegistered = normalizeUri(registeredUri);
      // Exact match after normalization, or the request URI starts with a registered URI
      return normalizedRedirect === normalizedRegistered || 
             normalizedRedirect.startsWith(normalizedRegistered);
    });
    
    if (!isValidRedirect) {
      console.error('Invalid redirect_uri:', redirectUri, 'Registered:', oauthClient.redirect_uris);
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Redirect URI is not registered for this client',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // Return info for the frontend to show login/authorize UI
      return new Response(JSON.stringify({
        requires_auth: true,
        client: {
          id: oauthClient.id,
          name: oauthClient.name,
          logo_url: oauthClient.logo_url,
        },
        scope,
        redirect_uri: redirectUri,
        state,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        requires_auth: true,
        client: {
          id: oauthClient.id,
          name: oauthClient.name,
          logo_url: oauthClient.logo_url,
        },
        scope,
        redirect_uri: redirectUri,
        state,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a POST request to actually create the authorization code
    if (req.method === 'POST') {
      // Create authorization code
      const { data: authCode, error: codeError } = await supabaseAdmin
        .from('oauth_authorization_codes')
        .insert({
          client_id: oauthClient.id,
          user_id: user.id,
          redirect_uri: redirectUri,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        })
        .select('code')
        .single();

      if (codeError || !authCode) {
        console.error('Failed to create auth code:', codeError);
        return new Response(JSON.stringify({
          error: 'server_error',
          error_description: 'Failed to create authorization code',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build redirect URL with code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', authCode.code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      console.log('Authorization code created, redirecting to:', callbackUrl.toString());

      return new Response(JSON.stringify({
        redirect_url: callbackUrl.toString(),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET request with valid auth - return client info for authorization UI
    return new Response(JSON.stringify({
      requires_auth: false,
      client: {
        id: oauthClient.id,
        name: oauthClient.name,
        logo_url: oauthClient.logo_url,
      },
      user: {
        id: user.id,
        email: user.email,
      },
      scope,
      redirect_uri: redirectUri,
      state,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('OAuth authorize error:', error);
    return new Response(JSON.stringify({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
