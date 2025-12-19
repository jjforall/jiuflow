import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VideoShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    share_token: string | null;
  };
  onTokenUpdated: (newToken: string) => void;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function VideoShareDialog({ open, onOpenChange, video, onTokenUpdated }: VideoShareDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentToken, setCurrentToken] = useState(video.share_token);

  const shareUrl = currentToken 
    ? `${window.location.origin}/shared/${currentToken}`
    : null;

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    try {
      const newToken = generateToken();
      
      const { error } = await supabase
        .from('user_videos')
        .update({ share_token: newToken })
        .eq('id', video.id);

      if (error) throw error;

      setCurrentToken(newToken);
      onTokenUpdated(newToken);
      toast.success("共有URLを生成しました");
    } catch (error) {
      console.error('Error generating share token:', error);
      toast.error("共有URLの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("URLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const handleRevokeToken = async () => {
    setIsGenerating(true);
    try {
      const { error } = await supabase
        .from('user_videos')
        .update({ share_token: null })
        .eq('id', video.id);

      if (error) throw error;

      setCurrentToken(null);
      onTokenUpdated('');
      toast.success("共有URLを無効化しました");
    } catch (error) {
      console.error('Error revoking share token:', error);
      toast.error("共有URLの無効化に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            動画を共有
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              「{video.title}」
            </p>
            <p className="text-sm text-muted-foreground">
              限定公開の動画を共有するためのURLを発行します。URLを知っている人だけがこの動画を視聴できます。
            </p>
          </div>

          {shareUrl ? (
            <div className="space-y-3">
              <Label>共有URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateToken}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  URLを再生成
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokeToken}
                  disabled={isGenerating}
                >
                  無効化
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URLを再生成すると、以前のURLは無効になります。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                共有URLはまだ発行されていません。
              </p>
              <Button
                onClick={handleGenerateToken}
                disabled={isGenerating}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                {isGenerating ? "生成中..." : "共有URLを発行"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
