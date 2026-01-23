// Robust Cloudflare Stream download URL helper.
//
// Cloudflare Stream often returns a download URL whose file is still being prepared.
// This helper enables downloads, polls until ready, and falls back to preview/HLS-derived URLs.

type DownloadInfo = {
  url?: string;
  status?: string;
  percentComplete?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function probeUrl(url: string): Promise<boolean> {
  try {
    // Cheap probe: request first bytes (works even for large files)
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-1",
      },
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

async function waitForDownloadReady(
  videoId: string,
  accountId: string,
  apiToken: string,
  fallbackUrl: string,
): Promise<string> {
  const maxWaitMs = 5 * 60 * 1000;
  const pollIntervalMs = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(pollIntervalMs);
    try {
      const statusRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        },
      );

      const statusJson = await statusRes.json().catch(() => null);
      const info: DownloadInfo | undefined = statusJson?.result?.default;
      if (!statusJson?.success || !info) continue;

      const percent = info.percentComplete ?? 0;
      const status = info.status ?? "unknown";
      const url = info.url || fallbackUrl;
      console.log(`[CLOUDFLARE-DOWNLOAD] progress=${percent}% status=${status}`);

      if (status === "ready" || percent >= 100) {
        // Sometimes it reports ready slightly before the asset is actually available.
        if (await probeUrl(url)) return url;
        await sleep(2000);
        if (await probeUrl(url)) return url;
      }
    } catch (e) {
      console.log("[CLOUDFLARE-DOWNLOAD] status poll error:", e);
    }
  }

  console.log("[CLOUDFLARE-DOWNLOAD] timeout waiting; returning fallback URL");
  return fallbackUrl;
}

export async function getCloudflareStreamDownloadUrl(opts: {
  videoId: string;
  accountId: string;
  apiToken: string;
}): Promise<string> {
  const { videoId, accountId, apiToken } = opts;
  console.log("[CLOUDFLARE-DOWNLOAD] getCloudflareStreamDownloadUrl", { videoId });

  // 1) Enable downloads (idempotent) and parse response
  try {
    const enableRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const enableJson = await enableRes.json().catch(() => null);
    console.log("[CLOUDFLARE-DOWNLOAD] enable response:", JSON.stringify(enableJson));

    const info: DownloadInfo | undefined = enableJson?.result?.default;
    if (enableJson?.success && info?.url) {
      const url = info.url;
      const status = info.status;
      if (status === "ready") return url;
      if (status === "inprogress") return await waitForDownloadReady(videoId, accountId, apiToken, url);

      // Unknown status: probe and then fallback to polling
      if (await probeUrl(url)) return url;
      return await waitForDownloadReady(videoId, accountId, apiToken, url);
    }
  } catch (e) {
    console.log("[CLOUDFLARE-DOWNLOAD] enable downloads error:", e);
  }

  // 2) Check existing download status
  try {
    const statusRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      },
    );

    const statusJson = await statusRes.json().catch(() => null);
    console.log("[CLOUDFLARE-DOWNLOAD] status response:", JSON.stringify(statusJson));

    const info: DownloadInfo | undefined = statusJson?.result?.default;
    if (statusJson?.success && info?.url) {
      if (info.status === "ready") return info.url;
      if (info.status === "inprogress") return await waitForDownloadReady(videoId, accountId, apiToken, info.url);
      if (await probeUrl(info.url)) return info.url;
      return await waitForDownloadReady(videoId, accountId, apiToken, info.url);
    }
  } catch (e) {
    console.log("[CLOUDFLARE-DOWNLOAD] download status check error:", e);
  }

  // 3) Fallback to details (preview / HLS-derived)
  try {
    const detailsRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      },
    );
    const detailsJson = await detailsRes.json().catch(() => null);
    console.log("[CLOUDFLARE-DOWNLOAD] details response:", JSON.stringify(detailsJson));

    const video = detailsJson?.result;
    if (detailsJson?.success && video) {
      if (video?.downloads?.default?.url && await probeUrl(video.downloads.default.url)) {
        return video.downloads.default.url;
      }

      if (video?.preview && await probeUrl(video.preview)) {
        return video.preview;
      }

      if (video?.playback?.hls) {
        const mp4Url = String(video.playback.hls).replace(/\/manifest\/video\.m3u8$/i, "/downloads/default.mp4");
        if (await probeUrl(mp4Url)) return mp4Url;
      }
    }
  } catch (e) {
    console.log("[CLOUDFLARE-DOWNLOAD] details fallback error:", e);
  }

  // 4) Last resort
  return `https://videodelivery.net/${videoId}/downloads/default.mp4`;
}
