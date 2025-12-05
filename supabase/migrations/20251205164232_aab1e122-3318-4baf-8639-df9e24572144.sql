-- Create community announcements table
CREATE TABLE public.community_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ja text,
  title_pt text,
  content text NOT NULL,
  content_ja text,
  content_pt text,
  author_email text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active announcements"
ON public.community_announcements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
ON public.community_announcements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial announcement
INSERT INTO public.community_announcements (
  title,
  title_ja,
  title_pt,
  content,
  content_ja,
  content_pt,
  author_email,
  is_active
) VALUES (
  'Open Mat Community Forum is Now Live!',
  'オープンマット コミュニティフォーラムがオープンしました！',
  'O Fórum da Comunidade Open Mat está no ar!',
  'Welcome to Open Mat! This is a space for BJJ practitioners to discuss techniques, share experiences, ask questions, and connect with the community. Feel free to start a thread or join existing discussions. OSS!',
  'オープンマットへようこそ！ここは柔術家がテクニックについて議論したり、経験を共有したり、質問をしたり、コミュニティとつながるための場所です。スレッドを立てたり、既存の議論に参加してください。押忍！',
  'Bem-vindo ao Open Mat! Este é um espaço para praticantes de BJJ discutirem técnicas, compartilharem experiências, fazerem perguntas e se conectarem com a comunidade. Sinta-se à vontade para criar um tópico ou participar das discussões existentes. OSS!',
  'mail@yukihamada.jp',
  true
);