import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoUploadDialog({ open, onOpenChange }: VideoUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<"match" | "technique" | "other">("other");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        toast.error("動画ファイルは500MB以下にしてください");
        return;
      }
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !title) {
      toast.error("タイトルと動画ファイルは必須です");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ログインしてください");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      setUploadProgress(75);

      // Save video metadata to database
      const { error: dbError } = await supabase
        .from('user_videos')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          video_type: videoType,
          video_url: publicUrl
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success("動画をアップロードしました！");
      
      // Reset form
      setTitle("");
      setDescription("");
      setVideoType("other");
      setVideoFile(null);
      setUploadProgress(0);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>動画を投稿する</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>試合動画、テクニック動画など、どんな動画でもお気軽に投稿してください。</p>
            <p className="text-sm">※ テクニック動画の場合、一部使わせていただく可能性があります。</p>
            <p className="text-sm font-medium text-primary">再生数に応じた収益をお返しします。</p>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="動画のタイトルを入力"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="動画の説明を入力（オプション）"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoType">動画の種類 *</Label>
            <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
              <SelectTrigger id="videoType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">試合動画</SelectItem>
                <SelectItem value="technique">テクニック動画</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">動画ファイル *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="flex-1"
                required
              />
              {videoFile && (
                <span className="text-sm text-muted-foreground">
                  {(videoFile.size / 1024 / 1024).toFixed(1)}MB
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">最大500MBまで対応</p>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>アップロード中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  アップロード中
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  投稿する
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}