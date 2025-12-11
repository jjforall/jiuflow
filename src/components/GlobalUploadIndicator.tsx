import { useUpload } from "@/contexts/UploadContext";
import { X, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalUploadIndicator() {
  const { uploads, cancelUpload, clearCompletedUploads } = useUpload();

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'processing');
  const completedUploads = uploads.filter(u => u.status === 'completed' || u.status === 'error');

  if (uploads.length === 0) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border rounded-lg shadow-lg overflow-hidden">
      <div className="bg-muted px-4 py-2 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Upload className="w-4 h-4" />
          <span>アップロード</span>
          {activeUploads.length > 0 && (
            <span className="text-muted-foreground">({activeUploads.length}件進行中)</span>
          )}
        </div>
        {completedUploads.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={clearCompletedUploads}
          >
            完了を消す
          </Button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className={cn(
              "px-4 py-3 border-b last:border-b-0",
              upload.status === 'error' && "bg-destructive/5"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(upload.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {upload.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {upload.status === 'processing' && (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                )}
                {upload.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => cancelUpload(upload.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {(upload.status === 'uploading' || upload.status === 'processing') && (
              <div className="space-y-1">
                <Progress value={upload.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-right">
                  {upload.status === 'processing' ? '処理中...' : `${upload.progress}%`}
                </p>
              </div>
            )}

            {upload.status === 'error' && upload.error && (
              <p className="text-xs text-destructive">{upload.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
