import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Code, Book, Server } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const API_BASE_URL = `https://jkiohqfamhiykurxrhsn.supabase.co/functions/v1`;

export function ApiManagement() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("none");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api-keys`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }

      return response.json() as Promise<ApiKey[]>;
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
          expires_in_days: expiresInDays === "none" ? null : parseInt(expiresInDays),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create API key");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedKey(data.api_key);
      setShowKey(true);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを作成しました");
    },
    onError: () => {
      toast.error("APIキーの作成に失敗しました");
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api-keys?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke API key");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを無効化しました");
    },
    onError: () => {
      toast.error("APIキーの無効化に失敗しました");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("クリップボードにコピーしました");
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("キー名を入力してください");
      return;
    }
    createKeyMutation.mutate();
  };

  const resetCreateForm = () => {
    setNewKeyName("");
    setNewKeyPermissions(["read"]);
    setExpiresInDays("none");
    setGeneratedKey(null);
    setShowKey(false);
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API管理</h2>
          <p className="text-muted-foreground">
            外部システムからデータを操作するためのAPIキーを管理します
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          if (!open) resetCreateForm();
          setIsCreateOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新規APIキー
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {generatedKey ? "APIキーが作成されました" : "新規APIキー作成"}
              </DialogTitle>
            </DialogHeader>
            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium mb-2">
                    ⚠️ このキーは一度だけ表示されます。安全な場所に保存してください。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>APIキー</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={generatedKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedKey)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={resetCreateForm} className="w-full">
                  完了
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>キー名</Label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="例: 本番環境用"
                  />
                </div>
                <div className="space-y-2">
                  <Label>権限</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="read"
                        checked={newKeyPermissions.includes("read")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewKeyPermissions([...newKeyPermissions, "read"]);
                          } else {
                            setNewKeyPermissions(newKeyPermissions.filter(p => p !== "read"));
                          }
                        }}
                      />
                      <label htmlFor="read" className="text-sm">読み取り (GET)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="write"
                        checked={newKeyPermissions.includes("write")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewKeyPermissions([...newKeyPermissions, "write"]);
                          } else {
                            setNewKeyPermissions(newKeyPermissions.filter(p => p !== "write"));
                          }
                        }}
                      />
                      <label htmlFor="write" className="text-sm">書き込み (POST/PUT/DELETE)</label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>有効期限</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無期限</SelectItem>
                      <SelectItem value="30">30日</SelectItem>
                      <SelectItem value="90">90日</SelectItem>
                      <SelectItem value="365">1年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateKey}
                  disabled={createKeyMutation.isPending}
                  className="w-full"
                >
                  {createKeyMutation.isPending ? "作成中..." : "作成"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">
            <Key className="w-4 h-4 mr-2" />
            APIキー
          </TabsTrigger>
          <TabsTrigger value="docs">
            <Book className="w-4 h-4 mr-2" />
            REST API
          </TabsTrigger>
          <TabsTrigger value="mcp">
            <Server className="w-4 h-4 mr-2" />
            MCP Server
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">APIキーがまだありません</p>
                <p className="text-sm text-muted-foreground">
                  「新規APIキー」ボタンから作成してください
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <Card key={key.id} className={!key.is_active ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{key.name}</CardTitle>
                        <CardDescription className="font-mono">
                          {key.key_prefix}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {!key.is_active ? (
                          <Badge variant="destructive">無効</Badge>
                        ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                          <Badge variant="destructive">期限切れ</Badge>
                        ) : (
                          <Badge variant="default">有効</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          権限: {key.permissions.join(", ")}
                        </p>
                        <p>
                          作成日: {format(new Date(key.created_at), "yyyy/MM/dd HH:mm")}
                        </p>
                        {key.last_used_at && (
                          <p>
                            最終使用: {format(new Date(key.last_used_at), "yyyy/MM/dd HH:mm")}
                          </p>
                        )}
                        {key.expires_at && (
                          <p>
                            有効期限: {format(new Date(key.expires_at), "yyyy/MM/dd")}
                          </p>
                        )}
                      </div>
                      {key.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("このAPIキーを無効化しますか？")) {
                              revokeKeyMutation.mutate(key.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          無効化
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                API エンドポイント
              </CardTitle>
              <CardDescription>
                以下のエンドポイントでデータを操作できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">ベースURL</h3>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                    {API_BASE_URL}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(API_BASE_URL)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">認証</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  すべてのリクエストに <code className="bg-muted px-1 rounded">x-api-key</code> ヘッダーが必要です。
                </p>
                <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -H "x-api-key: YOUR_API_KEY" \\
  ${API_BASE_URL}/api-celebrities`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">エンドポイント一覧</h3>
                
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET/POST/PUT/DELETE</Badge>
                    <code className="font-mono text-sm">/api-celebrities</code>
                  </div>
                  <p className="text-sm text-muted-foreground">選手（有名人）の管理</p>
                  <div className="text-sm space-y-1">
                    <p><strong>GET</strong>: 一覧取得 (?limit=50&offset=0&search=検索語)</p>
                    <p><strong>GET</strong>: 単体取得 (?id=UUID)</p>
                    <p><strong>POST</strong>: 新規作成 (要write権限)</p>
                    <p><strong>PUT</strong>: 更新 (?id=UUID, 要write権限)</p>
                    <p><strong>DELETE</strong>: 削除 (?id=UUID, 要write権限)</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET/POST/PUT/DELETE</Badge>
                    <code className="font-mono text-sm">/api-tournaments</code>
                  </div>
                  <p className="text-sm text-muted-foreground">大会の管理</p>
                  <div className="text-sm space-y-1">
                    <p><strong>GET</strong>: 一覧取得 (?limit=50&offset=0&search=検索語&upcoming=true)</p>
                    <p><strong>GET</strong>: 単体取得 (?id=UUID)</p>
                    <p><strong>POST</strong>: 新規作成 (要write権限)</p>
                    <p><strong>PUT</strong>: 更新 (?id=UUID, 要write権限)</p>
                    <p><strong>DELETE</strong>: 削除 (?id=UUID, 要write権限)</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>GET/POST/PUT/DELETE</Badge>
                    <code className="font-mono text-sm">/api-venues</code>
                  </div>
                  <p className="text-sm text-muted-foreground">会場の管理</p>
                  <div className="text-sm space-y-1">
                    <p><strong>GET</strong>: 一覧取得 (?limit=50&offset=0&search=検索語&country=JP)</p>
                    <p><strong>GET</strong>: 単体取得 (?id=UUID)</p>
                    <p><strong>POST</strong>: 新規作成 (要write権限)</p>
                    <p><strong>PUT</strong>: 更新 (?id=UUID, 要write権限)</p>
                    <p><strong>DELETE</strong>: 削除 (?id=UUID, 要write権限)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">使用例</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">選手一覧を取得:</p>
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -H "x-api-key: YOUR_API_KEY" \\
  "${API_BASE_URL}/api-celebrities?limit=10"`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">新規選手を追加:</p>
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"display_name": "山田太郎", "bio": "説明文"}' \\
  "${API_BASE_URL}/api-celebrities"`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">大会情報を更新:</p>
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -X PUT \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "更新後の大会名"}' \\
  "${API_BASE_URL}/api-tournaments?id=UUID"`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">レスポンス形式</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  すべてのレスポンスはJSON形式で返されます。
                </p>
                <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`// 一覧取得時
{
  "data": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}

