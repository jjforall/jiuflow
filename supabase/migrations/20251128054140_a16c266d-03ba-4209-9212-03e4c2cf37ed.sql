-- Create trigger to automatically create referral codes for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_code_for_user();

-- Create referral codes for existing users who don't have them
INSERT INTO public.referral_codes (user_id, code)
SELECT p.id, public.generate_referral_code()
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON p.id = rc.user_id
WHERE rc.id IS NULL;

-- Initialize user_points for users who don't have them
INSERT INTO public.user_points (user_id, points)
SELECT p.id, 0
FROM public.profiles p
LEFT JOIN public.user_points up ON p.id = up.user_id
WHERE up.id IS NULL;