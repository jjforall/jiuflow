-- 管理者が申請を閲覧できるポリシーを追加
CREATE POLICY "Admins can view all applications"
ON celebrity_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));