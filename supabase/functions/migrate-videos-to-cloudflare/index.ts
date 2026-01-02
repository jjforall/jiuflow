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

    // Cloudflare credentials are only required for actions that call Cloudflare APIs.
    // For 'repair-broken' we only normalize playback URLs and don't need Cloudflare access.

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request to check table type
    const body = await req.json().catch(() => ({}));
    const tableType = body.table || 'techniques'; // Default to techniques
    const action = body.action || 'migrate'; // 'migrate', 'repair-broken', or 'fix-thumbnails'

    console.log(`Starting ${action} for table: ${tableType}`);

    const needsCloudflareApi = action !== 'repair-broken' && action !== 'fix-thumbnails';
    if (needsCloudflareApi && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN)) {
      throw new Error('Cloudflare credentials not configured');
    }

    let results: { id: string; name: string; success: boolean; error?: string; newUrl?: string }[] = [];

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
      // Get all techniques with Supabase Storage URLs
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, name_ja, video_url, video_url_ja, video_url_pt')
        .or('video_url.like.%supabase.co/storage%,video_url_ja.like.%supabase.co/storage%,video_url_pt.like.%supabase.co/storage%');

      if (fetchError) throw fetchError;

      if (!techniques || techniques.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No techniques to migrate', migrated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${techniques.length} techniques to migrate`);

      for (const technique of techniques) {
        try {
          console.log(`Migrating technique: ${technique.id} - ${technique.name_ja}`);

          const updates: Record<string, string> = {};
          const urlFields = ['video_url', 'video_url_ja', 'video_url_pt'] as const;

          for (const field of urlFields) {
            const url = technique[field];
            if (url && url.includes('supabase.co/storage')) {
              console.log(`Migrating ${field}: ${url}`);

              try {
                // Helper function to encode UTF-8 strings to Base64
                const encodeBase64 = (str: string) => {
                  const encoder = new TextEncoder();
                  const bytes = encoder.encode(str);
                  let binary = '';
                  for (const byte of bytes) {
                    binary += String.fromCharCode(byte);
                  }
                  return btoa(binary);
                };

                // Use Cloudflare Stream's URL copy feature - no memory needed!
                // This tells Cloudflare to fetch the video directly from the URL
                const videoName = `${technique.name_ja || technique.id} (${field})`;
                
                const copyResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: url,
                      meta: { 
                        name: videoName,
                        original_id: technique.id,
                        field: field 
                      },
                    }),
                  }
                );

                if (!copyResponse.ok) {
                  const errorText = await copyResponse.text();
                  console.error(`Cloudflare copy failed for ${field}:`, errorText);
                  continue;
                }

                const copyData = await copyResponse.json();
                const videoUid = copyData.result.uid;
                console.log(`Cloudflare is copying video, UID: ${videoUid}`);

                // Wait for video to be ready and get the correct playback URL
                let playbackUrl = '';
                let attempts = 0;
                const maxAttempts = 30; // Wait up to 60 seconds
                
                while (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  const statusResponse = await fetch(
                    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
                      },
                    }
                  );
                  
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    if (statusData.result?.playback?.hls) {
                      playbackUrl = statusData.result.playback.hls;
                      console.log(`Got correct playback URL: ${playbackUrl}`);
                      break;
                    }
                    if (statusData.result?.readyToStream) {
                      // Fallback to constructing URL with the correct subdomain format
                      playbackUrl = `https://videodelivery.net/${videoUid}/manifest/video.m3u8`;
                      console.log(`Using videodelivery.net URL: ${playbackUrl}`);
                      break;
                    }
                  }
                  attempts++;
                }
                
                if (!playbackUrl) {
                  // Final fallback - use videodelivery.net which always works
                  playbackUrl = `https://videodelivery.net/${videoUid}/manifest/video.m3u8`;
                  console.log(`Timeout - using fallback URL: ${playbackUrl}`);
                }
                
                updates[field] = playbackUrl;
              } catch (fieldError) {
                console.error(`Error processing ${field}:`, fieldError);
                continue;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('techniques')
              .update(updates)
              .eq('id', technique.id);

            if (updateError) throw updateError;
            console.log(`Successfully migrated technique ${technique.id}`);
            results.push({ id: technique.id, name: technique.name_ja, success: true });
          } else {
            results.push({ 
              id: technique.id, 
              name: technique.name_ja,
              success: false, 
              error: 'No fields were migrated' 
            });
          }

        } catch (techError) {
          console.error(`Failed to migrate technique ${technique.id}:`, techError);
          results.push({ 
            id: technique.id, 
            name: technique.name_ja,
            success: false, 
            error: techError instanceof Error ? techError.message : 'Unknown error' 
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Migration complete: ${migrated} migrated, ${failed} failed`,
        migrated,
        failed,
        results 
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