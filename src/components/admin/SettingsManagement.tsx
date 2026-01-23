import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Globe, Shield, Database, RefreshCw, Key, Eye, EyeOff, Plus, Trash2, Video } from "lucide-react";
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

export type TranslationProvider = "elevenlabs" | "rask";

interface McpApiKey {
  id: string;
  name: string;
  key: string;
}

export function SettingsManagement() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [isClearing, setIsClearing] = useState(false);
  const [mcpKeys, setMcpKeys] = useState<McpApiKey[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [translationProvider, setTranslationProvider] = useState<TranslationProvider>("elevenlabs");

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const essentialKeys = ['language', 'theme', 'mcp_api_keys'];
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

  const addNewKey = () => {
    if (!newKeyName.trim()) {
      toast.error("キー名を入力してください");
      return;
    }
    const sanitizedName = newKeyName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (mcpKeys.some(k => k.name === sanitizedName)) {
      toast.error("同じ名前のキーが既に存在します");
      return;
    }
    setMcpKeys(prev => [...prev, { id: crypto.randomUUID(), name: sanitizedName, key: '' }]);
    setNewKeyName('');
    toast.success(`${sanitizedName} を追加しました`);
  };

  const updateKeyValue = (id: string, value: string) => {
    setMcpKeys(prev => prev.map(k => k.id === id ? { ...k, key: value } : k));
  };

  const deleteKey = (id: string) => {
    setMcpKeys(prev => prev.filter(k => k.id !== id));
    toast.success("キーを削除しました");
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveApiKeys = async () => {
    setIsSavingKeys(true);
    try {
      const keysToSave = mcpKeys.map(k => ({ name: k.name, key: k.key }));
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
    try {
      const saved = localStorage.getItem('mcp_api_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMcpKeys(parsed.map((k: { name: string; key: string }) => ({
            id: crypto.randomUUID(),
            name: k.name,
            key: k.key
          })));
        } else {
          // Old format migration
          const migrated = Object.entries(parsed).map(([name, key]) => ({
            id: crypto.randomUUID(),
            name,
            key: key as string
          }));
          setMcpKeys(migrated);
        }
      }

      // Load translation provider preference
      const savedProvider = localStorage.getItem('translation_provider');
      if (savedProvider === 'rask' || savedProvider === 'elevenlabs') {
        setTranslationProvider(savedProvider);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const handleProviderChange = (value: TranslationProvider) => {
    setTranslationProvider(value);
    localStorage.setItem('translation_provider', value);
    toast.success(`翻訳プロバイダーを ${value === 'rask' ? 'Rask.ai' : 'ElevenLabs'} に変更しました`);
  };

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

      {/* 動画翻訳プロバイダー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            動画翻訳プロバイダー
          </CardTitle>
          <CardDescription>
            動画の翻訳に使用するサービスを選択します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={translationProvider}
            onValueChange={(value) => handleProviderChange(value as TranslationProvider)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="elevenlabs" id="elevenlabs" />
              <Label htmlFor="elevenlabs" className="flex-1 cursor-pointer">
                <div className="font-medium">ElevenLabs</div>
                <p className="text-sm text-muted-foreground">
                  高品質な音声クローニングと翻訳。Dubbing API使用。
                </p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="rask" id="rask" />
              <Label htmlFor="rask" className="flex-1 cursor-pointer">
                <div className="font-medium">Rask.ai</div>
                <p className="text-sm text-muted-foreground">
                  多言語対応の動画翻訳・吹き替えサービス。30以上の言語に対応。
                </p>
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            ※ 選択したプロバイダーは「技術管理」の動画翻訳機能で使用されます。
          </p>
        </CardContent>
      </Card>

      {/* MCP APIキー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            MCP APIキー設定
          </CardTitle>
          <CardDescription>
            MCP（Model Context Protocol）で使用するAPIキーを自由に追加・管理できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新しいキーを追加 */}
          <div className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="キー名を入力 (例: MY_API_KEY)"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addNewKey()}
            />
            <Button onClick={addNewKey} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </div>

          {/* 既存のキー一覧 */}
          {mcpKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              APIキーがありません。上のフォームから追加してください。
            </p>
          ) : (
            <div className="space-y-3">
              {mcpKeys.map((mcpKey) => (
                <div key={mcpKey.id} className="space-y-1">
                  <Label className="text-sm font-medium">{mcpKey.name}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[mcpKey.id] ? "text" : "password"}
                        value={mcpKey.key}
                        onChange={(e) => updateKeyValue(mcpKey.id, e.target.value)}
                        placeholder="APIキーを入力"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => toggleShowKey(mcpKey.id)}
                      >
                        {showKeys[mcpKey.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteKey(mcpKey.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 flex gap-2">
            <Button 
              onClick={handleSaveApiKeys} 
              disabled={isSavingKeys}
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
            ※ APIキーはブラウザのローカルストレージに保存されます。MCPチャットで使用できます。
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
