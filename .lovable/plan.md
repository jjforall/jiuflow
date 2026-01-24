
# 修正・機能追加計画

## 要件

1. **「動画時間未取得のみ」フィルターの削除** - 不要なフィルターを削除
2. **個別動画時間取得エラーの修正** - Edge Functionがデプロイされていない可能性があるため再デプロイ
3. **既存動画と略称の紐付け** - series_prefixとcategoryに基づいて自動マッピング

---

## 1. 動画時間フィルターの削除

### 変更箇所

**`src/components/admin/VideosManagement.tsx`**

削除する要素:
- 状態変数: `durationFilter`, `setDurationFilter`, `missingDurationCount` 関連のUI部分
- フィルターUI（lines 2032-2050）
- データフィルタリングロジック（lines 2122-2130）

残す要素:
- 個別の動画時間取得ボタン（VideoCard内の「Fetch」ボタン）
- 一括取得機能（管理ツール内）

---

## 2. 個別動画時間取得エラーの修正

### 問題の原因

ネットワークログによると、Edge Function呼び出しで「Failed to fetch」エラーが発生しています。これはEdge Functionが正しくデプロイされていない可能性があります。

### 対応

1. `admin-update-video-durations` Edge Functionを再デプロイ
2. Edge Function内のCloudflare API呼び出しが正しく動作するか確認

現在の環境変数は設定済み:
- `CLOUDFLARE_ACCOUNT_ID` ✓
- `CLOUDFLARE_STREAM_API_TOKEN` ✓

---

## 3. 既存動画と略称の自動紐付け

### マッピングロジック

現在のシリーズと略称の対応関係:

| series_prefix | series_name | 対応する略称コード |
|---------------|-------------|-------------------|
| A | クローズドガード | CG（ポジション）|
| B | クローズドガードブレイク | CG + B（ブレイク）|
| C | コンバットベース | CB（ポジション）|
| D | マウント | MT（ポジション）|
| E | 引き込み | Pull（アクション）|
| F | (コンバットベース対応) | CB系 |

カテゴリと略称の対応:

| technique.category | 対応する略称 |
|-------------------|--------------|
| submission | 関連するサブミッション略称（TC, AB, KIM等）|
| sweep | SW（スイープ）|
| escape | ESC（エスケープ）|
| guard-pass | P（パスガード）|
| control | ポジション系 |
| guard pull | Pull + GP |

### 実装方法

`NotationsManagement.tsx`に「既存動画を一括紐付け」ボタンを追加:

```typescript
const handleAutoLinkExistingVideos = async () => {
  // 1. 全techniqueを取得
  // 2. series_prefixに基づいてポジション略称を紐付け
  // 3. categoryに基づいてアクション/サブミッション略称を紐付け
  // 4. technique_notationsテーブルに挿入
};
```

### 紐付けルール

```typescript
const SERIES_TO_NOTATION: Record<string, string[]> = {
  'A': ['CG'],  // クローズドガード
  'B': ['CG', 'B'],  // クローズドガードブレイク
  'C': ['CB'],  // コンバットベース
  'D': ['MT'],  // マウント
  'E': ['Pull', 'GP'],  // 引き込み
  'F': ['CB'],  // コンバットベース対応
};

const CATEGORY_TO_NOTATION: Record<string, string[]> = {
  'submission': [],  // 動画名から個別判定
  'sweep': ['SW'],
  'escape': ['ESC'],
  'guard-pass': ['P'],
  'control': [],  // ポジション系（series_prefixから判定済み）
  'guard pull': ['Pull', 'GP'],
};

// 動画名からサブミッション種類を判定
const SUBMISSION_KEYWORDS: Record<string, string> = {
  'kimura': 'KIM',
  'armbar': 'AB',
  'arm bar': 'AB',
  'triangle': 'TC',
  'cross choke': 'CC',
  'guillotine': 'GUI',
  'omoplata': 'OMO',
  'rear naked': 'RNC',
  'americana': 'AMI',
};
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideosManagement.tsx` | durationFilterのUI・ロジック削除 |
| `src/components/admin/NotationsManagement.tsx` | 「既存動画を一括紐付け」ボタン追加 |
| `supabase/functions/admin-update-video-durations/index.ts` | 再デプロイ（変更なし） |

---

## UIイメージ

### NotationsManagement.tsx に追加するボタン

```text
┌────────────────────────────────────────────────────────────┐
│ 略称マスター                    🔍 [検索...] [更新] [＋追加] │
│ BJJ略称の管理 • 合計 98件                                  │
│                                                            │
│ [📎 既存動画を一括紐付け]  ← 新規追加                       │
│                                                            │
│ • series_prefix に基づいてポジション略称を自動紐付け       │
│ • category に基づいてアクション略称を自動紐付け            │
│ • 動画名のキーワードからサブミッション略称を自動判定       │
└────────────────────────────────────────────────────────────┘
```

### 紐付け結果の例

動画「Kimura Lock From Closed Guard」(series_prefix: A, category: submission):
- CG（クローズドガード）← series_prefix: A から
- KIM（キムラ）← 動画名に「kimura」があるため

動画「Mount Escape」(series_prefix: D, category: escape):
- MT（マウント）← series_prefix: D から
- ESC（エスケープ）← category: escape から

---

## 実装順序

1. `VideosManagement.tsx`からdurationFilter関連を削除
2. `admin-update-video-durations` Edge Functionを再デプロイ
3. `NotationsManagement.tsx`に一括紐付け機能を追加
