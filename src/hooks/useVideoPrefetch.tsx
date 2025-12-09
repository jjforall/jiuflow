import { useCallback, useRef } from 'react';

// Cache for prefetched manifests
const prefetchedUrls = new Set<string>();

// Extract video ID from Cloudflare Stream URL
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /videodelivery\.net\/([a-zA-Z0-9]+)/,
    /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get manifest URL from video ID
const getManifestUrl = (videoId: string): string => {
  return `https://customer-${videoId.substring(0, 8)}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
};

// Prefetch manifest using link preload
const prefetchManifest = (videoUrl: string) => {
  const videoId = extractVideoId(videoUrl);
  if (!videoId || prefetchedUrls.has(videoId)) return;
  
  prefetchedUrls.add(videoId);
  
  // Create preload link for manifest
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  
  // Also prefetch thumbnail
  const thumbLink = document.createElement('link');
  thumbLink.rel = 'prefetch';
  thumbLink.href = `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?time=1s&width=320&height=180`;
  thumbLink.as = 'image';
  document.head.appendChild(thumbLink);
  
  // Cleanup after 30 seconds
  setTimeout(() => {
    link.remove();
    thumbLink.remove();
  }, 30000);
};

// Prefetch video by URL
export const prefetchVideo = (videoUrl: string | null | undefined) => {
  if (!videoUrl) return;
  prefetchManifest(videoUrl);
};

// Prefetch video by Cloudflare video ID directly
export const prefetchVideoById = (videoId: string) => {
  if (prefetchedUrls.has(videoId)) return;
  prefetchedUrls.add(videoId);
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  
  setTimeout(() => link.remove(), 30000);
};

// Hook for video link hover prefetching
export const useVideoPrefetch = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const onMouseEnter = useCallback((videoUrl: string | null | undefined) => {
    if (!videoUrl) return;
    
    // Delay prefetch slightly to avoid unnecessary fetches on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchVideo(videoUrl);
    }, 100);
  }, []);
  
  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  return { onMouseEnter, onMouseLeave };
};

// Simple wrapper component for video links with prefetch
export const VideoPrefetchLink = ({ 
  videoUrl, 
  children, 
  ...props 
}: { 
  videoUrl: string | null | undefined;
  children: React.ReactNode;
  [key: string]: unknown;
}) => {
  const { onMouseEnter, onMouseLeave } = useVideoPrefetch();
  
  return (
    <div 
      onMouseEnter={() => onMouseEnter(videoUrl)}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

export default useVideoPrefetch;