// 単体取得・作成・更新時
{
  "id": "uuid",
  "display_name": "...",
  ...
}

// エラー時
{
  "error": "エラーメッセージ"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                MCP Server (Model Context Protocol)
              </CardTitle>
              <CardDescription>
                AIエージェント（Claude、Cursor等）からJiuFlowのデータを操作できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium mb-2">MCPサーバーとは？</p>
                <p className="text-sm text-muted-foreground">
                  MCP (Model Context Protocol) は、AIアシスタントが外部ツールやデータにアクセスするための標準プロトコルです。
                  このMCPサーバーを使うと、Claude DesktopやCursor等のAIツールから直接JiuFlowのデータを読み書きできます。
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">MCPサーバーURL</h3>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {API_BASE_URL}/mcp-server
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(`${API_BASE_URL}/mcp-server`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Claude Desktop での設定</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <code className="bg-muted px-1 rounded">claude_desktop_config.json</code> に以下を追加：
                </p>
                <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "jiuflow": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote-client"],
      "env": {
        "MCP_REMOTE_URL": "${API_BASE_URL}/mcp-server",
        "MCP_HEADERS": "x-api-key:YOUR_API_KEY"
      }
    }
  }
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Cursor での設定</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <code className="bg-muted px-1 rounded">.cursor/mcp.json</code> に以下を追加：
                </p>
                <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "jiuflow": {
      "url": "${API_BASE_URL}/mcp-server",
      "headers": {
        "x-api-key": "YOUR_API_KEY"
      }
    }
  }
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">利用可能なツール</h3>
                <div className="space-y-3">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2">選手管理</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><code className="bg-muted px-1 rounded">list_celebrities</code> - 選手一覧を取得</p>
                      <p><code className="bg-muted px-1 rounded">get_celebrity</code> - 選手詳細を取得</p>
                      <p><code className="bg-muted px-1 rounded">create_celebrity</code> - 選手を作成</p>
                      <p><code className="bg-muted px-1 rounded">update_celebrity</code> - 選手を更新</p>
                      <p><code className="bg-muted px-1 rounded">delete_celebrity</code> - 選手を削除</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2">大会管理</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><code className="bg-muted px-1 rounded">list_tournaments</code> - 大会一覧を取得</p>
                      <p><code className="bg-muted px-1 rounded">get_tournament</code> - 大会詳細を取得</p>
                      <p><code className="bg-muted px-1 rounded">create_tournament</code> - 大会を作成</p>
                      <p><code className="bg-muted px-1 rounded">update_tournament</code> - 大会を更新</p>
                      <p><code className="bg-muted px-1 rounded">delete_tournament</code> - 大会を削除</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2">会場管理</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><code className="bg-muted px-1 rounded">list_venues</code> - 会場一覧を取得</p>
                      <p><code className="bg-muted px-1 rounded">get_venue</code> - 会場詳細を取得</p>
                      <p><code className="bg-muted px-1 rounded">create_venue</code> - 会場を作成</p>
                      <p><code className="bg-muted px-1 rounded">update_venue</code> - 会場を更新</p>
                      <p><code className="bg-muted px-1 rounded">delete_venue</code> - 会場を削除</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">使用例（AIへのプロンプト）</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"JiuFlowの選手一覧を取得して"</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"今後の大会を検索して"</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"新しい選手「山田太郎」を追加して。所属道場は「東京BJJ」"</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"東京で開催される大会を作成して"</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">直接APIコール（テスト用）</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">ツール一覧を取得:</p>
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -H "x-api-key: YOUR_API_KEY" \\
  "${API_BASE_URL}/mcp-server/tools"`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">ツールを実行:</p>
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`curl -X POST \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "list_celebrities", "arguments": {"limit": 5}}' \\
  "${API_BASE_URL}/mcp-server/call"`}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
