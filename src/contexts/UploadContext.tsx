import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  videoUrl?: string;
  bunnyVideoId?: string;
  thumbnailUrl?: string;
  error?: string;
  type: 'bunny' | 'supabase';
}

interface UploadContextType {
  uploads: UploadTask[];
  startUpload: (file: File, title: string) => Promise<{ videoUrl: string; bunnyVideoId: string; fileSize: number } | null>;
  startStorageUpload: (file: File, bucket: string, path: string, onThumbnail?: (url: string) => Promise<string | null>) => Promise<{ videoUrl: string; thumbnailUrl: string | null } | null>;
  cancelUpload: (id: string) => void;
  clearCompletedUploads: () => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const updateUpload = useCallback((id: string, updates: Partial<UploadTask>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  // Cloudflare Stream upload for user videos
  const startUpload = useCallback(async (file: File, title: string): Promise<{ videoUrl: string; bunnyVideoId: string; fileSize: number } | null> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    abortControllers.current.set(uploadId, abortController);

    const newUpload: UploadTask = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'uploading',
      type: 'bunny', // Keep type name for backwards compatibility
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      // Step 1: Get direct upload URL from Cloudflare Stream
      updateUpload(uploadId, { progress: 5 });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('ログインが必要です');
      }

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-to-cloudflare-stream',
        {
          body: { action: 'get-upload-url' }
        }
      );

      if (uploadError || !uploadData?.uploadUrl) {
        console.error('Cloudflare Stream error:', uploadError, uploadData);
        throw new Error('アップロードURLの取得に失敗しました');
      }

      const cloudflareVideoId = uploadData.videoId;
      updateUpload(uploadId, { progress: 10, bunnyVideoId: cloudflareVideoId });

      // Step 2: Upload file directly to Cloudflare using their direct upload URL
      updateUpload(uploadId, { progress: 15 });

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error('動画のアップロードに失敗しました');
      }

      updateUpload(uploadId, { progress: 70, status: 'processing' });

      // Step 3: Poll for video processing status
      let attempts = 0;
      const maxAttempts = 180;
      let videoReady = false;
      let playbackUrl = uploadData.playbackUrl;

      while (attempts < maxAttempts && !videoReady) {
        if (abortController.signal.aborted) {
          throw new Error('アップロードがキャンセルされました');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke(
          'upload-to-cloudflare-stream',
          {
            body: { action: 'get-video-status', videoId: cloudflareVideoId }
          }
        );

        if (statusError) {
          console.error('Status check error:', statusError);
        }

        if (statusData?.ready && statusData?.playbackUrl) {
          videoReady = true;
          playbackUrl = statusData.playbackUrl;
        } else if (statusData?.status === 'error') {
          throw new Error('動画の処理中にエラーが発生しました');
        }
        
        attempts++;
        updateUpload(uploadId, { progress: 70 + Math.min(25, Math.floor(attempts * 0.15)) });
      }

      // Use iframe URL for playback
      const embedUrl = `https://customer-${cloudflareVideoId.split('-')[0] || 'stream'}.cloudflarestream.com/${cloudflareVideoId}/iframe`;
      const finalUrl = playbackUrl || embedUrl;

      updateUpload(uploadId, { 
        progress: 100, 
        status: 'completed', 
        videoUrl: finalUrl 
      });

      abortControllers.current.delete(uploadId);
      toast.success("動画のアップロードが完了しました！");

      return { videoUrl: finalUrl, bunnyVideoId: cloudflareVideoId, fileSize: file.size };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateUpload(uploadId, { status: 'error', error: 'キャンセルされました' });
      } else {
        const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
        updateUpload(uploadId, { status: 'error', error: errorMessage });
        toast.error(errorMessage);
      }
      abortControllers.current.delete(uploadId);
      return null;
    }
  }, [updateUpload]);

  // Supabase Storage upload for admin technique videos
  const startStorageUpload = useCallback(async (
    file: File, 
    bucket: string, 
    path: string,
    onThumbnail?: (videoUrl: string) => Promise<string | null>
  ): Promise<{ videoUrl: string; thumbnailUrl: string | null } | null> => {
    const uploadId = `storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newUpload: UploadTask = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'uploading',
      type: 'supabase',
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(u => 
          u.id === uploadId && u.status === 'uploading' && u.progress < 80
            ? { ...u, progress: Math.min(u.progress + 10, 80) }
            : u
        ));
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { 
          upsert: false,
          cacheControl: '604800',
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      const timestamp = Date.now();
      const videoUrl = `${publicUrl}?t=${timestamp}`;

      updateUpload(uploadId, { progress: 90, videoUrl });

      // Generate thumbnail if callback provided
      let thumbnailUrl: string | null = null;
      if (onThumbnail) {
        try {
          thumbnailUrl = await onThumbnail(videoUrl);
          if (thumbnailUrl) {
            updateUpload(uploadId, { thumbnailUrl });
          }
        } catch (error) {
          console.error('Thumbnail generation failed:', error);
        }
      }

      updateUpload(uploadId, { 
        progress: 100, 
        status: 'completed',
        videoUrl,
        thumbnailUrl: thumbnailUrl || undefined,
      });

      toast.success("動画のアップロードが完了しました！");
      return { videoUrl, thumbnailUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
      updateUpload(uploadId, { status: 'error', error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [updateUpload]);

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'completed' && u.status !== 'error'));
  }, []);

  const isUploading = uploads.some(u => u.status === 'uploading' || u.status === 'processing');

  return (
    <UploadContext.Provider value={{ uploads, startUpload, startStorageUpload, cancelUpload, clearCompletedUploads, isUploading }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
