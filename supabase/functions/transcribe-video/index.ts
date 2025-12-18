import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { videoUrl, techniqueId, userVideoId } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }
    
    if (!techniqueId && !userVideoId) {
      throw new Error('Either techniqueId or userVideoId is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Downloading video from:', videoUrl);
    
    // Download video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    
    const videoBlob = await videoResponse.blob();
    console.log('Video downloaded, size:', videoBlob.size);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', videoBlob, 'video.mp4');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    
    console.log('Sending to Whisper API...');
    
    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }
    
    const transcriptionResult = await whisperResponse.json();
    console.log('Transcription completed:', transcriptionResult.text?.substring(0, 100));
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Store transcription in database
    const { data: transcription, error: insertError } = await supabase
      .from('video_transcriptions')
      .insert({
        technique_id: techniqueId || null,
        user_video_id: userVideoId || null,
        language_code: 'ja',
        original_text: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        status: 'completed',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save transcription: ${insertError.message}`);
    }
    
    console.log('Transcription saved with ID:', transcription.id);
    
    // Generate VTT subtitle content
    const vttContent = generateVTT(transcriptionResult.segments || []);
    
    // Store Japanese subtitle
    const { error: subtitleError } = await supabase
      .from('video_subtitles')
      .insert({
        transcription_id: transcription.id,
        language_code: 'ja',
        vtt_content: vttContent,
        status: 'completed',
      });
    
    if (subtitleError) {
      console.error('Subtitle insert error:', subtitleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: {
          id: transcription.id,
          text: transcriptionResult.text,
          segments: transcriptionResult.segments,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateVTT(segments: any[]): string {
  let vtt = 'WEBVTT\n\n';
  
  segments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.start);
    const endTime = formatVTTTime(segment.end);
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${segment.text.trim()}\n\n`;
  });
  
  return vtt;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
