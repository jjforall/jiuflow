-- Create notation category enum
CREATE TYPE public.notation_category AS ENUM (
  'position',
  'action', 
  'submission',
  'grip',
  'movement',
  'takedown',
  'outcome'
);

-- Create bjj_notations master table
CREATE TABLE public.bjj_notations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category notation_category NOT NULL,
  description TEXT,
  usage_example TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create technique_notations junction table
CREATE TABLE public.technique_notations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id UUID REFERENCES public.techniques(id) ON DELETE CASCADE NOT NULL,
  notation_id UUID REFERENCES public.bjj_notations(id) ON DELETE CASCADE NOT NULL,
  context TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(technique_id, notation_id, context)
);

-- Create indexes
CREATE INDEX idx_bjj_notations_category ON public.bjj_notations(category);
CREATE INDEX idx_bjj_notations_code ON public.bjj_notations(code);
CREATE INDEX idx_technique_notations_technique ON public.technique_notations(technique_id);
CREATE INDEX idx_technique_notations_notation ON public.technique_notations(notation_id);

-- Enable RLS
ALTER TABLE public.bjj_notations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technique_notations ENABLE ROW LEVEL SECURITY;

-- RLS policies for bjj_notations (read for all authenticated, write for admin)
CREATE POLICY "Anyone can view notations"
  ON public.bjj_notations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert notations"
  ON public.bjj_notations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notations"
  ON public.bjj_notations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notations"
  ON public.bjj_notations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for technique_notations
