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

  // Bunny.net TUS upload for user videos
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
      type: 'bunny',
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
      
      const tusBaseUrl = `${uploadData.tusEndpoint}`;
      const queryParams = `?VideoId=${uploadData.videoId}&LibraryId=${uploadData.libraryId}&AuthorizationSignature=${uploadData.signature}&AuthorizationExpire=${uploadData.expirationTime}`;
      
      // Step 3a: Create TUS upload session
      const createResponse = await fetch(tusBaseUrl + queryParams, {
        method: 'POST',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Length': file.size.toString(),
        },
        signal: abortController.signal,
      });

      if (!createResponse.ok && createResponse.status !== 201) {
        console.error('TUS create failed:', createResponse.status);
        throw new Error('アップロードセッションの作成に失敗しました');
      }

      const uploadLocation = createResponse.headers.get('Location') || (tusBaseUrl + queryParams);
      
      // Step 3b: Upload file in chunks
      const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
      let offset = 0;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let chunkIndex = 0;

      while (offset < file.size) {
        if (abortController.signal.aborted) {
          throw new Error('アップロードがキャンセルされました');
        }

        const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
        
        const patchResponse = await fetch(uploadLocation, {
          method: 'PATCH',
          headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': offset.toString(),
            'Content-Type': 'application/offset+octet-stream',
          },
          body: chunk,
          signal: abortController.signal,
        });

        if (!patchResponse.ok) {
          if (patchResponse.status >= 500 || patchResponse.status === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          console.error('Chunk upload failed:', patchResponse.status);
          throw new Error('チャンクのアップロードに失敗しました');
        }

        const newOffset = patchResponse.headers.get('Upload-Offset');
        offset = newOffset ? parseInt(newOffset, 10) : offset + chunk.size;
        chunkIndex++;
        
        const uploadProgress = 15 + Math.floor((chunkIndex / totalChunks) * 55);
        updateUpload(uploadId, { progress: uploadProgress });
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
