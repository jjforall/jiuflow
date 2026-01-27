

# 言語別期限付き招待リンク機能の追加計画

## 概要

管理画面から各言語ごとにログイン不要で視聴可能な期限付きURLを発行する機能を追加します。期限が過ぎたら会員登録を促す画面を表示します。

---

## 現状分析

### 既存システム
- **`special_video_invites`テーブル**：既に存在（言語フィールドなし）
- **`InviteLinkDialog`**：現在言語指定なしでリンク生成
- **`Video.tsx`**：`invite`パラメータの検証が**未実装**（`list`パラメータのみ対応）
- **RLSポリシー**：誰でも有効な招待トークンを読み取り可能

---

## 変更内容

### 1. データベース変更：言語フィールドの追加

**マイグレーション**：`special_video_invites`テーブルに`target_language`カラムを追加

```sql
ALTER TABLE public.special_video_invites 
ADD COLUMN target_language TEXT DEFAULT 'ja';

-- 既存レコードの更新
UPDATE public.special_video_invites 
SET target_language = 'ja' 
WHERE target_language IS NULL;
```

### 2. InviteLinkDialog の拡張

**ファイル**: `src/components/admin/InviteLinkDialog.tsx`

| 変更内容 | 説明 |
|---------|------|
| 言語選択ドロップダウン追加 | 利用可能な言語（日本語、英語、ポルトガル語等）を選択 |
| URLに言語パラメータ追加 | `?invite=TOKEN&lang=en` 形式 |
| 既存リンク一覧に言語表示 | どの言語向けのリンクかを表示 |

**変更後のUI**:
```
新規リンクを生成
┌────────────────┬────────────────┬────────────────┐
│ 有効期限       │ 最大視聴回数    │ 対象言語       │
│ [7日間 ▼]     │ [無制限 ▼]     │ [English ▼]   │
└────────────────┴────────────────┴────────────────┘
[リンクを生成]
```

**生成されるURL例**:
```
https://jiuflow.lovable.app/video/abc123?invite=TOKEN123&lang=en
```

### 3. Video.tsx の招待リンク検証追加

**ファイル**: `src/pages/Video.tsx`

招待トークン検証のuseEffectを追加：

```typescript
// Check if accessing via invite token
useEffect(() => {
  const inviteToken = searchParams.get("invite");
  const inviteLang = searchParams.get("lang");
  
  if (!inviteToken) {
    setInviteAccessChecked(true);
    return;
  }
  
  const checkInviteAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("special_video_invites")
        .select("*")
        .eq("token", inviteToken)
        .eq("technique_id", id)
        .single();
      
      if (error || !data) {
        // トークン無効
        setInviteExpired(true);
      } else if (!data.is_active) {
        // 無効化されたリンク
        setInviteExpired(true);
      } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // 期限切れ
        setInviteExpired(true);
      } else if (data.max_views && data.view_count >= data.max_views) {
        // 視聴回数制限超過
        setInviteExpired(true);
      } else {
        // 有効なトークン
        setIsFromInviteLink(true);
        setInviteLanguage(inviteLang || data.target_language || 'ja');
        
        // 視聴回数をインクリメント
        await supabase
          .from("special_video_invites")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", data.id);
      }
    } catch (err) {
      console.error("Error checking invite access:", err);
    } finally {
      setInviteAccessChecked(true);
    }
  };
  
  checkInviteAccess();
}, [searchParams, id]);
```

### 4. 期限切れ時の会員登録促進画面

**ファイル**: `src/pages/Video.tsx`

期限切れの場合に表示する画面を追加：

```typescript
if (inviteExpired) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Navigation />
      <main className="pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-light mb-4">
            {language === "ja" 
              ? "招待リンクの有効期限が切れました" 
              : "Invitation link has expired"}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {language === "ja"
              ? "この動画を視聴するには会員登録が必要です。無料で始められます。"
              : "Please register to continue watching. It's free to get started."}
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate("/join")} size="lg" className="w-full max-w-xs">
              {language === "ja" ? "今すぐ登録" : "Register Now"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>
              {language === "ja" ? "すでにアカウントをお持ちの方" : "Already have an account?"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

### 5. 招待リンク経由時の言語自動切り替え

招待リンクの`lang`パラメータに基づいて、該当言語の動画を自動再生：

```typescript
// 招待リンク経由の場合、指定言語の動画URLを使用
const getInitialVideoUrl = () => {
  if (isFromInviteLink && inviteLanguage) {
    return getVideoUrlForLanguage(technique, inviteLanguage);
  }
  return technique.video_url;
};
```

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| **マイグレーション** | 新規 | `target_language`カラム追加 |
| `src/components/admin/InviteLinkDialog.tsx` | 修正 | 言語選択UI追加、URL生成ロジック更新 |
| `src/pages/Video.tsx` | 修正 | 招待トークン検証、期限切れ画面、言語自動切替 |

---

## データフロー図

```text
[管理者]
    ↓ 言語・期限・回数を指定してリンク生成
[InviteLinkDialog]
    ↓ special_video_invites テーブルに保存
[DB: special_video_invites]
    │
    ↓ URL: /video/{id}?invite=TOKEN&lang=en
    
[ユーザーがアクセス]
    ↓
[Video.tsx]
    ├── トークン検証（DB照会）
    │   ├── 有効 → 指定言語の動画を再生
    │   └── 期限切れ/無効 → 会員登録促進画面
    └── 視聴回数をインクリメント
```

---

## UI変更箇所

### InviteLinkDialog（管理画面）

**現在**:
```
┌─────────────────────────────────────┐
│ 新規リンクを生成                      │
│ ┌───────────┐ ┌───────────┐         │
│ │有効期限 ▼│ │最大視聴▼ │         │
│ └───────────┘ └───────────┘         │
│ [リンクを生成]                       │
└─────────────────────────────────────┘
```

**変更後**:
```
┌─────────────────────────────────────┐
│ 新規リンクを生成                      │
│ ┌───────────┐ ┌───────────┐ ┌─────┐ │
│ │有効期限 ▼│ │最大視聴▼ │ │EN ▼│ │
│ └───────────┘ └───────────┘ └─────┘ │
│ [リンクを生成]                       │
│                                     │
│ 既存のリンク                         │
│ ┌───────────────────────────────┐   │
│ │ ...TOKEN123  EN  7d  0/∞ [🗑]│   │
│ │ ...TOKEN456  PT  30d 3/10[🗑]│   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Video.tsx（期限切れ画面）

```
┌─────────────────────────────────────┐
│            ⏰                        │
│   招待リンクの有効期限が切れました     │
│                                     │
│ この動画を視聴するには会員登録が必要です │
│ 無料で始められます。                  │
│                                     │
│     [今すぐ登録]                     │
│   すでにアカウントをお持ちの方         │
└─────────────────────────────────────┘
```

---

## 期待される効果

1. **言語別プロモーション**: 各言語の吹き替え動画を直接共有可能
2. **コントロールされたアクセス**: 期限・回数制限で無制限アクセスを防止
3. **会員獲得**: 期限切れ時に自然な形で会員登録を促進
4. **管理の容易さ**: 既存の招待リンク管理UIを拡張するだけで実装可能

