-- Create video_transcriptions table for storing transcription data
CREATE TABLE public.video_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technique_id UUID REFERENCES public.techniques(id) ON DELETE CASCADE,
  user_video_id UUID REFERENCES public.user_videos(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'ja',
  original_text TEXT NOT NULL,
  edited_text TEXT,
  segments JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_video_reference CHECK (
    (technique_id IS NOT NULL AND user_video_id IS NULL) OR
    (technique_id IS NULL AND user_video_id IS NOT NULL)
  )
);

-- Create video_subtitles table for storing language-specific subtitles
CREATE TABLE public.video_subtitles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID NOT NULL REFERENCES public.video_transcriptions(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  subtitle_url TEXT,
  vtt_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transcription_id, language_code)
);

-- Enable RLS
ALTER TABLE public.video_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_subtitles ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_transcriptions
CREATE POLICY "Anyone can view transcriptions"
ON public.video_transcriptions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage transcriptions"
ON public.video_transcriptions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for video_subtitles
CREATE POLICY "Anyone can view subtitles"
ON public.video_subtitles
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subtitles"
ON public.video_subtitles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_video_transcriptions_technique ON public.video_transcriptions(technique_id);
CREATE INDEX idx_video_transcriptions_user_video ON public.video_transcriptions(user_video_id);
CREATE INDEX idx_video_subtitles_transcription ON public.video_subtitles(transcription_id);
CREATE INDEX idx_video_subtitles_language ON public.video_subtitles(language_code);

-- Trigger for updated_at
CREATE TRIGGER update_video_transcriptions_updated_at
BEFORE UPDATE ON public.video_transcriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_subtitles_updated_at
BEFORE UPDATE ON public.video_subtitles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();