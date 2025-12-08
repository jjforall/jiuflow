import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, Video } from "lucide-react";

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featuredUserId?: string;
  featuredUserName?: string;
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  match: "試合動画",
  sparring: "スパー動画",
  technique: "テクニック動画",
  other: "動画"
};

export function VideoUploadDialog({ open, onOpenChange, featuredUserId, featuredUserName }: VideoUploadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<"match" | "sparring" | "technique" | "other">("match");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [price, setPrice] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Auto-set title when video type changes
  useEffect(() => {
    if (!title || Object.values(VIDEO_TYPE_LABELS).includes(title)) {
      setTitle(VIDEO_TYPE_LABELS[videoType]);
    }
  }, [videoType]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(VIDEO_TYPE_LABELS["match"]);
      setDescription("");
      setVideoType("match");
      setVideoFile(null);
      setPrice("");
      setVisibility("public");
      setUploadedVideoUrl(null);
      setUploadedFileName(null);
      setUploadProgress(0);
    }
  }, [open]);

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error("動画ファイルは500MB以下にしてください");
      return;
    }

    // Check video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      
      if (duration > 600) {
        toast.error("動画は10分以内にしてください");
        e.target.value = '';
        return;
      }
      
      setVideoFile(file);
      // Start upload immediately
      await uploadVideo(file);
    };

    video.onerror = function() {
      toast.error("動画ファイルの読み込みに失敗しました");
      e.target.value = '';
    };

    video.src = URL.createObjectURL(file);
  };

  const uploadVideo = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ログインしてください");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, file, {
          cacheControl: '604800',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      setUploadedVideoUrl(publicUrl);
      setUploadedFileName(fileName);
      setUploadProgress(100);
      toast.success("動画のアップロードが完了しました");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("アップロードに失敗しました");
      setVideoFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedVideoUrl || !title) {
      toast.error("タイトルと動画ファイルは必須です");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ログインしてください");
      return;
    }

    setUploading(true);

    try {
      const { error: dbError } = await supabase
        .from('user_videos')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          video_type: videoType,
          video_url: uploadedVideoUrl,
          price: price ? Number(price) : 0,
          is_public: visibility === 'public',
          visibility,
          featured_user_id: featuredUserId || null
        });

      if (dbError) throw dbError;

      toast.success("動画を投稿しました！");
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error("投稿に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {featuredUserName 
              ? `${featuredUserName}さんの動画を投稿する` 
              : '動画を投稿する'}
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            {featuredUserName ? (
              <>
                <p>{featuredUserName}さんが写っている動画を投稿できます。</p>
                <p className="text-sm">※ 動画はあなたの所有物として管理され、{featuredUserName}さんのプロフィールにも表示されます。</p>
              </>
            ) : (
              <>
                <p>試合動画、テクニック動画など、どんな動画でもお気軽に投稿してください。</p>
                <p className="text-sm">※ テクニック動画の場合、一部使わせていただく可能性があります。</p>
              </>
            )}
            <p className="text-sm font-medium text-primary">再生数に応じた収益をお返しします。</p>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Video Type - First */}
          <div className="space-y-2">
            <Label htmlFor="videoType">動画の種類 *</Label>
            <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
              <SelectTrigger id="videoType">
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

          {/* Video File - Uploads immediately */}
          <div className="space-y-2">
            <Label htmlFor="video">動画ファイル *</Label>
            {!uploadedVideoUrl ? (
              <div className="relative">
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="video"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploading 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {uploading ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">アップロード中... {uploadProgress}%</p>
                      <div className="w-48 h-1.5 mt-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">クリックして動画を選択</p>
                      <p className="text-xs text-muted-foreground mt-1">最大500MB、10分以内</p>
                    </div>
                  )}
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{videoFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {videoFile && `${(videoFile.size / 1024 / 1024).toFixed(1)}MB`} - アップロード完了
                  </p>
                </div>
                <Video className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Title - Auto-filled based on type */}
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
            <Label htmlFor="price">価格（円）</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              0円の場合は無料で視聴できます。有料にする場合は100円以上を設定してください。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">公開設定</Label>
            <Select value={visibility} onValueChange={(value: "public" | "unlisted" | "private") => setVisibility(value)}>
              <SelectTrigger id="visibility">
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
              disabled={uploading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={uploading || !uploadedVideoUrl}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中
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
