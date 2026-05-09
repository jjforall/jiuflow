import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUpload } from "@/contexts/UploadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FolderUp, CheckCircle2, XCircle, Loader2, Video as VideoIcon, Trash2 } from "lucide-react";

type ItemStatus = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  relativePath: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  videoUrl?: string;
}

const VIDEO_EXTS = [".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"];
const isVideo = (name: string) => VIDEO_EXTS.some((ext) => name.toLowerCase().endsWith(ext));

// Custom typing for webkitdirectory
declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export default function AdminBulkUpload() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("private");
  const [videoType, setVideoType] = useState<"match" | "sparring" | "technique" | "other">("technique");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUpload();

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr: QueueItem[] = [];
    for (const f of Array.from(fileList)) {
      if (!isVideo(f.name)) continue;
      // webkitRelativePath available when picking a folder
      const rel = (f as any).webkitRelativePath || f.name;
      arr.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file: f,
        relativePath: rel,
        status: "pending",
        progress: 0,
      });
    }
    if (arr.length === 0) {
      toast.error("動画ファイルが見つかりませんでした");
      return;
    }
    setItems((prev) => [...prev, ...arr]);
    toast.success(`${arr.length}件の動画を追加しました`);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearDone = () => {
    setItems((prev) => prev.filter((i) => i.status !== "done"));
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const startBatch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ログインしてください");
      return;
    }
    setRunning(true);
    const pending = items.filter((i) => i.status === "pending" || i.status === "error");

    for (const item of pending) {
      // Re-derive title from filename (without extension), keep folder context as description
      const baseName = item.file.name.replace(/\.[^.]+$/, "");
      const folder = item.relativePath.includes("/")
        ? item.relativePath.split("/").slice(0, -1).join("/")
        : "";

      updateItem(item.id, { status: "uploading", progress: 1, error: undefined });

      try {
        const result = await startUpload(item.file, baseName);
        if (!result) throw new Error("アップロード失敗");

        const shareToken = visibility === "unlisted" ? crypto.randomUUID() : null;

        const { error: dbError } = await supabase.from("user_videos").insert({
          user_id: user.id,
          title: baseName,
          description: folder ? `Folder: ${folder}` : null,
          video_type: videoType,
          video_url: result.videoUrl,
          thumbnail_url: null,
          price: 0,
          is_public: visibility === "public",
          visibility,
          file_size: result.fileSize,
          share_token: shareToken,
        });
        if (dbError) throw dbError;

        updateItem(item.id, { status: "done", progress: 100, videoUrl: result.videoUrl });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Bulk upload error:", e);
        updateItem(item.id, { status: "error", error: msg });
      }
    }

    setRunning(false);
    toast.success("一括アップロード処理が完了しました");
  };

  const totalSize = items.reduce((s, i) => s + i.file.size, 0);
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">フォルダ一括アップロード</h1>
        <p className="text-muted-foreground">
          フォルダを選択すると、中の動画ファイル（mp4, mov, webm 等）をまとめてBunny.netにアップロードします。
          ファイル名がタイトル、サブフォルダ名が説明欄に入ります。
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>アップロード設定</CardTitle>
          <CardDescription>すべての動画に共通で適用されます</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>動画タイプ</Label>
            <Select value={videoType} onValueChange={(v: any) => setVideoType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="match">試合動画</SelectItem>
                <SelectItem value="sparring">スパー動画</SelectItem>
                <SelectItem value="technique">テクニック動画</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>公開範囲</Label>
            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">プライベート（自分のみ）</SelectItem>
                <SelectItem value="unlisted">限定公開（リンク必要）</SelectItem>
                <SelectItem value="public">公開</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ファイル選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                if (folderInputRef.current) folderInputRef.current.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button onClick={() => folderInputRef.current?.click()} disabled={running}>
              <FolderUp className="w-4 h-4 mr-2" />
              フォルダを選択
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={running}>
              <VideoIcon className="w-4 h-4 mr-2" />
              ファイルを追加
            </Button>
            {items.length > 0 && (
              <>
                <Button
                  variant="default"
                  onClick={startBatch}
                  disabled={running || items.every((i) => i.status === "done")}
                >
                  {running ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    `アップロード開始 (${items.filter((i) => i.status !== "done").length}件)`
                  )}
                </Button>
                {doneCount > 0 && !running && (
                  <Button variant="ghost" onClick={clearDone}>
                    完了をクリア
                  </Button>
                )}
              </>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <span>合計: {items.length}件 ({formatSize(totalSize)})</span>
              <span className="text-green-600">完了: {doneCount}</span>
              {errorCount > 0 && <span className="text-destructive">失敗: {errorCount}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>キュー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-shrink-0">
                  {item.status === "done" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {item.status === "error" && <XCircle className="w-5 h-5 text-destructive" />}
                  {item.status === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {item.status === "pending" && <VideoIcon className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.relativePath}</span>
                    <Badge variant="outline" className="flex-shrink-0">{formatSize(item.file.size)}</Badge>
                  </div>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="h-1 mt-2" />
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive mt-1">{item.error}</p>
                  )}
                </div>
                {!running && item.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}