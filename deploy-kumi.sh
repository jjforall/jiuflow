#!/bin/bash
# kumi feature deploy — run this from mmp or with jjforall write access
# 所要時間: 約30秒

set -e
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_REF="jkiohqfamhiykurxrhsn"

echo "=== 1. git push ==="
cd "$REPO_DIR"
git push origin feature/kumi
gh pr create \
  --title "feat: add kumi (training group)" \
  --body "明日のatsumeクラス向け。練習ログをグループでシェアできる組機能を追加。

## 変更内容
- \`kumis\` + \`kumi_members\` テーブル（RLS付き）
- \`practice_records\` に \`kumi_id\` 追加（自動セット）
- \`/kumi/:id\` — グループフィード（今日の練習人数・週次ランキング・ログ一覧）
- \`/kumi/join/:code\` — 招待リンクからワンタップ参加

🤖 Generated with Claude Code" \
  --base main

echo ""
echo "=== 2. Supabase migration ==="
supabase db push --workdir "$REPO_DIR" --project-ref "$PROJECT_REF"

echo ""
echo "=== 3. 最初のkumiを作成 ==="
# KENNY_USER_ID を自分のSupabase user_id に置き換えてください
KENNY_USER_ID="${KENNY_USER_ID:-00000000-0000-0000-0000-000000000000}"

supabase sql --workdir "$REPO_DIR" --project-ref "$PROJECT_REF" \
  --command "
INSERT INTO public.kumis (name, description, created_by, invite_code)
VALUES ('Atsume 組', 'atsumeクラス 練習グループ', '$KENNY_USER_ID', 'atsume01')
ON CONFLICT (invite_code) DO NOTHING;

-- 作成者を admin として kumi_members に追加
INSERT INTO public.kumi_members (kumi_id, user_id, role)
SELECT id, '$KENNY_USER_ID', 'admin'
FROM public.kumis WHERE invite_code = 'atsume01'
ON CONFLICT DO NOTHING;

SELECT id, name, invite_code FROM public.kumis WHERE invite_code = 'atsume01';
"

echo ""
echo "=== 完了 ==="
echo "招待リンク: https://jiuflow.com/kumi/join/atsume01"
echo "（PRがマージ＆デプロイされたら有効になります）"
