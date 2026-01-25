

## Lovableプレビュー環境での管理画面ログイン改善

### 現状の問題

Lovableのプレビュー環境（`id-preview--*.lovable.app`）とプロダクション環境（`jiuflow.lovable.app`）は異なるドメインのため、Supabaseの認証セッション（localStorage）が共有されません。そのため、プレビュー環境では毎回手動でログインが必要です。

### 解決策: 開発者向けクイックログイン機能

プレビュー環境かつ開発モード（`__lovable_token`が存在）の場合に、管理者メールアドレスを自動入力し、パスワードのみ入力で素早くログインできるようにします。

---

### 変更内容

#### 1. AdminLogin.tsx の改修

**新機能:**
- Lovableプレビュー環境を検出（URLに`__lovable_token`が含まれる、または`lovable.app`ドメイン）
- プレビュー環境の場合、管理者メールを自動入力（または直近で使用したメールを保存・復元）
- 「前回のログイン情報を記憶」オプションを追加

```typescript
// プレビュー環境の検出
const isLovablePreview = 
  window.location.search.includes('__lovable_token') ||
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com');

// 前回のメールアドレスを復元（プレビュー環境のみ）
useEffect(() => {
  if (isLovablePreview) {
    const savedEmail = localStorage.getItem('admin_dev_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }
}, []);

// ログイン成功時にメールを保存
if (isLovablePreview) {
  localStorage.setItem('admin_dev_email', email);
}
```

#### 2. UI改善

プレビュー環境では以下のUIを表示:

```text
┌─────────────────────────────────────────┐
│            Admin Login                  │
│   🔧 開発プレビュー環境                  │
│                                         │
│ Email: [admin@example.com____] (自動入力) │
│ Password: [________________]            │
│ ☑ このデバイスでメールを記憶する          │
│                                         │
│         [ Login ]                       │
└─────────────────────────────────────────┘
```

---

### 修正ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/AdminLogin.tsx` | プレビュー環境検出 + メール自動入力 + 記憶オプション |

---

### 技術詳細

```tsx
// AdminLogin.tsx に追加

const [rememberEmail, setRememberEmail] = useState(true);

// プレビュー環境の検出
const isLovablePreview = useMemo(() => {
  const hostname = window.location.hostname;
  const search = window.location.search;
  return (
    search.includes('__lovable_token') ||
    hostname.includes('id-preview--') ||
    hostname.includes('lovableproject.com') ||
    (hostname.includes('lovable.app') && hostname !== 'jiuflow.lovable.app')
  );
}, []);

// 初期化時にメールを復元
useEffect(() => {
  if (isLovablePreview) {
    const savedEmail = localStorage.getItem('jiuflow_admin_dev_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }
}, [isLovablePreview]);

// ログイン成功時にメールを保存
const handleLogin = async (e: React.FormEvent) => {
  // ... 既存のログイン処理 ...
  
  if (data.session && rememberEmail && isLovablePreview) {
    localStorage.setItem('jiuflow_admin_dev_email', email);
  }
  
  // ... 残りの処理 ...
};

// JSX: プレビュー環境バナー
{isLovablePreview && (
  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-blue-400">
      <Wrench className="w-4 h-4" />
      開発プレビュー環境
    </div>
  </div>
)}

// JSX: メール記憶チェックボックス
{isLovablePreview && (
  <div className="flex items-center gap-2">
    <Checkbox 
      id="remember" 
      checked={rememberEmail}
      onCheckedChange={(checked) => setRememberEmail(!!checked)}
    />
    <Label htmlFor="remember" className="text-sm text-muted-foreground">
      このデバイスでメールを記憶する
    </Label>
  </div>
)}
```

---

### セキュリティ考慮

1. **パスワードは保存しない** - メールアドレスのみをlocalStorageに保存
2. **プレビュー環境でのみ有効** - 本番環境ではこの機能は表示されない
3. **認証ロジックは変更なし** - Supabase認証を経由するため、権限のないユーザーはログインできない

---

### 期待される結果

**変更後:**
- Lovableプレビューで`/admin`にアクセス
- 前回使用したメールアドレスが自動入力される
- パスワードのみ入力してログイン
- 開発作業がスムーズに

