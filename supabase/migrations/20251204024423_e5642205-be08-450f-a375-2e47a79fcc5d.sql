-- Create community categories table
CREATE TABLE public.community_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  description TEXT,
  description_ja TEXT,
  description_pt TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community threads table
CREATE TABLE public.community_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.community_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community posts (replies) table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.community_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories" ON public.community_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.community_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for threads
CREATE POLICY "Anyone can view threads" ON public.community_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON public.community_threads FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their threads" ON public.community_threads FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete threads" ON public.community_threads FOR DELETE USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their posts" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and admins can delete posts" ON public.community_posts FOR DELETE USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_community_threads_category ON public.community_threads(category_id);
CREATE INDEX idx_community_threads_author ON public.community_threads(author_id);
CREATE INDEX idx_community_posts_thread ON public.community_posts(thread_id);
CREATE INDEX idx_community_posts_author ON public.community_posts(author_id);

-- Insert initial categories
INSERT INTO public.community_categories (name, name_ja, name_pt, description, description_ja, description_pt, icon, sort_order) VALUES
('Start Here', 'はじめに', 'Comece Aqui', 'Community guide and profile registration', 'コミュニティの歩き方とプロフィール登録', 'Guia da comunidade e registro de perfil', 'BookOpen', 1),
('Classroom', '動画カリキュラム', 'Sala de Aula', 'Video curriculum and technique discussions', '動画を体系的に学び、議論する場所', 'Currículo de vídeos e discussões técnicas', 'GraduationCap', 2),
('General Discussion', '総合雑談', 'Discussão Geral', 'General chat about BJJ and life', '柔術と日常についての雑談', 'Bate-papo geral sobre BJJ e vida', 'MessageCircle', 3),
('Wins & Progress', '成果報告', 'Vitórias e Progresso', 'Share your achievements and progress', '達成したことや進捗を共有しよう', 'Compartilhe suas conquistas e progresso', 'Trophy', 4),
('Q&A', '質問コーナー', 'Perguntas e Respostas', 'Ask questions and get answers', '質問して回答をもらおう', 'Faça perguntas e obtenha respostas', 'HelpCircle', 5),
('Events', 'イベント', 'Eventos', 'Live streams, meetups, and event info', 'ライブ配信、オフ会、イベント情報', 'Lives, encontros e informações de eventos', 'Calendar', 6);