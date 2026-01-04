// Shared helpers for Cloudflare Stream URLs and video resume keys

const STREAM_ID_PATTERNS: RegExp[] = [
  /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  /videodelivery\.net\/([a-zA-Z0-9]+)/,
  /iframe\.videodelivery\.net\/([a-zA-Z0-9]+)/,
  /customer-[a-z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
];

export const extractCloudflareStreamId = (videoUrl: string): string | null => {
  for (const pattern of STREAM_ID_PATTERNS) {
    const match = videoUrl.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const getCloudflareStreamThumbnail = (videoUrl: string, time = 1): string | null => {
  const id = extractCloudflareStreamId(videoUrl);
  if (!id) return null;
  return `https://videodelivery.net/${id}/thumbnails/thumbnail.jpg?time=${time}s&width=640&height=360`;
};

// Convert any Cloudflare Stream playback URL to the stable videodelivery.net HLS manifest URL
// (customer-*.cloudflarestream.com can vary by account/subdomain and may 404)
export const getCloudflareStreamHlsUrl = (videoUrl: string): string | null => {
  const id = extractCloudflareStreamId(videoUrl);
  if (id) return `https://videodelivery.net/${id}/manifest/video.m3u8`;
  if (videoUrl.includes('.m3u8')) return videoUrl;
  return null;
};

// sessionStorage key: use a stable identifier when possible (Stream ID), otherwise fallback to the URL itself.
export const getVideoProgressKey = (videoUrl: string): string => {
  const id = extractCloudflareStreamId(videoUrl);
  return id ? `video-progress:cf:${id}` : `video-progress:${videoUrl}`;
};
