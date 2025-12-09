-- 1. user_billing: ユーザーからのアクセスを完全に禁止
-- ユーザーがStripe Customer IDを見る必要はない（Edge Functionが処理）
DROP POLICY IF EXISTS "Users can view own billing only" ON user_billing;
DROP POLICY IF EXISTS "Deny anonymous access to user_billing" ON user_billing;

-- サービスロールのみがアクセス可能（RLSはサービスロールをバイパスする）
-- 全てのユーザーアクセスを拒否
CREATE POLICY "No user access to billing data"
ON user_billing
AS RESTRICTIVE
FOR ALL
USING (false);

-- 2. profiles: 重複ポリシーを整理
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON profiles;

-- 認証必須のRESTRICTIVEポリシー（匿名アクセス完全拒否）
CREATE POLICY "Require authentication for profiles"
ON profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "Users can view own profile only"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- 管理者は全プロフィール閲覧可能
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));