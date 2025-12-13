import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, 
  Settings, 
  History, 
  RefreshCw, 
  Save, 
  ExternalLink,
  Bot,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Copy
} from 'lucide-react';

interface LineSettings {
  enabled: boolean;
  ai_provider: 'lovable' | 'groq';
  system_prompt: string;
  groq_model: string;
}

interface ChatLog {
  id: string;
  line_user_id: string;
  user_message: string;
  ai_response: string;
  ai_provider: string;
  created_at: string;
}

const GROQ_MODELS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
  { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
];

const DEFAULT_SYSTEM_PROMPT = `あなたはJiuFlowのアシスタントです。柔術に関する質問に日本語で答えてください。

以下の機能を持っています：
- 選手（有名人）の情報検索
- 大会情報の検索・管理
- テクニック情報の検索
- 会場情報の検索
- 道場情報の検索

ユーザーの質問に対して、親切で正確な情報を提供してください。`;

export default function LineIntegrationManagement() {
  const [settings, setSettings] = useState<LineSettings>({
    enabled: true,
    ai_provider: 'lovable',
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    groq_model: 'llama-3.3-70b-versatile'
  });
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`;

  useEffect(() => {
    loadSettings();
    loadChatLogs();
    checkHealth();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadChatLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook/logs`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatLogs(data);
      }
    } catch (error) {
      console.error('Error loading chat logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = response.ok ? await response.json() : null;
      setHealthStatus(data?.status === 'ok' ? 'ok' : 'error');
    } catch {
      setHealthStatus('error');
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      toast.success('設定を保存しました');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URLをコピーしました');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            LINE連携
          </h2>
          <p className="text-muted-foreground">LINEからMCPサーバー機能を利用できます</p>
        </div>
        <div className="flex items-center gap-2">
          {healthStatus === 'checking' && (
            <Badge variant="secondary">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              確認中
            </Badge>
          )}
          {healthStatus === 'ok' && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              稼働中
            </Badge>
          )}
          {healthStatus === 'error' && (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              エラー
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={checkHealth}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            設定
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            チャット履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* Webhook URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Webhook URL</CardTitle>
              <CardDescription>
                LINE Developersコンソールで以下のURLをWebhook URLとして設定してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LINE Console
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>LINE連携を有効化</Label>
                  <p className="text-sm text-muted-foreground">オフにするとLINEからのメッセージに応答しません</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              {/* AI Provider */}
              <div className="space-y-2">
                <Label>AIプロバイダー</Label>
                <Select
                  value={settings.ai_provider}
                  onValueChange={(value: 'lovable' | 'groq') => setSettings({ ...settings, ai_provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lovable">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        Lovable AI (Gemini 2.5 Flash)
                      </div>
                    </SelectItem>
                    <SelectItem value="groq">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-orange-500" />
                        Groq
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {settings.ai_provider === 'lovable' 
                    ? 'Lovable AIは追加のAPIキーなしで利用可能です' 
                    : 'Groqは高速なLLM推論を提供します'}
                </p>
              </div>

              {/* Groq Model */}
              {settings.ai_provider === 'groq' && (
                <div className="space-y-2">
                  <Label>Groqモデル</Label>
                  <Select
                    value={settings.groq_model}
                    onValueChange={(value) => setSettings({ ...settings, groq_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROQ_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* System Prompt */}
              <div className="space-y-2">
                <Label>システムプロンプト</Label>
                <Textarea
                  value={settings.system_prompt}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  rows={8}
                  placeholder="AIアシスタントの振る舞いを定義するプロンプトを入力..."
                />
                <p className="text-sm text-muted-foreground">
                  AIがどのように応答するかを定義します
                </p>
              </div>

              {/* Save Button */}
              <Button onClick={saveSettings} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                設定を保存
              </Button>
            </CardContent>
          </Card>

          {/* Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">セットアップ手順</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>LINE DevelopersコンソールでMessaging APIチャネルを作成</li>
                <li>チャネルアクセストークン（長期）を発行</li>
                <li>Webhook URLに上記のURLを設定</li>
                <li>Webhookの利用をオンに設定</li>
                <li>応答メッセージをオフに設定（AIが応答するため）</li>
                <li>LINE公式アカウントを友だち追加してテスト</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">チャット履歴</CardTitle>
                <CardDescription>LINEからのメッセージとAIの応答履歴</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadChatLogs} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </CardHeader>
            <CardContent>
              {chatLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>まだチャット履歴がありません</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {chatLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {log.ai_provider === 'lovable' ? 'Lovable AI' : 'Groq'}
                          </Badge>
                        </div>
                        
                        {/* User Message */}
                        <div className="flex gap-2">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 bg-muted rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{log.user_message}</p>
                          </div>
                        </div>
                        
                        {/* AI Response */}
                        <div className="flex gap-2">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-green-500" />
                            </div>
                          </div>
                          <div className="flex-1 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{log.ai_response}</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          User ID: {log.line_user_id.substring(0, 12)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
