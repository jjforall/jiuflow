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

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request to check table type
    const body = await req.json().catch(() => ({}));
    const tableType = body.table || 'techniques'; // Default to techniques

    console.log(`Starting migration for table: ${tableType}`);

    let results: { id: string; name: string; success: boolean; error?: string }[] = [];

    if (tableType === 'techniques') {
      // Get techniques with Supabase Storage URLs - process only 1 at a time to avoid memory limits
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, name_ja, video_url, video_url_ja, video_url_pt')
        .or('video_url.like.%supabase.co/storage%,video_url_ja.like.%supabase.co/storage%,video_url_pt.like.%supabase.co/storage%')
        .limit(1);

      if (fetchError) throw fetchError;

      if (!techniques || techniques.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No techniques to migrate', migrated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${techniques.length} technique to migrate`);

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

                // Use HLS manifest URL
                const playbackUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
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
          const playbackUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;

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