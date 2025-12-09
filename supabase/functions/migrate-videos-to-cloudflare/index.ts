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

    // Use service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get videos that are still on Supabase Storage
    const { data: videos, error: fetchError } = await supabase
      .from('user_videos')
      .select('id, video_url, title')
      .like('video_url', '%supabase.co/storage%')
      .limit(10); // Process in batches

    if (fetchError) {
      throw fetchError;
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No videos to migrate', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${videos.length} videos to migrate`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const video of videos) {
      try {
        console.log(`Migrating video: ${video.id} - ${video.title}`);

        // Upload video to Cloudflare Stream using URL fetch
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
              meta: {
                name: video.title || 'Untitled',
                original_id: video.id,
              },
            }),
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Cloudflare upload failed: ${errorText}`);
        }

        const uploadData = await uploadResponse.json();
        const videoUid = uploadData.result.uid;

        console.log(`Video uploaded to Cloudflare with UID: ${videoUid}`);

        // Poll for processing completion (max 60 seconds)
        let attempts = 0;
        let isReady = false;
        let playbackUrl = '';

        while (attempts < 30 && !isReady) {
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
            const status = statusData.result?.status?.state;
            
            if (status === 'ready') {
              isReady = true;
              playbackUrl = statusData.result?.playback?.hls || 
                           `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
            } else if (status === 'error') {
              throw new Error('Video processing failed on Cloudflare');
            }
          }
          
          attempts++;
        }

        if (!isReady) {
          // Even if not ready, we can still use the URL - it will work once processing completes
          playbackUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
        }

        // Update database with new URL
        const { error: updateError } = await supabase
          .from('user_videos')
          .update({ video_url: playbackUrl })
          .eq('id', video.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Successfully migrated video ${video.id}`);
        results.push({ id: video.id, success: true });

      } catch (videoError) {
        console.error(`Failed to migrate video ${video.id}:`, videoError);
        results.push({ 
          id: video.id, 
          success: false, 
          error: videoError instanceof Error ? videoError.message : 'Unknown error' 
        });
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
