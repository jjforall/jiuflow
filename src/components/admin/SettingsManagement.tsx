import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Sun, Globe, Shield, Database, RefreshCw, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const languages = [
  { code: "ja", label: "🇯🇵", name: "日本語" },
  { code: "en", label: "🇺🇸", name: "English" },
  { code: "pt", label: "🇧🇷", name: "Português" },
  { code: "es", label: "🇪🇸", name: "Español" },
  { code: "fr", label: "🇫🇷", name: "Français" },
  { code: "de", label: "🇩🇪", name: "Deutsch" },
  { code: "zh", label: "🇨🇳", name: "中文" },
  { code: "ko", label: "🇰🇷", name: "한국어" },
  { code: "it", label: "🇮🇹", name: "Italiano" },
  { code: "ru", label: "🇷🇺", name: "Русский" },
  { code: "ar", label: "🇸🇦", name: "العربية" },
  { code: "hi", label: "🇮🇳", name: "हिन्दी" },
];

interface ApiKeyConfig {
  name: string;
  key: string;
  description: string;
  masked: boolean;
}

export function SettingsManagement() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isClearing, setIsClearing] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([
    { name: 'OPENAI_API_KEY', key: '', description: 'OpenAI API Key', masked: true },
    { name: 'ANTHROPIC_API_KEY', key: '', description: 'Anthropic API Key', masked: true },
    { name: 'GROQ_API_KEY', key: '', description: 'Groq API Key', masked: true },
    { name: 'PERPLEXITY_API_KEY', key: '', description: 'Perplexity API Key', masked: true },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear local storage cache (except essential items)
      const essentialKeys = ['language', 'theme'];
      const keysToRemove = Object.keys(localStorage).filter(
        key => !essentialKeys.includes(key) && !key.startsWith('sb-')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast.success("キャッシュをクリアしました");
    } catch (error) {
      console.error('Cache clear error:', error);
      toast.error("キャッシュのクリアに失敗しました");
    } finally {
    setIsClearing(false);
    }
  };

  const updateApiKey = (name: string, value: string) => {
    setApiKeys(prev => prev.map(k => k.name === name ? { ...k, key: value } : k));
  };

  const toggleShowKey = (name: string) => {
    setShowKeys(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSaveApiKeys = async () => {
    setIsSavingKeys(true);
    try {
      // ここでAPIキーをサーバーに保存するロジック
      // 現在はローカルストレージに保存（デモ用）
      const keysToSave = apiKeys.filter(k => k.key).reduce((acc, k) => {
        acc[k.name] = k.key;
        return acc;
      }, {} as Record<string, string>);
      
      localStorage.setItem('mcp_api_keys', JSON.stringify(keysToSave));
      toast.success("APIキーを保存しました");
    } catch (error) {
      console.error('API key save error:', error);
      toast.error("APIキーの保存に失敗しました");
    } finally {
      setIsSavingKeys(false);
    }
  };

  useEffect(() => {
    // Load saved API keys from localStorage
    try {
      const saved = localStorage.getItem('mcp_api_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        setApiKeys(prev => prev.map(k => ({
          ...k,
          key: parsed[k.name] || ''
        })));
      }
    } catch (e) {
      console.error('Failed to load API keys:', e);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">設定</h2>
        <p className="text-muted-foreground">管理画面の各種設定を変更できます</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 外観設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              外観設定
            </CardTitle>
            <CardDescription>
              テーマやカラーモードを変更します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">ダークモード</Label>
                <p className="text-sm text-muted-foreground">
                  画面を暗い配色に切り替えます
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>現在のテーマ</Label>
                <p className="text-sm text-muted-foreground">
                  {theme === "dark" ? "黒帯モード (ダーク)" : "白帯モード (ライト)"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    ライトに切替
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    ダークに切替
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 言語設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              言語設定
            </CardTitle>
            <CardDescription>
              表示言語を変更します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="language">表示言語</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as typeof language)}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="言語を選択" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.label}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                現在の言語: {languages.find(l => l.code === language)?.name}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* システム設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              システム設定
            </CardTitle>
            <CardDescription>
              キャッシュやデータの管理
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>キャッシュをクリア</Label>
                <p className="text-sm text-muted-foreground">
                  ローカルに保存されたデータをクリアします
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isClearing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
                {isClearing ? "クリア中..." : "クリア"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>データ再読み込み</Label>
                <p className="text-sm text-muted-foreground">
                  ページを完全に再読み込みします
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                再読み込み
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* セキュリティ設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              セキュリティ
            </CardTitle>
            <CardDescription>
              セキュリティ関連の設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>セッション情報</Label>
                <p className="text-sm text-muted-foreground">
                  現在のログインセッションを確認
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    toast.success("セッション有効", {
                      description: `ログイン: ${session.user.email}`,
                    });
                  } else {
                    toast.error("セッションが見つかりません");
                  }
                }}
              >
                確認
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MCP APIキー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            外部AI APIキー設定
          </CardTitle>
          <CardDescription>
            MCP（Model Context Protocol）や外部AIサービスで使用するAPIキーを設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.name} className="space-y-2">
              <Label htmlFor={apiKey.name}>{apiKey.description}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id={apiKey.name}
                    type={showKeys[apiKey.name] ? "text" : "password"}
                    value={apiKey.key}
                    onChange={(e) => updateApiKey(apiKey.name, e.target.value)}
                    placeholder={`${apiKey.name}を入力`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => toggleShowKey(apiKey.name)}
                  >
                    {showKeys[apiKey.name] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-4">
            <Button 
              onClick={handleSaveApiKeys} 
              disabled={isSavingKeys}
              className="w-full sm:w-auto"
            >
              {isSavingKeys ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "APIキーを保存"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ※ APIキーはブラウザのローカルストレージに保存されます。セキュリティ上の理由から、本番環境ではサーバーサイドでの管理を推奨します。
          </p>
        </CardContent>
      </Card>

      {/* アプリ情報 */}
      <Card>
        <CardHeader>
          <CardTitle>アプリ情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">アプリ名</Label>
              <p className="font-medium">JiuFlow</p>
            </div>
            <div>
              <Label className="text-muted-foreground">環境</Label>
              <p className="font-medium">{import.meta.env.MODE}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">ビルド日時</Label>
              <p className="font-medium">{new Date().toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
