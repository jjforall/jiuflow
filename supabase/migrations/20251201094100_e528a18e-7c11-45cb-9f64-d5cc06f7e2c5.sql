-- 練習記録テーブルの作成
CREATE TABLE public.practice_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technique_id UUID REFERENCES public.techniques(id) ON DELETE SET NULL,
  user_video_id UUID REFERENCES public.user_videos(id) ON DELETE SET NULL,
  practice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.practice_records ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の記録のみ閲覧可能
CREATE POLICY "Users can view their own practice records"
  ON public.practice_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の記録を作成可能
CREATE POLICY "Users can create their own practice records"
  ON public.practice_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の記録を更新可能
CREATE POLICY "Users can update their own practice records"
  ON public.practice_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分の記録を削除可能
CREATE POLICY "Users can delete their own practice records"
  ON public.practice_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- 管理者はすべての記録を閲覧可能
CREATE POLICY "Admins can view all practice records"
  ON public.practice_records
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_atの自動更新トリガー
CREATE TRIGGER update_practice_records_updated_at
  BEFORE UPDATE ON public.practice_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- インデックスの作成
CREATE INDEX idx_practice_records_user_id ON public.practice_records(user_id);
CREATE INDEX idx_practice_records_practice_date ON public.practice_records(practice_date DESC);
CREATE INDEX idx_practice_records_technique_id ON public.practice_records(technique_id);
CREATE INDEX idx_practice_records_user_video_id ON public.practice_records(user_video_id);