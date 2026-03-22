

## 管理者向け「ユーザーとしてログイン」機能

### 概要
管理者が任意のユーザーとして一時的にログインできるEdge Functionを作成する。Supabase Admin APIの`generateLink`を使い、対象ユーザーのマジックリンクを生成する。

### 仕組み
1. 管理者が管理画面からユーザーを選択し「このユーザーとしてログイン」ボタンを押す
2. Edge Functionが対象ユーザーのマジックリンクを生成
3. そのリンクで新しいタブが開き、対象ユーザーとしてログイン状態になる

### 変更内容

**1. Edge Function作成: `supabase/functions/impersonate-user/index.ts`**
- 管理者認証チェック（adminロールのみ）
- `supabase.auth.admin.generateLink({ type: 'magiclink', email: targetEmail })` でリンク生成
- 監査ログに記録

**2. 管理画面UIに追加: `src/components/admin/UsersTab.tsx`**
- 各ユーザー行に「ログイン」ボタンを追加
- クリック時にEdge Functionを呼び出し、返却されたリンクで新しいタブを開く

### セキュリティ
- adminロール必須
- 監査ログに全アクセスを記録
- テスト完了後、Edge Functionを削除可能

### 注意点
- マジックリンクでログインすると、現在の管理者セッションは別タブで維持される
- Supabaseの`auth.admin`はservice_role_keyが必要（既にシークレットに設定済み）

