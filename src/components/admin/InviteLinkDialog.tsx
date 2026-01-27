import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Link2, Loader2, Check, Calendar, Eye, Trash2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, addHours, addMonths } from "date-fns";

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  techniqueId: string;
  techniqueName: string;
}

interface InviteLink {
  id: string;
  token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  created_at: string;
  target_language: string;
}

// Language options for invite links
const languageOptions = [
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

// Generate a random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function InviteLinkDialog({
  open,
  onOpenChange,
  techniqueId,
  techniqueName,
}: InviteLinkDialogProps) {
  const [expiry, setExpiry] = useState<string>("7d");
  const [maxViews, setMaxViews] = useState<string>("unlimited");
  const [targetLanguage, setTargetLanguage] = useState<string>("ja");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [existingLinks, setExistingLinks] = useState<InviteLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load existing links when dialog opens
  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("special_video_invites")
        .select("*")
        .eq("technique_id", techniqueId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExistingLinks((data || []) as InviteLink[]);
    } catch (error) {
      console.error("Error loading links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      loadLinks();
      setGeneratedLink(null);
    }
    onOpenChange(newOpen);
  };

  const getExpiryDate = (): string | null => {
    const now = new Date();
    switch (expiry) {
      case "1h": return addHours(now, 1).toISOString();
      case "24h": return addDays(now, 1).toISOString();
      case "7d": return addDays(now, 7).toISOString();
      case "30d": return addMonths(now, 1).toISOString();
      case "90d": return addMonths(now, 3).toISOString();
      case "never": return null;
      default: return addDays(now, 7).toISOString();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const token = generateToken();
      const expiresAt = getExpiryDate();
      const views = maxViews === "unlimited" ? null : parseInt(maxViews);

      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("special_video_invites")
        .insert({
          technique_id: techniqueId,
          token,
          expires_at: expiresAt,
          max_views: views,
          created_by: userData.user?.id,
          target_language: targetLanguage,
        });

      if (error) throw error;

      // Include language in URL if not Japanese (default)
      const langParam = targetLanguage !== "ja" ? `&lang=${targetLanguage}` : "";
      const link = `${window.location.origin}/video/${techniqueId}?invite=${token}${langParam}`;
      setGeneratedLink(link);
      loadLinks();
      toast.success("招待リンクを生成しました");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("リンクの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("リンクをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("special_video_invites")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      loadLinks();
      toast.success("リンクを無効化しました");
    } catch (error) {
      console.error("Error deactivating link:", error);
      toast.error("無効化に失敗しました");
    }
  };

  const formatExpiry = (date: string | null) => {
    if (!date) return "無期限";
    const d = new Date(date);
    if (d < new Date()) return "期限切れ";
    return format(d, "yyyy/MM/dd HH:mm");
  };

  const getLanguageLabel = (code: string) => {
    const lang = languageOptions.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.code.toUpperCase()}` : code.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            招待リンク
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            動画: <span className="font-medium text-foreground">{techniqueName}</span>
          </div>

          {/* Generate new link */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium">新規リンクを生成</div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">有効期限</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1時間</SelectItem>
                    <SelectItem value="24h">24時間</SelectItem>
                    <SelectItem value="7d">7日間</SelectItem>
                    <SelectItem value="30d">30日間</SelectItem>
                    <SelectItem value="90d">90日間</SelectItem>
                    <SelectItem value="never">無期限</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">最大視聴回数</Label>
                <Select value={maxViews} onValueChange={setMaxViews}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1回</SelectItem>
                    <SelectItem value="5">5回</SelectItem>
                    <SelectItem value="10">10回</SelectItem>
                    <SelectItem value="50">50回</SelectItem>
                    <SelectItem value="100">100回</SelectItem>
                    <SelectItem value="unlimited">無制限</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">対象言語</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              リンクを生成
            </Button>
          </div>

          {/* Generated link */}
          {generatedLink && (
            <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                生成されたリンク
              </div>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="text-xs font-mono bg-white dark:bg-background"
                />
                <Button onClick={handleCopy} size="icon" variant="outline">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Existing links */}
          {existingLinks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">既存のリンク</div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {existingLinks.map(link => (
                  <div
                    key={link.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                      link.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          ...{link.token.slice(-8)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-[10px] font-medium">
                          <Globe className="w-2.5 h-2.5" />
                          {getLanguageLabel(link.target_language || "ja")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatExpiry(link.expires_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {link.view_count} / {link.max_views || "∞"}
                        </span>
                      </div>
                    </div>
                    {link.is_active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeactivate(link.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
