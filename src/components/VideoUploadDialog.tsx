import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, Video, AlertCircle, HardDrive } from "lucide-react";
import { useStorageLimit } from "@/hooks/useStorageLimit";
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
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  
  const { currentUsage, storageLimit, remaining, isSubscribed, checkCanUpload, formatBytes, refetch } = useStorageLimit();

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
      setUploadedFileSize(0);
      setUploadProgress(0);
      refetch();
    }
  }, [open, refetch]);

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10GB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("動画ファイルは10GB以下にしてください");
      return;
    }

    // Check storage limit
    const storageCheck = await checkCanUpload(file.size);
    if (!storageCheck.canUpload) {
      const limitGB = isSubscribed ? '1TB' : '100GB';
      toast.error(
        `ストレージ容量が不足しています。現在 ${formatBytes(storageCheck.currentUsage)} / ${limitGB} を使用中です。${
          !isSubscribed ? '有料プランにアップグレードすると1TBまで利用可能になります。' : ''
        }`
      );
      return;
    }

    // For large files, skip duration check to avoid memory issues
    if (file.size > 500 * 1024 * 1024) {
      setVideoFile(file);
      setUploadedFileSize(file.size);
      toast.info("大容量ファイルのアップロードを開始します...");
      await uploadVideo(file);
      return;
    }

    // Check video duration for smaller files
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      
      if (duration > 3600) { // 1 hour max
        toast.error("動画は60分以内にしてください");
        e.target.value = '';
        return;
      }
      
      setVideoFile(file);
      setUploadedFileSize(file.size);
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
      // Step 1: Create video in Bunny Stream
      setUploadProgress(5);
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'upload-to-bunny',
        {
          body: { action: 'create-video', title: title || `Video_${Date.now()}` }
        }
      );

      if (createError || !createData?.videoId) {
        throw new Error('Bunny.netへの接続に失敗しました');
      }

      const bunnyVideoId = createData.videoId;
      const libraryId = createData.libraryId;

      // Step 2: Get TUS upload credentials
      setUploadProgress(10);
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-to-bunny',
        {
          body: { action: 'get-upload-url', videoId: bunnyVideoId }
        }
      );

      if (uploadError || !uploadData?.tusEndpoint) {
        throw new Error('アップロード情報の取得に失敗しました');
      }

      // Step 3: Upload using chunked TUS protocol for large files
      setUploadProgress(15);
      
      const tusBaseUrl = `${uploadData.tusEndpoint}`;
      const queryParams = `?VideoId=${uploadData.videoId}&LibraryId=${uploadData.libraryId}&Signature=${uploadData.signature}&ExpirationTime=${uploadData.expirationTime}`;
      
      // Step 3a: Create TUS upload session
      const createResponse = await fetch(tusBaseUrl + queryParams, {
        method: 'POST',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Length': file.size.toString(),
        },
      });

      if (!createResponse.ok && createResponse.status !== 201) {
        const errorText = await createResponse.text().catch(() => '');
        console.error('TUS create error:', createResponse.status, errorText);
        throw new Error('アップロードセッションの作成に失敗しました');
      }

      // Get the upload location from response
      const uploadLocation = createResponse.headers.get('Location') || (tusBaseUrl + queryParams);
      
      // Step 3b: Upload file in chunks
      const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
      let offset = 0;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let chunkIndex = 0;

      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
        
        const patchResponse = await fetch(uploadLocation, {
          method: 'PATCH',
          headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': offset.toString(),
            'Content-Type': 'application/offset+octet-stream',
          },
          body: chunk,
        });

        if (!patchResponse.ok) {
          const errorText = await patchResponse.text();
          console.error('TUS PATCH error:', patchResponse.status, errorText);
          
          // Retry logic for network errors
          if (patchResponse.status >= 500 || patchResponse.status === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Retry this chunk
          }
          
          throw new Error('チャンクのアップロードに失敗しました');
        }

        const newOffset = patchResponse.headers.get('Upload-Offset');
        offset = newOffset ? parseInt(newOffset, 10) : offset + chunk.size;
        chunkIndex++;
        
        // Progress: 15-70% for upload
        const uploadProgress = 15 + Math.floor((chunkIndex / totalChunks) * 55);
        setUploadProgress(uploadProgress);
      }

      setUploadProgress(70);

      // Step 4: Poll for video processing status
      let attempts = 0;
      const maxAttempts = 180; // 6 minutes timeout for large file processing
      let videoReady = false;
      let playbackUrl = '';

      while (attempts < maxAttempts && !videoReady) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: statusData } = await supabase.functions.invoke(
          'upload-to-bunny',
          {
            body: { action: 'get-video-status', videoId: bunnyVideoId }
          }
        );

        if (statusData?.ready && statusData?.hlsUrl) {
          videoReady = true;
          playbackUrl = statusData.hlsUrl;
        } else if (statusData?.status === 5) {
          throw new Error('動画の処理中にエラーが発生しました');
        }
        
        attempts++;
        // Progress: 70-95% for processing
        setUploadProgress(70 + Math.min(25, Math.floor(attempts * 0.15)));
      }

      if (!videoReady) {
        // Video still processing, use expected HLS URL
        playbackUrl = `https://vz-${libraryId}.b-cdn.net/${bunnyVideoId}/playlist.m3u8`;
      }

      setUploadedVideoUrl(playbackUrl);
      setUploadedFileName(bunnyVideoId);
      setUploadProgress(100);
      toast.success("動画のアップロードが完了しました！");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : "アップロードに失敗しました");
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
          featured_user_id: featuredUserId || null,
          file_size: uploadedFileSize
        });

      if (dbError) throw dbError;

      toast.success("動画を投稿しました！");
      refetch(); // Refresh storage info
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
        
        {/* Storage Usage Indicator */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">ストレージ使用量</span>
            </div>
            <span className="text-sm font-medium">
              {formatBytes(currentUsage)} / {isSubscribed ? '1TB' : '100GB'}
            </span>
          </div>
          <Progress value={(currentUsage / storageLimit) * 100} className="h-2" />
          {!isSubscribed && remaining < 10 * 1024 * 1024 * 1024 && (
            <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              容量が残りわずかです。有料プランで1TBまで拡張できます。
            </p>
          )}
        </div>
        
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
                      <p className="text-xs text-muted-foreground mt-1">最大10GB</p>
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
