
## /admin リダイレクトとダッシュボードメニュー追加計画

### 概要
管理者がログイン済みの場合、`/admin` にアクセスすると自動的にダッシュボードへリダイレクトし、ダッシュボードページにも左側メニューを表示するようにします。

---

### 変更内容

#### 1. /admin でのログイン済みリダイレクト
`AdminLogin.tsx` にログイン状態チェックを追加し、既にadmin/staffとしてログインしている場合は `/admin/dashboard` へリダイレクトします。

**変更箇所**: `src/pages/AdminLogin.tsx`
- `useAuth` フックからユーザー情報と権限を取得
- `useEffect` でログイン状態と権限をチェック
- admin/staffの場合は自動的にリダイレクト

```typescript
// 追加するimport
import { useAuth } from "@/hooks/useAuth";

// コンポーネント内
const { user, isAdmin, isStaff, rolesChecked, isLoading: authLoading } = useAuth();

// ログイン済みadmin/staffならリダイレクト
useEffect(() => {
  if (!authLoading && rolesChecked && user && (isAdmin || isStaff)) {
    navigate('/admin/dashboard');
  }
}, [authLoading, rolesChecked, user, isAdmin, isStaff, navigate]);
```

---

#### 2. AdminStats（ダッシュボード）にサイドバーメニュー追加
現在の `AdminStats.tsx` は単独ページですが、`AdminDashboard.tsx` と同様に `SidebarProvider` と `AdminSidebar` を追加してレイアウトを統一します。

**変更箇所**: `src/pages/AdminStats.tsx`
- `SidebarProvider` と `AdminSidebar` をインポート
- レイアウトを `AdminDashboard` と同様の構造に変更
- サイドバーのアクティブタブは "dashboard" を追加（特別なタブ）
- モバイル用の `Sheet` メニューも追加

```typescript
// 追加するimport
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

// レイアウト変更
return (
  <SidebarProvider defaultOpen>
    <div className="min-h-screen w-full flex bg-background">
      <AdminSidebar activeTab="dashboard" onTabChange={(tab) => {
        // タブ変更時は /admin/techniques へ遷移して該当タブを開く
        navigate('/admin/techniques');
        // カスタムイベントでタブを切り替え
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: tab }));
        }, 100);
      }} />
      
      <div className="flex-1 flex flex-col">
        <header>...</header>
        <main>...</main>
      </div>
    </div>
  </SidebarProvider>
);
```

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/AdminLogin.tsx` | ログイン済みadmin/staffの場合、/admin/dashboardへリダイレクト |
| `src/pages/AdminStats.tsx` | SidebarProvider、AdminSidebar追加でメニュー表示 |

---

### ユーザー体験の変化

**変更前**:
- `/admin` → ログインフォーム表示（ログイン済みでも）
- `/admin/dashboard` → 統計ページ（メニューなし）

**変更後**:
- `/admin` → ログイン済みadmin/staffなら `/admin/dashboard` へ自動リダイレクト
- `/admin/dashboard` → 統計ページ（左側にメニュー表示）

---

### レイアウト構造

```text
┌──────────────────────────────────────────────────────────┐
│  AdminStats（ダッシュボード）                              │
├──────────┬───────────────────────────────────────────────┤
│          │  ヘッダー（タイトル + ボタン）                   │
│          ├───────────────────────────────────────────────┤
│  サイド   │                                               │
│  バー     │  統計カード（会員数、収入など）                  │
│  メニュー │                                               │
│          │  動画視聴統計                                   │
│          │                                               │
│          │  人気動画ランキング・視聴者ランキング            │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

---

### 技術詳細

#### AdminLogin.tsx の追加ロジック
```typescript
const { user, isAdmin, isStaff, rolesChecked, isLoading: authLoading } = useAuth();

useEffect(() => {
  // 認証チェック中は何もしない
  if (authLoading || !rolesChecked) return;
  
  // ログイン済みかつadmin/staffならダッシュボードへ
  if (user && (isAdmin || isStaff)) {
    navigate('/admin/dashboard');
  }
}, [authLoading, rolesChecked, user, isAdmin, isStaff, navigate]);

// セットアップチェック中またはリダイレクト待ちの場合はローディング表示
if (authLoading || (user && !rolesChecked)) {
  return <LoadingState />;
}
```

#### AdminStats.tsx のサイドバー連携
サイドバーのタブクリック時は `/admin/techniques` に遷移してから、カスタムイベントで該当タブを開きます。これにより、既存の `AdminDashboard` のタブ管理ロジックを活用できます。
