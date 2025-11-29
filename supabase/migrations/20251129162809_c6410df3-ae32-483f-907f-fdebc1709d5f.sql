-- Delete duplicate referral codes, keeping only the oldest one for each user_id using created_at
DELETE FROM public.referral_codes
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM public.referral_codes
  ) t
  WHERE t.rn > 1
);

-- Now add the unique constraint on user_id
ALTER TABLE public.referral_codes
ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);