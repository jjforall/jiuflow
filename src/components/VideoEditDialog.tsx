import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface VideoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    title_en?: string | null;
    description: string | null;
    video_type: string;
    price: number;
    is_public: boolean;
    visibility?: string;
  } | null;
  onSuccess?: () => void;
}

export function VideoEditDialog({ open, onOpenChange, video, onSuccess }: VideoEditDialogProps) {
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<string>("other");
  const [price, setPrice] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setTitleEn(video.title_en || "");
      setDescription(video.description || "");
      setVideoType(video.video_type);
      setPrice(video.price);
      setVisibility((video.visibility as "public" | "unlisted" | "private") || (video.is_public ? "public" : "private"));
    }
  }, [video]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!video || !title) {
      toast.error("タイトルは必須です");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_videos')
        .update({
          title,
          title_en: titleEn || null,
          description: description || null,
          video_type: videoType,
          price,
          is_public: visibility === 'public',
          visibility
        })
        .eq('id', video.id);

      if (error) throw error;

      toast.success("動画を更新しました！");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Update error:', error);
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>動画を編集</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">タイトル *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="動画のタイトルを入力"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-title-en">英語タイトル</Label>
            <Input
              id="edit-title-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="English title (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">説明</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="動画の説明を入力（オプション）"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-videoType">動画の種類 *</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger id="edit-videoType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">試合動画</SelectItem>
                <SelectItem value="sparring">スパー動画</SelectItem>
                <SelectItem value="technique">テクニック動画</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price">価格（円）</Label>
            <Input
              id="edit-price"
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              0円の場合は無料で視聴できます。有料にする場合は100円以上を設定してください。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-visibility">公開設定</Label>
            <Select value={visibility} onValueChange={(value: "public" | "unlisted" | "private") => setVisibility(value)}>
              <SelectTrigger id="edit-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex flex-col items-start">
                    <span>🌍 一般公開</span>
                    <span className="text-xs text-muted-foreground">誰でも検索・閲覧可能</span>
                  </div>
                </SelectItem>
                <SelectItem value="unlisted">
                  <div className="flex flex-col items-start">
                    <span>🔗 限定公開</span>
                    <span className="text-xs text-muted-foreground">URLを知っている人のみ閲覧可能</span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex flex-col items-start">
                    <span>🔒 非公開</span>
                    <span className="text-xs text-muted-foreground">自分のみ閲覧可能</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
