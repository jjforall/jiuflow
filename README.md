# JiuFlow - 柔術テクニック学習プラットフォーム

## 概要

JiuFlowは、ブラジリアン柔術（BJJ）のテクニックを体系的に学習できるWebアプリケーションです。初心者から上級者まで、すべてのレベルの練習者が効率的にテクニックを習得できるよう設計されています。

## 主な機能

### 🥋 テクニックマップ
- **体系的な学習フロー**: プル → ガードパス → コントロール → サブミッションの流れで整理
- **マルチ言語対応**: 日本語、英語、ポルトガル語に対応
- **動画学習**: 各テクニックには詳細な解説動画付き
- **プレミアムコンテンツ**: サブスクリプション会員限定の高度なテクニック

### 💳 サブスクリプションシステム
- **Stripe決済統合**: 安全で確実な決済処理
- **複数のプラン**:
  - Founder Access: ¥980/月（期間限定）
  - 月額プラン: ¥2,900/月
  - 年間プラン: ¥29,000/年
- **クーポンコード**: プロモーション用のクーポンコード対応

### 🔐 セキュリティ
- **Supabase認証**: 安全なユーザー認証システム
- **Row Level Security (RLS)**: データベースレベルでのアクセス制御
- **環境変数管理**: `.env`ファイルによる秘密情報の保護
- **CORS設定**: 適切なクロスオリジン制御

### 👤 ユーザー管理
- **マイページ**: 個人情報の管理、サブスクリプション状態の確認
- **管理者ダッシュボード**: 
  - テクニック管理（追加・編集・削除）
  - ユーザー管理
  - サブスクリプション管理
  - プラン・クーポン管理

## 技術スタック

### フロントエンド
- **React 18** + **TypeScript**: 型安全な開発
- **Vite**: 高速な開発環境とビルド
- **Tailwind CSS**: ユーティリティファーストのCSS
- **Shadcn/ui**: 再利用可能なUIコンポーネント
- **React Router v6**: クライアントサイドルーティング
- **React Query (TanStack Query)**: サーバーステート管理
- **Sonner**: トースト通知システム

### バックエンド
- **Supabase**: 
  - PostgreSQLデータベース
  - 認証システム
  - リアルタイムサブスクリプション
  - Edge Functions (Deno)
  - ストレージ（動画ファイル）

### 決済
- **Stripe**: サブスクリプション決済処理

## プロジェクト構成

```
jiuflow/
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   │   ├── admin/          # 管理画面用コンポーネント
│   │   ├── ui/             # UIコンポーネント（Shadcn/ui）
│   │   ├── ErrorBoundary.tsx
│   │   ├── Navigation.tsx
│   │   ├── Footer.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # Reactコンテキスト
│   │   └── LanguageContext.tsx
│   ├── hooks/              # カスタムフック
│   │   ├── useAuth.tsx
│   │   ├── useSubscription.tsx
│   │   └── usePaginatedTechniques.tsx
│   ├── integrations/       # 外部サービス統合
│   │   └── supabase/
│   ├── lib/                # ユーティリティ関数
│   │   ├── translations.ts
│   │   ├── validators.ts
│   │   └── cors.ts
│   ├── pages/              # ページコンポーネント
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Map.tsx
│   │   ├── Video.tsx
│   │   ├── Join.tsx
│   │   ├── MyPage.tsx
│   │   ├── AdminLogin.tsx
│   │   └── AdminDashboard.tsx
│   └── App.tsx             # アプリケーションのルート
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── create-checkout/
│   │   ├── create-payment/
│   │   ├── manage-plans/
│   │   └── _shared/        # 共通モジュール
│   └── migrations/         # データベースマイグレーション
├── public/                 # 静的ファイル
├── .env.example           # 環境変数テンプレート
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/jjforall/jiuflow.git
cd jiuflow
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.example`を`.env`にコピーして、必要な値を設定：

```bash
cp .env.example .env
```

必要な環境変数：
- `VITE_SUPABASE_URL`: SupabaseプロジェクトのURL
- `VITE_SUPABASE_ANON_KEY`: Supabaseの公開鍵
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripeの公開鍵
- `VITE_FOUNDER_PLAN_END_DATE`: Founderプランの終了日時

### 4. データベースのセットアップ
Supabaseプロジェクトを作成し、必要なテーブルとRLSポリシーを設定：

```sql
-- migrations/20251109000000_add_rls_policies.sql を実行
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

### 6. ビルド
```bash
npm run build
```

## 主要コンポーネントの説明

### 認証システム (`useAuth.tsx`)
- Supabase認証をラップしたカスタムフック
- ユーザー情報、管理者権限チェック、ログアウト機能を提供

### プロテクトルート (`ProtectedRoute.tsx`)
- 認証が必要なルートを保護
- 管理者専用ページのアクセス制御

### エラーバウンダリ (`ErrorBoundary.tsx`)
- アプリケーション全体のエラーをキャッチ
- ユーザーフレンドリーなエラー画面を表示

### ページネーション (`usePaginatedTechniques.tsx`)
- テクニック一覧の効率的な表示
- サーバーサイドページネーション実装
- React Queryによるキャッシング

### 多言語対応 (`LanguageContext.tsx`)
- 日本語、英語、ポルトガル語の切り替え
- ブラウザの言語設定を自動検出

## 開発ガイドライン

### コード規約
- TypeScriptの厳格な型定義を使用
- React Hooksの規則に従う
- コンポーネントは機能ごとに分割
- 適切なエラーハンドリングを実装

### セキュリティ
- 環境変数に秘密情報を保存
- RLSポリシーでデータアクセスを制御
- CORSを適切に設定
- ユーザー入力は必ず検証

### パフォーマンス
- React.lazyによる遅延読み込み
- React Queryによるキャッシング
- 画像・動画の最適化
- ページネーションの実装

## トラブルシューティング

### よくある問題

1. **Supabase接続エラー**
   - `.env`ファイルの設定を確認
   - Supabaseプロジェクトの状態を確認

2. **Stripe決済エラー**
   - Stripe公開鍵が正しいか確認
   - ブラウザのコンソールでエラーを確認

3. **ビルドエラー**
   - `node_modules`を削除して再インストール
   - TypeScriptの型エラーを修正

## ライセンス

このプロジェクトはプライベートリポジトリです。無断での複製・配布は禁止されています。

## サポート

問題や質問がある場合は、GitHubのIssuesまたは管理者にお問い合わせください。

---

Made with ❤️ for the BJJ community