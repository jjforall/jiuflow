import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';

interface OAuthClient {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function OAuthAuthorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [client, setClient] = useState<OAuthClient | null>(null);
  const [scope, setScope] = useState('profile');
  const [error, setError] = useState<string | null>(null);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const scopeParam = searchParams.get('scope');

  useEffect(() => {
    if (scopeParam) setScope(scopeParam);
  }, [scopeParam]);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!clientId || !redirectUri || responseType !== 'code') {
        setError('Invalid OAuth request. Missing required parameters.');
        setLoading(false);
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.session?.access_token) {
          headers['Authorization'] = `Bearer ${session.session.access_token}`;
        }

        const response = await supabase.functions.invoke('oauth-authorize', {
          method: 'GET',
          headers,
          body: null,
        });

        // Build URL with query params for the function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope: scope,
          ...(state && { state }),
          ...(codeChallenge && { code_challenge: codeChallenge }),
          ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        });

        const res = await fetch(`${supabaseUrl}/functions/v1/oauth-authorize?${params}`, {
          method: 'GET',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        if (data.error) {
          setError(data.error_description || data.error);
          setLoading(false);
          return;
        }

        setClient(data.client);
        if (data.scope) setScope(data.scope);
        setLoading(false);

      } catch (err) {
        console.error('Error fetching OAuth info:', err);
        setError('Failed to load authorization request');
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchClientInfo();
    }
  }, [clientId, redirectUri, responseType, state, scope, codeChallenge, codeChallengeMethod, authLoading]);

  const handleAuthorize = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = window.location.href;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setAuthorizing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        client_id: clientId!,
        redirect_uri: redirectUri!,
        response_type: responseType!,
        scope: scope,
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
      });

      const res = await fetch(`${supabaseUrl}/functions/v1/oauth-authorize?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err) {
      console.error('Authorization error:', err);
      toast.error('認可に失敗しました');
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User denied the authorization request');
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
    } else {
      navigate('/');
    }
  };

  const getScopeDescription = (scopeStr: string) => {
    const scopes = scopeStr.split(' ');
    const descriptions: string[] = [];
    
    if (scopes.includes('profile')) {
      descriptions.push('プロフィール情報（名前、アバター、ユーザー名）');
    }
    if (scopes.includes('email')) {
      descriptions.push('メールアドレス');
    }
    
    return descriptions;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container max-w-md mx-auto py-20">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>認可エラー</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                ホームに戻る
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-md mx-auto py-20">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {client?.logo_url ? (
                <Avatar className="h-16 w-16">
                  <AvatarImage src={client.logo_url} alt={client.name} />
                  <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">
              {client?.name || 'アプリケーション'}がアクセスを要求しています
            </CardTitle>
            <CardDescription>
              JiuFlowアカウントでログインします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!user && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  続行するにはJiuFlowにログインしてください
                </p>
                <Button onClick={handleAuthorize}>
                  ログインして続行
                </Button>
              </div>
            )}

            {user && (
              <>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">このアプリがアクセスできる情報：</p>
                  <ul className="space-y-2">
                    {getScopeDescription(scope).map((desc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {desc}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    ログイン中: {user.email}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDeny}
                    disabled={authorizing}
                  >
                    拒否
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAuthorize}
                    disabled={authorizing}
                  >
                    {authorizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        認可中...
                      </>
                    ) : (
                      '許可する'
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  「許可する」をクリックすると、{client?.name}にJiuFlowアカウントへのアクセスを許可します。
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
