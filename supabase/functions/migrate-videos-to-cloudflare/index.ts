import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Cloudflare credentials are only required for actions that call Cloudflare APIs.
    // For 'repair-broken' we only normalize playback URLs and don't need Cloudflare access.

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Authorization / Admin guard (important: this function uses service role) ---
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'staff']);

    if (roleError) throw roleError;
    if (!roles || roles.length === 0) {
      throw new Error('Admin access required');
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const tableType = body.table || 'techniques'; // Default to techniques
    const action = body.action || 'migrate'; // 'migrate' | 'link-existing' | 'repair-broken' | 'fix-thumbnails'

    console.log(`Starting ${action} for table: ${tableType}`);

    const diagnostics: Record<string, unknown> = { action, tableType };

    const needsCloudflareApi = action !== 'repair-broken' && action !== 'fix-thumbnails';
    const cloudflareAuthHeader = CLOUDFLARE_STREAM_API_TOKEN
      ? { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` }
      : null;

    if (needsCloudflareApi && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN)) {
      throw new Error('Cloudflare credentials not configured');
    }

    const safeJson = async (res: Response) => {
      try {
        return await res.clone().json();
      } catch {
        return null;
      }
    };

    const safeText = async (res: Response) => {
      try {
        return await res.clone().text();
      } catch {
        return null;
      }
    };

    const cloudflareFetch = async (path: string, init?: RequestInit) => {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}${path}`,
        {
          ...init,
          headers: {
            ...(cloudflareAuthHeader ?? {}),
            ...(init?.headers ?? {}),
          },
        }
      );

      const json = await safeJson(res);

      if (!res.ok || (json && (json as any).success === false)) {
        const message =
          (json as any)?.errors?.[0]?.message ||
          (json as any)?.messages?.[0]?.message ||
          (typeof (json as any)?.error === 'string' ? (json as any).error : null) ||
          (await safeText(res)) ||
          'Unknown Cloudflare error';

        throw new Error(`Cloudflare API error (${res.status}): ${message}`);
      }

      return { res, json };
    };

    const extractFileNameFromSupabaseUrl = (url: string): string | null => {
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        return last ? decodeURIComponent(last) : null;
      } catch {
        const last = url.split('?')[0].split('/').pop();
        return last ? decodeURIComponent(last) : null;
      }
    };

    const extractCloudflareUid = (url: string): string | null => {
      const m =
        url.match(/cloudflarestream\.com\/([a-f0-9]{32})/i) ||
        url.match(/videodelivery\.net\/([a-f0-9]{32})/i) ||
        url.match(/iframe\.videodelivery\.net\/([a-f0-9]{32})/i);
      return m?.[1] ?? null;
    };

    const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

    const findExistingCloudflareVideoUid = async (searchTerms: string[]) => {
      for (const raw of uniq(searchTerms)) {
        const term = (raw ?? '').trim();
        if (!term || term.length < 3) continue;

        const { json } = await cloudflareFetch(`/stream?search=${encodeURIComponent(term)}&limit=50`);
        const candidates = Array.isArray((json as any)?.result) ? (json as any).result : [];
        if (candidates.length === 0) continue;

        const lower = term.toLowerCase();
        const scored = candidates
          .map((v: any) => {
            const name = String(v?.meta?.name ?? '').toLowerCase();
            const score = name === lower ? 3 : name.includes(lower) ? 2 : 1;
            return { v, score };
          })
          .sort((a: any, b: any) => b.score - a.score);

        const best = scored[0]?.v;
        if (best?.uid) {
          return { uid: best.uid as string, matchedTerm: term, matchCount: candidates.length };
        }
      }

      return { uid: null as string | null };
    };

    if (needsCloudflareApi) {
      // Quick probe to surface 401/403/account mismatch immediately
      const { json } = await cloudflareFetch('/stream?include_counts=true&limit=1');
      diagnostics.cloudflare = {
        ok: true,
        total_count: (json as any)?.result_info?.total_count ?? (json as any)?.total ?? null,
      };

      // Cross-check: can this account access an already-linked video ID from DB?
      const { data: sampleRows } = await supabase
        .from('techniques')
        .select('id, video_url')
        .not('video_url', 'is', null)
        .or('video_url.ilike.%cloudflarestream.com%,video_url.ilike.%videodelivery.net%')
        .limit(1);

      const sampleUrl = sampleRows?.[0]?.video_url as string | undefined;
      const sampleUid = sampleUrl ? extractCloudflareUid(sampleUrl) : null;

      if (sampleUid) {
        try {
          await cloudflareFetch(`/stream/${sampleUid}`);
          diagnostics.cloudflare_sample_video = { ok: true };
        } catch (e) {
          diagnostics.cloudflare_sample_video = {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      } else {
        diagnostics.cloudflare_sample_video = { ok: null, note: 'No Cloudflare URL found in DB to cross-check' };
      }
    }

    let results: any[] = [];

    // Repair broken videos (404) from video_metadata backup
    if (action === 'repair-broken') {
      // Get techniques with broken Cloudflare URLs (customer-46bf2542468db352a9741f14b84d2744)
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, name_ja, video_url, video_url_ja, video_url_pt, video_metadata')
        .or('video_url.like.%customer-46bf2542468db352a9741f14b84d2744%,video_url_ja.like.%customer-46bf2542468db352a9741f14b84d2744%');

      if (fetchError) throw fetchError;

      if (!techniques || techniques.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No broken videos found', repaired: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${techniques.length} techniques with broken URLs to repair`);

      for (const technique of techniques) {
        try {
          console.log(`Repairing technique: ${technique.id} - ${technique.name_ja}`);
          
          const metadata = technique.video_metadata as Record<string, { video_url?: string }> | null;
          const updates: Record<string, string> = {};
          
          // Check each language field
          const fieldMap = {
            video_url_ja: 'ja',
            video_url: 'en',
            video_url_pt: 'pt'
          } as const;

          for (const [dbField, metaKey] of Object.entries(fieldMap)) {
            const currentUrl = technique[dbField as keyof typeof technique] as string | null;
            
            // Only repair if URL is broken (contains the bad customer subdomain)
            if (currentUrl && currentUrl.includes('customer-46bf2542468db352a9741f14b84d2744')) {
              // Best fix: normalize to videodelivery.net (works even if customer subdomain 404s)
              const match = currentUrl.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)\//);
              const videoId = match?.[1];

              if (videoId) {
                const normalizedUrl = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
                updates[dbField] = normalizedUrl;
                console.log(`Normalized ${dbField}: ${currentUrl} -> ${normalizedUrl}`);
                continue;
              }

              // Fallback: use backup URL from video_metadata (usually Supabase Storage)
              const backupUrl = metadata?.[metaKey]?.video_url;
              if (backupUrl && backupUrl.includes('supabase.co/storage')) {
                updates[dbField] = backupUrl;
                console.log(`Fallback to backup for ${dbField}: ${backupUrl}`);
              } else {
                console.log(`No usable videoId or backup found for ${dbField}`);
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('techniques')
              .update(updates)
              .eq('id', technique.id);

            if (updateError) throw updateError;
            console.log(`Successfully repaired technique ${technique.id}:`, updates);
            results.push({ id: technique.id, name: technique.name_ja, success: true, newUrl: Object.values(updates)[0] });
          } else {
            results.push({ 
              id: technique.id, 
              name: technique.name_ja,
              success: false, 
              error: 'No backup URLs found in video_metadata' 
            });
          }

        } catch (techError) {
          console.error(`Failed to repair technique ${technique.id}:`, techError);
          results.push({ 
            id: technique.id, 
            name: technique.name_ja,
            success: false, 
            error: techError instanceof Error ? techError.message : 'Unknown error' 
          });
        }
      }

      const repaired = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Repair complete: ${repaired} repaired, ${failed} failed`,
          repaired,
          failed,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fix missing thumbnails by extracting Cloudflare video ID from video_url and generating thumbnail URL
    if (action === 'fix-thumbnails') {
      // Get techniques with missing thumbnails but valid video URLs
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, name_ja, video_url, video_url_ja, thumbnail_url, thumbnail_url_ja')
        .is('thumbnail_url', null)
        .not('video_url', 'is', null);

      if (fetchError) throw fetchError;

      if (!techniques || techniques.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No techniques with missing thumbnails found', fixed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${techniques.length} techniques with missing thumbnails`);

      // Helper to extract Cloudflare video ID
      const extractVideoId = (url: string): string | null => {
        const patterns = [
          /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
          /videodelivery\.net\/([a-zA-Z0-9]+)/,
        ];
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      };

      for (const technique of techniques) {
        try {
          const videoUrl = technique.video_url_ja || technique.video_url;
          if (!videoUrl) {
            results.push({ 
              id: technique.id, 
              name: technique.name_ja, 
              success: false, 
              error: 'No video URL' 
            });
            continue;
          }

          const videoId = extractVideoId(videoUrl);
          if (!videoId) {
            results.push({ 
              id: technique.id, 
              name: technique.name_ja, 
              success: false, 
              error: 'Could not extract video ID from URL' 
            });
            continue;
          }

          // Generate Cloudflare Stream thumbnail URL
          const thumbnailUrl = `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?time=5s&width=640&height=360`;
          
          // Update the database
          const { error: updateError } = await supabase
            .from('techniques')
            .update({ 
              thumbnail_url: thumbnailUrl,
              thumbnail_url_ja: thumbnailUrl
            })
            .eq('id', technique.id);

          if (updateError) throw updateError;
          
          console.log(`Fixed thumbnail for ${technique.id}: ${thumbnailUrl}`);
          results.push({ 
            id: technique.id, 
            name: technique.name_ja, 
            success: true, 
            newUrl: thumbnailUrl 
          });

        } catch (techError) {
          console.error(`Failed to fix thumbnail for ${technique.id}:`, techError);
          results.push({ 
            id: technique.id, 
            name: technique.name_ja, 
            success: false, 
            error: techError instanceof Error ? techError.message : 'Unknown error' 
          });
        }
      }

      const fixed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Thumbnail fix complete: ${fixed} fixed, ${failed} failed`,
          fixed,
          failed,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tableType === 'techniques') {
      const linkOnly = action === 'link-existing';

      // Get all techniques with Supabase Storage URLs
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, name_ja, video_url, video_url_ja, video_url_pt')
        .or('video_url.like.%supabase.co/storage%,video_url_ja.like.%supabase.co/storage%,video_url_pt.like.%supabase.co/storage%');

      if (fetchError) throw fetchError;

      if (!techniques || techniques.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            action,
            message: 'No techniques to migrate',
            migrated: 0,
            diagnostics,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${techniques.length} techniques to ${linkOnly ? 'link' : 'migrate'}`);

      const urlFields = ['video_url', 'video_url_ja', 'video_url_pt'] as const;

      for (const technique of techniques) {
        const techniqueName = technique.name_ja || technique.id;
        const details: any[] = [];
        const updates: Record<string, string> = {};

        try {
          for (const field of urlFields) {
            const url = technique[field];
            if (!url || !url.includes('supabase.co/storage')) continue;

            const fileName = extractFileNameFromSupabaseUrl(url);
            const searchTerms = uniq(
              [fileName, techniqueName, `${techniqueName} (${field})`, technique.id].filter(
                (v): v is string => typeof v === 'string' && v.trim().length > 0
              )
            );

            // 1) Try to link existing Cloudflare Stream video by searching the Stream library
            try {
              const linked = await findExistingCloudflareVideoUid(searchTerms);

              if (linked.uid) {
                const playbackUrl = `https://videodelivery.net/${linked.uid}/manifest/video.m3u8`;
                updates[field] = playbackUrl;

                details.push({
                  field,
                  method: 'linked',
                  originalUrl: url,
                  fileName,
                  searched: searchTerms,
                  matchedTerm: (linked as any).matchedTerm,
                  matchCount: (linked as any).matchCount,
                  cloudflareUid: linked.uid,
                  newUrl: playbackUrl,
                });

                continue;
              }

              details.push({
                field,
                method: 'not-found',
                originalUrl: url,
                fileName,
                searched: searchTerms,
              });

              // 2) If link-only mode, do not attempt URL-copy upload
              if (linkOnly) continue;
            } catch (e) {
              details.push({
                field,
                method: 'cloudflare-search-error',
                originalUrl: url,
                fileName,
                searched: searchTerms,
                error: e instanceof Error ? e.message : String(e),
              });
              break;
            }

            // 3) Fallback: Cloudflare Stream URL-copy upload (requires Stream:Edit)
            const videoName = `${techniqueName} (${field})`;
            const copyResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url,
                  meta: {
                    name: videoName,
                    original_id: technique.id,
                    field,
                    source_filename: fileName,
                  },
                }),
              }
            );

            if (!copyResponse.ok) {
              const errorText = (await safeText(copyResponse)) || 'Unknown error';
              details.push({
                field,
                method: 'copy-failed',
                originalUrl: url,
                status: copyResponse.status,
                error: errorText,
              });
              continue;
            }

            const copyData = await copyResponse.json();
            const videoUid = copyData?.result?.uid as string | undefined;

            if (!videoUid) {
              details.push({ field, method: 'copy-no-uid', originalUrl: url });
              continue;
            }

            const playbackUrl = `https://videodelivery.net/${videoUid}/manifest/video.m3u8`;
            updates[field] = playbackUrl;

            details.push({
              field,
              method: 'copied',
              originalUrl: url,
              cloudflareUid: videoUid,
              newUrl: playbackUrl,
            });
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('techniques')
              .update(updates)
              .eq('id', technique.id);

            if (updateError) throw updateError;

            results.push({
              id: technique.id,
              name: techniqueName,
              success: true,
              updates,
              details,
            });
          } else {
            results.push({
              id: technique.id,
              name: techniqueName,
              success: false,
              error: linkOnly ? 'No matching Cloudflare video found' : 'No fields were migrated',
              details,
            });
          }
        } catch (techError) {
          results.push({
            id: technique.id,
            name: techniqueName,
            success: false,
            error: techError instanceof Error ? techError.message : 'Unknown error',
            details,
          });
        }
      }
    } else if (tableType === 'user_videos') {
      // Original user_videos migration logic
      const { data: videos, error: fetchError } = await supabase
        .from('user_videos')
        .select('id, video_url, title')
        .like('video_url', '%supabase.co/storage%')
        .limit(10);

      if (fetchError) throw fetchError;

      if (!videos || videos.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No user videos to migrate', migrated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const video of videos) {
        try {
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: video.video_url,
                meta: { name: video.title || 'Untitled', original_id: video.id },
              }),
            }
          );

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Cloudflare upload failed: ${errorText}`);
          }

          const uploadData = await uploadResponse.json();
          const videoUid = uploadData.result.uid;
          
          // Wait for playback URL from API response or use videodelivery.net
          let playbackUrl = uploadData.result.playback?.hls;
          if (!playbackUrl) {
            playbackUrl = `https://videodelivery.net/${videoUid}/manifest/video.m3u8`;
          }

          await supabase
            .from('user_videos')
            .update({ video_url: playbackUrl })
            .eq('id', video.id);

          results.push({ id: video.id, name: video.title, success: true });
        } catch (videoError) {
          results.push({ 
            id: video.id, 
            name: video.title,
            success: false, 
            error: videoError instanceof Error ? videoError.message : 'Unknown error' 
          });
        }
      }
    }

    const migrated = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const summaryLabel = action === 'link-existing' ? 'Link complete' : 'Migration complete';

    return new Response(
      JSON.stringify({
        success: true,
        action,
        message: `${summaryLabel}: ${migrated} updated, ${failed} failed`,
        migrated,
        failed,
        diagnostics,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});