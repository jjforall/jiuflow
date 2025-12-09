import { useCallback, useRef } from 'react';

// Extract Cloudflare Stream video ID from various URL formats
const getCloudflareVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Format: https://customer-xxx.cloudflarestream.com/videoId/manifest/video.m3u8
  const streamMatch = url.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  if (streamMatch) return streamMatch[1];
  
  // Format: https://videodelivery.net/videoId/...
  const deliveryMatch = url.match(/videodelivery\.net\/([a-zA-Z0-9]+)/);
  if (deliveryMatch) return deliveryMatch[1];
  
  return null;
};

// Prefetch video manifest and thumbnail
export const prefetchVideo = (videoUrl: string) => {
  const videoId = getCloudflareVideoId(videoUrl);
  if (!videoId) return;

  // Prefetch the HLS manifest
  const manifestUrl = `https://customer-h30twz5us03qxnww.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
  
  // Use link preload for manifest
  const existingLink = document.querySelector(`link[href="${manifestUrl}"]`);
  if (!existingLink) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = manifestUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  // Also prefetch the thumbnail
  const thumbnailUrl = `https://customer-h30twz5us03qxnww.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=1s&width=640`;
  const existingThumb = document.querySelector(`link[href="${thumbnailUrl}"]`);
  if (!existingThumb) {
    const thumbLink = document.createElement('link');
    thumbLink.rel = 'preload';
    thumbLink.as = 'image';
    thumbLink.href = thumbnailUrl;
    document.head.appendChild(thumbLink);
  }
};

export const useVideoPrefetch = () => {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // For desktop hover
  const onMouseEnter = useCallback((videoUrl: string | null | undefined) => {
    if (!videoUrl || prefetchedRef.current.has(videoUrl)) return;
    
    // Delay prefetch slightly to avoid unnecessary fetches on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchVideo(videoUrl);
      prefetchedRef.current.add(videoUrl);
    }, 100);
  }, []);
  
  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // For mobile touch - prefetch immediately on touch start
  const onTouchStart = useCallback((videoUrl: string | null | undefined) => {
    if (!videoUrl || prefetchedRef.current.has(videoUrl)) return;
    prefetchVideo(videoUrl);
    prefetchedRef.current.add(videoUrl);
  }, []);
  
  return { onMouseEnter, onMouseLeave, onTouchStart };
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
  const { onMouseEnter, onMouseLeave, onTouchStart } = useVideoPrefetch();
  
  return (
    <div 
      onMouseEnter={() => onMouseEnter(videoUrl)}
      onMouseLeave={onMouseLeave}
      onTouchStart={() => onTouchStart(videoUrl)}
      {...props}
    >
      {children}
    </div>
  );
};

export default useVideoPrefetch;
