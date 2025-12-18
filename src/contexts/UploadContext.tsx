import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  videoUrl?: string;
  bunnyVideoId?: string;
  thumbnailUrl?: string;
  error?: string;
  type: 'bunny' | 'supabase';
  startTime: number;
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

  // Bunny.net TUS upload for user videos
  const startUpload = useCallback(async (file: File, title: string): Promise<{ videoUrl: string; bunnyVideoId: string; fileSize: number } | null> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    abortControllers.current.set(uploadId, abortController);

    const newUpload: UploadTask = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes: 0,
      progress: 0,
      status: 'uploading',
      type: 'bunny',
      startTime: Date.now(),
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      // Step 1: Create video in Bunny Stream
      updateUpload(uploadId, { progress: 5 });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('ログインが必要です');
      }

      const { data: createData, error: createError } = await supabase.functions.invoke(
        'upload-to-bunny',
        {
          body: { action: 'create-video', title: title || `Video_${Date.now()}` }
        }
      );

      if (createError || !createData?.videoId) {
        console.error('Bunny create error:', createError, createData);
        throw new Error('Bunny.netへの接続に失敗しました');
      }

      const bunnyVideoId = createData.videoId;
      const libraryId = createData.libraryId;

      // Step 2: Get TUS upload credentials
      updateUpload(uploadId, { progress: 10, bunnyVideoId });
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-to-bunny',
        {
          body: { action: 'get-upload-url', videoId: bunnyVideoId }
        }
      );

      if (uploadError || !uploadData?.tusEndpoint) {
        console.error('Bunny upload URL error:', uploadError, uploadData);
        throw new Error('アップロード情報の取得に失敗しました');
      }

      // Step 3: Upload using chunked TUS protocol
      updateUpload(uploadId, { progress: 15 });
      
      const tusEndpoint = String(uploadData.tusEndpoint);

      // Bunny TUS requires auth headers (not query params)
      const tusAuthHeaders: Record<string, string> = {
        AuthorizationSignature: String(uploadData.signature),
        AuthorizationExpire: String(uploadData.expirationTime),
        VideoId: String(uploadData.videoId),
        LibraryId: String(uploadData.libraryId),
      };

      // Step 3a: Create TUS upload session (with retry for unstable networks)
      console.log(
        `TUS upload: file size ${file.size} bytes (${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB)`
      );

      let createResponse: Response | null = null;
      let lastCreateErrorText = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (abortController.signal.aborted) {
          throw new Error("アップロードがキャンセルされました");
        }

        try {
          const res = await fetch(tusEndpoint, {
            method: "POST",
            headers: {
              "Tus-Resumable": "1.0.0",
              "Upload-Length": file.size.toString(),
              ...tusAuthHeaders,
            },
            signal: abortController.signal,
          });

          // Bunny returns 201 Created for successful TUS creation
          if (res.ok && res.status === 201) {
            createResponse = res;
            break;
          }

          const errorText = await res.text();
          lastCreateErrorText = errorText;
          console.error("TUS create failed:", res.status, errorText);

          // Retry only on transient-like failures
          const shouldRetry = res.status === 0 || res.status >= 500;
          if (shouldRetry && attempt < 3) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }

          // Non-retryable: throw immediately
          if (errorText.includes("exceeded") || errorText.includes("maximum")) {
            throw new Error("ファイルサイズが大きすぎます。アップロード上限を確認してください。");
          }

          throw new Error(`アップロードセッションの作成に失敗しました (${res.status})`);
        } catch (err) {
          // Network errors (poor connection) -> retry
          if (attempt < 3) {
            console.log(`TUS create error, retry ${attempt}/3:`, err);
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }

          // Final failure
          throw err;
        }
      }

      if (!createResponse) {
        throw new Error(`アップロードセッションの作成に失敗しました: ${lastCreateErrorText || "unknown"}`);
      }

      const locationHeader = createResponse.headers.get("Location");
      if (!locationHeader) {
        throw new Error("アップロードセッションの作成に失敗しました (Locationヘッダーなし)");
      }

      const uploadLocation = new URL(locationHeader, tusEndpoint).toString();

      // Step 3b: Upload file in chunks
      // Use smaller chunks for better mobile compatibility (10MB for mobile, 25MB for desktop)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const CHUNK_SIZE = isMobile ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
      let offset = 0;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let chunkIndex = 0;
      let retryCount = 0;
      const MAX_RETRIES = 5;

      while (offset < file.size) {
        if (abortController.signal.aborted) {
          throw new Error('アップロードがキャンセルされました');
        }

        const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));

        try {
          const patchResponse = await fetch(uploadLocation, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': offset.toString(),
              'Content-Type': 'application/offset+octet-stream',
              ...tusAuthHeaders,
            },
            body: chunk,
            signal: abortController.signal,
          });

          if (!patchResponse.ok) {
            if ((patchResponse.status >= 500 || patchResponse.status === 0) && retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`Chunk upload retry ${retryCount}/${MAX_RETRIES}`);
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            }
            console.error('Chunk upload failed:', patchResponse.status);
            throw new Error('チャンクのアップロードに失敗しました');
          }

          const newOffset = patchResponse.headers.get('Upload-Offset');
          offset = newOffset ? parseInt(newOffset, 10) : offset + chunk.size;
          chunkIndex++;
          retryCount = 0; // Reset retry count on success

          const uploadProgress = 15 + Math.floor((offset / file.size) * 55);
          updateUpload(uploadId, { progress: uploadProgress, uploadedBytes: offset });
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Chunk upload error, retry ${retryCount}/${MAX_RETRIES}:`, error);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          }
          throw error;
        }
      }

      updateUpload(uploadId, { progress: 70, status: 'processing' });

      // Step 4: Poll for video processing status
      let attempts = 0;
      const maxAttempts = 180;
      let videoReady = false;
      let playbackUrl = '';

      while (attempts < maxAttempts && !videoReady) {
        if (abortController.signal.aborted) {
          throw new Error('アップロードがキャンセルされました');
        }

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
        updateUpload(uploadId, { progress: 70 + Math.min(25, Math.floor(attempts * 0.15)) });
      }

      if (!videoReady) {
        playbackUrl = `https://vz-${libraryId}.b-cdn.net/${bunnyVideoId}/playlist.m3u8`;
      }

      updateUpload(uploadId, { 
        progress: 100, 
        status: 'completed', 
        videoUrl: playbackUrl 
      });

      abortControllers.current.delete(uploadId);
      toast.success("動画のアップロードが完了しました！");

      return { videoUrl: playbackUrl, bunnyVideoId, fileSize: file.size };
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
      uploadedBytes: 0,
      progress: 0,
      status: 'uploading',
      type: 'supabase',
      startTime: Date.now(),
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