CREATE POLICY "Anyone can view technique_notations"
  ON public.technique_notations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert technique_notations"
  ON public.technique_notations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update technique_notations"
  ON public.technique_notations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete technique_notations"
  ON public.technique_notations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_bjj_notations_updated_at
  BEFORE UPDATE ON public.bjj_notations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data: Positions (23 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('CG', 'クローズドガード', 'Closed Guard', 'position', 1),
('HG', 'ハーフガード', 'Half Guard', 'position', 2),
('OG', 'オープンガード', 'Open Guard', 'position', 3),
('CB', 'コンバットベース', 'Combat Base', 'position', 4),
('DLR', 'デラヒーバ', 'De La Riva', 'position', 5),
('RDLR', 'リバースデラヒーバ', 'Reverse De La Riva', 'position', 6),
('BFG', 'バタフライガード', 'Butterfly Guard', 'position', 7),
('SLX', 'シングルレッグX', 'Single Leg X', 'position', 8),
('XG', 'Xガード', 'X Guard', 'position', 9),
('SG', 'スパイダーガード', 'Spider Guard', 'position', 10),
('LG', 'ラッソーガード', 'Lasso Guard', 'position', 11),
('SC', 'サイドコントロール', 'Side Control', 'position', 12),
('MT', 'マウント', 'Mount', 'position', 13),
('BC', 'バックコントロール', 'Back Control', 'position', 14),
('KOB', 'ニーオンベリー', 'Knee On Belly', 'position', 15),
('TT', 'タートル（亀）', 'Turtle', 'position', 16),
('DHG', 'ディープハーフ', 'Deep Half Guard', 'position', 17),
('ZG', 'Zガード', 'Z-Guard', 'position', 18),
('5050', 'フィフティフィフティ', '50/50', 'position', 19),
('RG', 'ラバーガード', 'Rubber Guard', 'position', 20),
('WG', 'ワームガード', 'Worm Guard', 'position', 21),
('SqG', 'スクウィッドガード', 'Squid Guard', 'position', 22),
('Don', 'ドンキーガード', 'Donkey Guard', 'position', 23);

-- Insert initial data: Actions (14 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('K', '崩し', 'Kuzushi', 'action', 1),
('B', 'ブレイク', 'Break', 'action', 2),
('P', 'パスガード', 'Pass', 'action', 3),
('SW', 'スイープ', 'Sweep', 'action', 4),
('ESC', 'エスケープ', 'Escape', 'action', 5),
('RET', 'リテンション', 'Retention', 'action', 6),
('TD', 'テイクダウン', 'Take Down', 'action', 7),
('Pull', '引き込み', 'Guard Pull', 'action', 8),
('BP', 'ブルファイターパス', 'Bullfighter Pass', 'action', 9),
('KP', 'ニーカットパス', 'Knee Pass', 'action', 10),
('SP', 'スマッシュパス', 'Smash Pass', 'action', 11),
('LP', 'ロングステップ', 'Long Step', 'action', 12),
('LgD', 'レッグドラッグ', 'Leg Drag', 'action', 13),
('OP', 'オーバーアンダーパス', 'Over Under Pass', 'action', 14);

-- Insert initial data: Submissions (24 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('AB', 'アームバー', 'Arm Bar', 'submission', 1),
('TC', 'トライアングル', 'Triangle Choke', 'submission', 2),
('RNC', 'リアネイキッドチョーク', 'Rear Naked Choke', 'submission', 3),
('GUI', 'ギロチン', 'Guillotine', 'submission', 4),
('KIM', 'キムラ', 'Kimura', 'submission', 5),
('AMI', 'アメリカーナ', 'Americana', 'submission', 6),
('OMO', 'オモプラータ', 'Omoplata', 'submission', 7),
('HH', 'ヒールフック', 'Heel Hook', 'submission', 8),
('KB', 'ニーバー', 'Knee Bar', 'submission', 9),
('TH', 'トーホールド', 'Toe Hold', 'submission', 10),
('EZ', 'エゼキエル', 'Ezekiel', 'submission', 11),
('CC', 'クロスチョーク', 'Cross Choke', 'submission', 12),
('DAR', 'ダースチョーク', 'D''Arce', 'submission', 13),
('ANA', 'アナコンダ', 'Anaconda', 'submission', 14),
('BA', 'ボウ＆アロー', 'Bow and Arrow', 'submission', 15),
('LC', 'ループチョーク', 'Loop Choke', 'submission', 16),
('Clk', 'クロックチョーク', 'Clock Choke', 'submission', 17),
('BB', 'ベースボールチョーク', 'Baseball Choke', 'submission', 18),
('WL', 'リストロック', 'Wrist Lock', 'submission', 19),
('SAL', 'ストレートフットロック', 'Straight Ankle Lock', 'submission', 20),
('IHH', 'インサイドヒール', 'Inside Heel Hook', 'submission', 21),
('OHH', 'アウトサイドヒール', 'Outside Heel Hook', 'submission', 22),
('CS', 'カーフスライサー', 'Calf Slicer', 'submission', 23),
('Est', 'エステマロック', 'Estima Lock', 'submission', 24);

-- Insert initial data: Grips (14 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('UH', 'アンダーフック', 'Under Hook', 'grip', 1),
('OH', 'オーバーフック', 'Over Hook', 'grip', 2),
('WZ', 'ウィザー', 'Whizzer', 'grip', 3),
('CF', 'クロスフェイス', 'Cross Face', 'grip', 4),
('KC', 'ネックコントロール', 'Neck Control', 'grip', 5),
('WrC', 'リストコントロール', 'Wrist Control', 'grip', 6),
('Slv', '袖', 'Sleeve', 'grip', 7),
('Clr', '襟', 'Collar', 'grip', 8),
('Pnt', 'ズボン', 'Pants', 'grip', 9),
('BlT', '帯', 'Belt', 'grip', 10),
('PG', 'ピストルグリップ', 'Pistol Grip', 'grip', 11),
('PkG', 'ポケットグリップ', 'Pocket Grip', 'grip', 12),
('GG', 'ガブルクラッチ', 'Gable Grip', 'grip', 13),
('SGS', 'Sグリップ', 'S-Grip', 'grip', 14);

-- Insert initial data: Movements (7 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('Ebi', 'エビ', 'Shrimp', 'movement', 1),
('Brg', 'ブリッジ', 'Bridge', 'movement', 2),
('Frm', 'フレーム', 'Frame', 'movement', 3),
('Pst', 'ポスト', 'Post', 'movement', 4),
('Scr', 'スクランブル', 'Scramble', 'movement', 5),
('Inv', 'インバート', 'Invert', 'movement', 6),
('Hip', 'ヒップスロー', 'Hip Throw', 'movement', 7);

-- Insert initial data: Takedowns (10 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('GP', 'ガードプル', 'Guard Pull', 'takedown', 1),
('DL', 'ダブルレッグ', 'Double Leg', 'takedown', 2),
('SL', 'シングルレッグ', 'Single Leg', 'takedown', 3),
('AL', 'アンクルピック', 'Ankle Pick', 'takedown', 4),
('OSG', '大外刈り', 'O-Soto Gari', 'takedown', 5),
('UCH', '内股', 'Uchimata', 'takedown', 6),
('SMG', '巴投げ', 'Sumi Gaeshi', 'takedown', 7),
('ST', '捨て身技', 'Sacrifice Throw', 'takedown', 8),
('AT', 'アームドラッグ', 'Arm Drag', 'takedown', 9),
('CT', 'カラータイ', 'Collar Tie', 'takedown', 10);

-- Insert initial data: Outcomes (6 items)
INSERT INTO public.bjj_notations (code, name_ja, name_en, category, display_order) VALUES
('Tap', 'タップアウト', 'Tap Out', 'outcome', 1),
('Sub', '一本勝ち', 'Submission Win', 'outcome', 2),
('Pts', 'ポイント', 'Points', 'outcome', 3),
('Adv', 'アドバンテージ', 'Advantage', 'outcome', 4),
('Pen', 'ペナルティ', 'Penalty', 'outcome', 5),
('DQ', '失格', 'Disqualified', 'outcome', 6);