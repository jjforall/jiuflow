-- SECURITY INVOKER を設定（クエリユーザーの権限でRLSを適用）
ALTER VIEW public_profiles SET (security_invoker = on);