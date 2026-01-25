

## 2つの問題を解決する実装計画

---

### 問題1: HeyGenステータス確認の「not found」エラー修正

#### 原因
`translation_history`テーブルに保存されている`project_id`が`5ea2beefdd604a1a89226bce5dfab44f-en`のように、純粋な`video_translate_id`に言語サフィックス（`-en`）が付加された形式になっています。HeyGen APIは純粋なIDのみを期待するため、エラーが発生しています。

#### 修正内容

##### 1. heygen-check-status Edge Functionの修正
受け取った`projectId`から言語サフィックスを除去してからHeyGen APIに送信します。

**修正ファイル:** `supabase/functions/heygen-check-status/index.ts`

```typescript
// projectIdから言語サフィックスを除去
// 例: "5ea2beefdd604a1a89226bce5dfab44f-en" → "5ea2beefdd604a1a89226bce5dfab44f"
const cleanProjectId = projectId.replace(/-[a-z]{2}$/, '');
console.log("[heygen-check-status] Cleaned projectId:", cleanProjectId);

// HeyGen APIに送信
const statusResponse = await fetch(
  `https://api.heygen.com/v2/video_translate/status?video_translate_id=${cleanProjectId}`,
  ...
);
```

##### 2. すでに完了した翻訳の復旧方法
HeyGenからメールで完了通知が来ている動画については、正しいIDでステータスチェックを実行することで、Cloudflareへのアップロードとデータベース更新が自動的に行われます。

---

### 問題2:「略称マスター」の名前変更

#### 推奨名称
**「技術タグ」（Technique Tags）** または **「分類タグ」（Classification Tags）**

#### 修正対象ファイル

| ファイル | 変更箇所 |
|---------|---------|
| `src/components/admin/AdminSidebar.tsx` | サイドバーメニュー項目のラベル |
| `src/components/admin/NotationsManagement.tsx` | 管理画面のヘッダータイトルと説明文 |
| `src/components/admin/VideosManagement.tsx` | 動画編集モーダル内のラベル |
| `src/pages/AdminDashboard.tsx` | ダッシュボードのタブ名 |

#### 変更内容例（「技術タグ」を採用した場合）

```typescript
// AdminSidebar.tsx
{ id: "notations", label: "技術タグ", icon: Grid3X3 }

// NotationsManagement.tsx
<h1 className="text-xl font-bold">技術タグ</h1>
<p className="text-xs text-muted-foreground">
  BJJ技術の分類タグを管理 • 合計 {notations?.length || 0} 件
</p>

// VideosManagement.tsx
<Label className="text-sm font-medium">技術タグ</Label>

// AdminDashboard.tsx
{ id: "notations", label: "技術タグ" }
```

---

### 実装順序

1. **heygen-check-status Edge Function修正** - 言語サフィックス除去ロジック追加
2. **Edge Function再デプロイ** - 修正を適用
3. **既存翻訳の復旧** - ステータス確認ボタンで再チェック実行
4. **名称変更** - 4ファイルの「略称マスター」を「技術タグ」に変更

---

### 技術詳細

#### heygen-check-status修正（完全版）

```typescript
// Line 61付近に追加
const { projectId, techniqueId, targetLanguage } = await req.json();

console.log("[heygen-check-status] Request:", { projectId, techniqueId, targetLanguage });

if (!projectId) {
  throw new Error("projectId is required");
}

// projectIdから言語サフィックスを除去（例: "-en", "-pt"）
// HeyGen APIは純粋なvideo_translate_idを期待する
const cleanProjectId = projectId.replace(/-[a-z]{2}$/, '');
console.log("[heygen-check-status] Cleaned projectId:", cleanProjectId, "(original:", projectId, ")");

// HeyGen APIに送信（cleanProjectIdを使用）
const statusResponse = await fetch(
  `https://api.heygen.com/v2/video_translate/status?video_translate_id=${cleanProjectId}`,
  {
    method: "GET",
    headers: {
      "x-api-key": heygenApiKey,
    },
  }
);
```

---

### 期待される結果

**問題1修正後:**
- HeyGen翻訳のステータス確認が正常に動作
- 完了した翻訳がCloudflareにアップロードされ、`video_metadata`に保存される
- 吹替言語バッジが管理画面に表示される

**問題2修正後:**
- 「略称マスター」が「技術タグ」に統一
- サイドバー、管理画面ヘッダー、動画編集モーダル、ダッシュボードで一貫した呼称

