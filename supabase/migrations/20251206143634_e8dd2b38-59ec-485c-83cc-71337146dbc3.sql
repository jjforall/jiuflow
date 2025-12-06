-- コミュニティランク（デジタル帯）システム
CREATE TABLE public.community_ranks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_count integer NOT NULL DEFAULT 0,
  post_count integer NOT NULL DEFAULT 0,
  likes_received integer NOT NULL DEFAULT 0,
  rank_level text NOT NULL DEFAULT 'white',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLSを有効化
ALTER TABLE public.community_ranks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Anyone can view community ranks" 
ON public.community_ranks 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own rank" 
ON public.community_ranks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rank" 
ON public.community_ranks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 週間お題システム
CREATE TABLE public.weekly_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  title_ja text NOT NULL,
  title_pt text NOT NULL,
  description text,
  description_ja text,
  description_pt text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLSを有効化
ALTER TABLE public.weekly_topics ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Anyone can view weekly topics" 
ON public.weekly_topics 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage weekly topics" 
ON public.weekly_topics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- ランク自動計算用関数
CREATE OR REPLACE FUNCTION public.calculate_community_rank(
  thread_count integer,
  post_count integer,
  likes_received integer
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_score integer;
BEGIN
  -- スコア計算: スレッド作成=3pt, 投稿=1pt, いいね獲得=2pt
  total_score := (thread_count * 3) + (post_count * 1) + (likes_received * 2);
  
  -- ランク判定
  RETURN CASE
    WHEN total_score >= 500 THEN 'black'
    WHEN total_score >= 300 THEN 'brown'
    WHEN total_score >= 150 THEN 'purple'
    WHEN total_score >= 50 THEN 'blue'
    ELSE 'white'
  END;
END;
$$;

-- ランク更新トリガー関数
CREATE OR REPLACE FUNCTION public.update_community_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_ranks
  SET 
    rank_level = calculate_community_rank(thread_count, post_count, likes_received),
    updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN NEW;
END;
$$;

-- 新規ユーザー用ランク初期化関数
CREATE OR REPLACE FUNCTION public.initialize_community_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_ranks (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- プロフィール作成時にランクも初期化
CREATE TRIGGER on_profile_created_init_rank
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_community_rank();

-- スレッド作成時にカウント更新
CREATE OR REPLACE FUNCTION public.increment_thread_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_ranks (user_id, thread_count)
  VALUES (NEW.author_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    thread_count = community_ranks.thread_count + 1,
    rank_level = calculate_community_rank(community_ranks.thread_count + 1, community_ranks.post_count, community_ranks.likes_received),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_thread_created
  AFTER INSERT ON public.community_threads
  FOR EACH ROW EXECUTE FUNCTION public.increment_thread_count();

-- 投稿作成時にカウント更新
CREATE OR REPLACE FUNCTION public.increment_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_ranks (user_id, post_count)
  VALUES (NEW.author_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    post_count = community_ranks.post_count + 1,
    rank_level = calculate_community_rank(community_ranks.thread_count, community_ranks.post_count + 1, community_ranks.likes_received),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_created
  AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_count();

-- いいね受信時にカウント更新
CREATE OR REPLACE FUNCTION public.update_likes_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- スレッドまたは投稿の作者を特定
  IF NEW.thread_id IS NOT NULL THEN
    SELECT author_id INTO target_user_id FROM public.community_threads WHERE id = NEW.thread_id;
  ELSIF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO target_user_id FROM public.community_posts WHERE id = NEW.post_id;
  END IF;
  
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.community_ranks (user_id, likes_received)
    VALUES (target_user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      likes_received = community_ranks.likes_received + 1,
      rank_level = calculate_community_rank(community_ranks.thread_count, community_ranks.post_count, community_ranks.likes_received + 1),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reaction_created
  AFTER INSERT ON public.community_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_received();