-- Add additional venue fields
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS parking_info text,
ADD COLUMN IF NOT EXISTS parking_info_ja text,
ADD COLUMN IF NOT EXISTS nearest_station text,
ADD COLUMN IF NOT EXISTS nearest_station_ja text,
ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mat_area_sqm integer,
ADD COLUMN IF NOT EXISTS spectator_capacity integer,
ADD COLUMN IF NOT EXISTS rental_cost text,
ADD COLUMN IF NOT EXISTS rental_cost_ja text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS notes_ja text;

-- Add comments for clarity
COMMENT ON COLUMN public.venues.phone IS '電話番号';
COMMENT ON COLUMN public.venues.email IS 'メールアドレス';
COMMENT ON COLUMN public.venues.parking_info IS '駐車場情報（英語）';
COMMENT ON COLUMN public.venues.parking_info_ja IS '駐車場情報（日本語）';
COMMENT ON COLUMN public.venues.nearest_station IS '最寄り駅（英語）';
COMMENT ON COLUMN public.venues.nearest_station_ja IS '最寄り駅（日本語）';
COMMENT ON COLUMN public.venues.facilities IS '設備情報（JSON配列: 更衣室、シャワー、空調など）';
COMMENT ON COLUMN public.venues.mat_area_sqm IS 'マットエリア面積（平米）';
COMMENT ON COLUMN public.venues.spectator_capacity IS '観客席数';
COMMENT ON COLUMN public.venues.rental_cost IS 'レンタル料金（英語）';
COMMENT ON COLUMN public.venues.rental_cost_ja IS 'レンタル料金（日本語）';
COMMENT ON COLUMN public.venues.notes IS '備考（英語）';
COMMENT ON COLUMN public.venues.notes_ja IS '備考（日本語）';