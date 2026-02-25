import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Helper to create SHA-256 hash for PKCE verification
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper to create SHA-256 hex hash for client secret verification
async function sha256Hex(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'invalid_request',
      error_description: 'Method not allowed',
    }), { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data or JSON
    let body: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      body = await req.json();
    }

    const grantType = body.grant_type;
    const clientId = body.client_id;
    const clientSecret = body.client_secret;

    console.log('OAuth token request:', { grantType, clientId });

    // Validate client credentials
    const { data: oauthClient, error: clientError } = await supabaseAdmin
      .from('oauth_clients')
      .select('id, client_secret_hash, is_active')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (clientError || !oauthClient) {
      return new Response(JSON.stringify({
        error: 'invalid_client',
        error_description: 'Unknown or inactive client',
      }), { status: 401, headers: corsHeaders });
    }

    // Validate client secret by comparing SHA-256 hash
    const providedSecretHash = await sha256Hex(clientSecret);
    if (oauthClient.client_secret_hash !== providedSecretHash) {
      return new Response(JSON.stringify({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      }), { status: 401, headers: corsHeaders });
    }

    if (grantType === 'authorization_code') {
      const code = body.code;
      const redirectUri = body.redirect_uri;
      const codeVerifier = body.code_verifier;

      if (!code || !redirectUri) {
        return new Response(JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing code or redirect_uri',
        }), { status: 400, headers: corsHeaders });
      }

      // Find and validate authorization code
      const { data: authCode, error: codeError } = await supabaseAdmin
        .from('oauth_authorization_codes')
        .select('*')
        .eq('code', code)
        .eq('client_id', oauthClient.id)
        .eq('redirect_uri', redirectUri)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (codeError || !authCode) {
        console.error('Invalid auth code:', codeError);
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code',
        }), { status: 400, headers: corsHeaders });
      }

      // Verify PKCE if code_challenge was provided
      if (authCode.code_challenge) {
        if (!codeVerifier) {
          return new Response(JSON.stringify({
            error: 'invalid_request',
            error_description: 'code_verifier required',
          }), { status: 400, headers: corsHeaders });
        }

        let computedChallenge: string;
        if (authCode.code_challenge_method === 'S256') {
          computedChallenge = await sha256(codeVerifier);
        } else {
          computedChallenge = codeVerifier;
        }

        if (computedChallenge !== authCode.code_challenge) {
          return new Response(JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid code_verifier',
          }), { status: 400, headers: corsHeaders });
        }
      }

      // Mark code as used
      await supabaseAdmin
        .from('oauth_authorization_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', authCode.id);

      // Create access token
      const { data: accessToken, error: tokenError } = await supabaseAdmin
        .from('oauth_access_tokens')
        .insert({
          client_id: oauthClient.id,
          user_id: authCode.user_id,
          scope: authCode.scope,
        })
        .select('id, token, scope, expires_at')
        .single();

      if (tokenError || !accessToken) {
        console.error('Failed to create access token:', tokenError);
        return new Response(JSON.stringify({
          error: 'server_error',
          error_description: 'Failed to create access token',
        }), { status: 500, headers: corsHeaders });
      }

      // Create refresh token
      const { data: refreshToken, error: refreshError } = await supabaseAdmin
        .from('oauth_refresh_tokens')
        .insert({
          access_token_id: accessToken.id,
        })
        .select('token, expires_at')
        .single();

      if (refreshError) {
        console.error('Failed to create refresh token:', refreshError);
      }

      const expiresIn = Math.floor((new Date(accessToken.expires_at).getTime() - Date.now()) / 1000);

      return new Response(JSON.stringify({
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken?.token,
        scope: accessToken.scope,
      }), { status: 200, headers: corsHeaders });

    } else if (grantType === 'refresh_token') {
      const refreshTokenValue = body.refresh_token;

      if (!refreshTokenValue) {
        return new Response(JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing refresh_token',
        }), { status: 400, headers: corsHeaders });
      }

      // Find and validate refresh token
      const { data: refreshToken, error: refreshError } = await supabaseAdmin
        .from('oauth_refresh_tokens')
        .select('*, oauth_access_tokens!inner(*)')
        .eq('token', refreshTokenValue)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (refreshError || !refreshToken) {
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid or expired refresh token',
        }), { status: 400, headers: corsHeaders });
      }

      const oldAccessToken = refreshToken.oauth_access_tokens;

      // Verify client owns this token
      if (oldAccessToken.client_id !== oauthClient.id) {
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Token does not belong to this client',
        }), { status: 400, headers: corsHeaders });
      }

      // Revoke old tokens
      await supabaseAdmin
        .from('oauth_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', oldAccessToken.id);

      await supabaseAdmin
        .from('oauth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', refreshToken.id);

      // Create new access token
      const { data: newAccessToken, error: tokenError } = await supabaseAdmin
        .from('oauth_access_tokens')
        .insert({
          client_id: oauthClient.id,
          user_id: oldAccessToken.user_id,
          scope: oldAccessToken.scope,
        })
        .select('id, token, scope, expires_at')
        .single();

      if (tokenError || !newAccessToken) {
        return new Response(JSON.stringify({
          error: 'server_error',
          error_description: 'Failed to create access token',
        }), { status: 500, headers: corsHeaders });
      }

      // Create new refresh token
      const { data: newRefreshToken } = await supabaseAdmin
        .from('oauth_refresh_tokens')
        .insert({
          access_token_id: newAccessToken.id,
        })
        .select('token')
        .single();

      const expiresIn = Math.floor((new Date(newAccessToken.expires_at).getTime() - Date.now()) / 1000);

      return new Response(JSON.stringify({
        access_token: newAccessToken.token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: newRefreshToken?.token,
        scope: newAccessToken.scope,
      }), { status: 200, headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code and refresh_token are supported',
      }), { status: 400, headers: corsHeaders });
    }

  } catch (error: unknown) {
    console.error('OAuth token error:', error);
    return new Response(JSON.stringify({
      error: 'server_error',
      error_description: 'An internal error occurred',
    }), { status: 500, headers: corsHeaders });
  }
});
