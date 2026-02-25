import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, Edit, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

interface OAuthClient {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  redirect_uris: string[];
  logo_url: string | null;
  homepage_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function OAuthClientsManagement() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClient | null>(null);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [regeneratedSecret, setRegeneratedSecret] = useState<{ clientId: string; secret: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    redirect_uris: '',
    logo_url: '',
    homepage_url: '',
  });

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_clients')
        .select('id, client_id, name, description, redirect_uris, logo_url, homepage_url, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data || []) as OAuthClient[]);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('OAuthクライアントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.redirect_uris.trim()) {
      toast.error('名前とリダイレクトURIは必須です');
      return;
    }

    try {
      const redirectUris = formData.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean);
      
      // Generate a random secret client-side, then hash it before storing
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const plainSecret = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Hash with SHA-256
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(plainSecret));
      const secretHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('oauth_clients')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          redirect_uris: redirectUris,
          logo_url: formData.logo_url.trim() || null,
          homepage_url: formData.homepage_url.trim() || null,
          client_secret_hash: secretHash,
        });

      if (error) throw error;

      // Show the plaintext secret ONCE
      setNewlyCreatedSecret(plainSecret);
      toast.success('OAuthクライアントを作成しました。シークレットを今すぐコピーしてください。');
      setIsCreateOpen(false);
      resetForm();
      fetchClients();
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error('作成に失敗しました');
    }
  };

  const handleRegenerateSecret = async (client: OAuthClient) => {
    if (!confirm(`「${client.name}」のシークレットを再生成しますか？既存のシークレットは無効になります。`)) return;

    try {
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const plainSecret = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(plainSecret));
      const secretHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('oauth_clients')
        .update({ client_secret_hash: secretHash })
        .eq('id', client.id);

      if (error) throw error;

      setRegeneratedSecret({ clientId: client.id, secret: plainSecret });
      toast.success('シークレットを再生成しました。今すぐコピーしてください。');
    } catch (err) {
      console.error('Error regenerating secret:', err);
      toast.error('シークレットの再生成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;

    try {
      const redirectUris = formData.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('oauth_clients')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          redirect_uris: redirectUris,
          logo_url: formData.logo_url.trim() || null,
          homepage_url: formData.homepage_url.trim() || null,
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      toast.success('OAuthクライアントを更新しました');
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error('更新に失敗しました');
    }
  };

  const handleToggleActive = async (client: OAuthClient) => {
    try {
      const { error } = await supabase
        .from('oauth_clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;

      toast.success(client.is_active ? '無効化しました' : '有効化しました');
      fetchClients();
    } catch (err) {
      console.error('Error toggling client:', err);
      toast.error('更新に失敗しました');
    }
  };

  const handleDelete = async (client: OAuthClient) => {
    if (!confirm(`「${client.name}」を削除しますか？この操作は取り消せません。`)) return;

    try {
      const { error } = await supabase
        .from('oauth_clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      toast.success('削除しました');
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('削除に失敗しました');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}をコピーしました`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      redirect_uris: '',
      logo_url: '',
      homepage_url: '',
    });
  };

  const openEditDialog = (client: OAuthClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      description: client.description || '',
      redirect_uris: client.redirect_uris.join('\n'),
      logo_url: client.logo_url || '',
      homepage_url: client.homepage_url || '',
    });
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">OAuthクライアント管理</h2>
          <p className="text-muted-foreground">JiuFlowでログインを使用するアプリケーションを管理</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新規OAuthクライアント</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>アプリケーション名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My App"
                />
              </div>
              <div>
                <Label>説明</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="アプリケーションの説明"
                />
              </div>
              <div>
                <Label>リダイレクトURI * (1行に1つ)</Label>
                <Textarea
                  value={formData.redirect_uris}
                  onChange={(e) => setFormData({ ...formData, redirect_uris: e.target.value })}
                  placeholder="https://myapp.com/callback"
                  rows={3}
                />
              </div>
              <div>
                <Label>ロゴURL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://myapp.com/logo.png"
                />
              </div>
              <div>
                <Label>ホームページURL</Label>
                <Input
                  value={formData.homepage_url}
                  onChange={(e) => setFormData({ ...formData, homepage_url: e.target.value })}
                  placeholder="https://myapp.com"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">作成</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Newly Created Secret Banner */}
      {newlyCreatedSecret && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  クライアントシークレットが生成されました
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  このシークレットは一度しか表示されません。今すぐコピーして安全な場所に保存してください。
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white dark:bg-black/30 px-3 py-2 rounded border break-all flex-1">
                    {newlyCreatedSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(newlyCreatedSecret, 'Client Secret')}>
                    <Copy className="h-3 w-3 mr-1" />
                    コピー
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="text-yellow-700" onClick={() => setNewlyCreatedSecret(null)}>
                  確認しました（閉じる）
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoint Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OAuthエンドポイント</CardTitle>
          <CardDescription>外部アプリケーションで使用するエンドポイント</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">Authorization URL</p>
              <code className="text-xs text-muted-foreground">{supabaseUrl}/functions/v1/oauth-authorize</code>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${supabaseUrl}/functions/v1/oauth-authorize`, 'Authorization URL')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">Token URL</p>
              <code className="text-xs text-muted-foreground">{supabaseUrl}/functions/v1/oauth-token</code>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${supabaseUrl}/functions/v1/oauth-token`, 'Token URL')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">UserInfo URL</p>
              <code className="text-xs text-muted-foreground">{supabaseUrl}/functions/v1/oauth-userinfo</code>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${supabaseUrl}/functions/v1/oauth-userinfo`, 'UserInfo URL')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>アプリケーション</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Client Secret</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    OAuthクライアントがありません
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {client.logo_url && (
                          <img src={client.logo_url} alt="" className="h-8 w-8 rounded" />
                        )}
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.homepage_url && (
                            <a href={client.homepage_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                              {new URL(client.homepage_url).hostname}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{client.client_id}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(client.client_id, 'Client ID')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {regeneratedSecret?.clientId === client.id ? (
                        <div className="space-y-1">
                          <code className="text-xs bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded break-all block max-w-[200px]">
                            {regeneratedSecret.secret}
                          </code>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(regeneratedSecret.secret, 'Client Secret')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setRegeneratedSecret(null)}>
                              閉じる
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">••••••••••••</code>
                          <Button size="icon" variant="ghost" className="h-6 w-6" title="シークレットを再生成" onClick={() => handleRegenerateSecret(client)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={client.is_active}
                          onCheckedChange={() => handleToggleActive(client)}
                        />
                        <Badge variant={client.is_active ? 'default' : 'secondary'}>
                          {client.is_active ? '有効' : '無効'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(client)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OAuthクライアントを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>アプリケーション名 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>リダイレクトURI * (1行に1つ)</Label>
              <Textarea
                value={formData.redirect_uris}
                onChange={(e) => setFormData({ ...formData, redirect_uris: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>ロゴURL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>
            <div>
              <Label>ホームページURL</Label>
              <Input
                value={formData.homepage_url}
                onChange={(e) => setFormData({ ...formData, homepage_url: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">更新</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
