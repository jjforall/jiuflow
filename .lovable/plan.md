
# 管理画面改善計画

## 要件一覧

1. **動画ダウンロード機能の追加**: 管理画面から動画をダウンロードできるようにする
2. **字幕・吹替バッジの○✓マーク削除**: 言語コードのみ表示（JA, EN, PT）
3. **個別動画時間取得エラーの修正**: Cloudflare Streamダウンロードが有効でない場合に対応
4. **特別講習管理機能**: シリーズ番号のない動画（A, B等なし）を「特別講習」として別管理、一般公開しない

---

## 1. 動画ダウンロード機能

### 実装方針
管理者が動画カードから直接ダウンロードを開始できるボタンを追加。Cloudflare Streamのダウンロード機能を利用。

### 変更ファイル
**`src/components/admin/VideoCard.tsx`**

```typescript
// アクションボタンに追加
<Button
  size="sm"
  variant="outline"
  className="h-7 sm:h-8 text-xs px-2 sm:px-3"
  onClick={onDownload}
  title="動画をダウンロード"
>
  <Download className="w-3 h-3 sm:mr-1" />
  <span className="hidden sm:inline">DL</span>
</Button>
```

**新規Edge Function: `supabase/functions/get-video-download-url/index.ts`**
- Cloudflare APIを呼び出してダウンロードURLを取得
- 既存の`_shared/cloudflare-download.ts`を再利用
- 管理者認証チェック必須

### フロー
1. 管理者がDLボタンをクリック
2. Edge Function経由でCloudflare APIからダウンロードURLを取得
3. ブラウザで新規タブを開いてダウンロード開始

---

## 2. 字幕・吹替バッジのシンプル化

### 現状
```
字幕: JA✓ EN✓
吹替: JA○ EN✓
```

### 改善後
```
字幕: JA EN
吹替: JA EN
```

### 変更ファイル
**`src/components/admin/LocalizationStatus.tsx`**

```typescript
// 変更前
{lang.label}✓

// 変更後
{lang.label}
```

チェックマーク（✓）と丸印（○）を削除し、言語コードのみ表示。

---

## 3. 個別動画時間取得エラーの修正

### 問題の原因
Cloudflare Streamの動画は、ダウンロードが有効化されていない場合、`/downloads/default.mp4`にアクセスすると404エラーになる。

現在のフロントエンド実装では：
1. HLS URLからビデオIDを抽出
2. `/downloads/default.mp4`に直接アクセス
3. ダウンロード未有効化の場合、CORSエラーまたは404発生

### 解決策
既存の`admin-update-video-durations` Edge Functionを拡張して、Cloudflare APIから直接duration情報を取得する。

### 変更ファイル

**`supabase/functions/admin-update-video-durations/index.ts`**

```typescript
// 新規モード: duration取得
if (body?.mode === 'fetch') {
  const videoUrl = body.videoUrl;
  const videoId = extractCloudflareVideoId(videoUrl);
  
  // Cloudflare API経由で動画情報を取得
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  
  const result = await response.json();
  // durationはresult.result.durationに格納されている（秒数）
  return { duration: result.result?.duration };
}
```

**`src/components/admin/VideosManagement.tsx`**

```typescript
// 変更後のfetchDurationFromVideo
const fetchDurationFromVideo = async (videoUrl: string): Promise<number | null> => {
  try {
    // Edge Function経由でCloudflare APIからdurationを取得
    const { data, error } = await supabase.functions.invoke(
      'admin-update-video-durations',
      { body: { mode: 'fetch', videoUrl } }
    );
    
    if (error || !data?.duration) return null;
    return data.duration;
  } catch {
    return null;
  }
};
```

---

## 4. 特別講習管理機能

### 概要
- シリーズ番号（A, B, C...）がない動画を「特別講習」カテゴリとして分離
- 管理画面では別タブで管理
- ユーザー画面には表示しない（または招待制で表示）

### データ構造
既存の`visibility`フィールドと`series_prefix`を活用：
- `series_prefix`が空 = 特別講習
- `visibility: 'private'` = 管理者のみ閲覧可能

### 変更ファイル

**`src/components/admin/AdminSidebar.tsx`**

```typescript
// コンテンツグループに追加
items: [
  { id: "videos", label: "動画一覧", icon: Video },
  { id: "special-videos", label: "特別講習", icon: GraduationCap }, // 新規
  { id: "playlists", label: "再生リスト", icon: ListVideo },
  { id: "notations", label: "略称マスター", icon: Grid3X3 },
],
```

**新規コンポーネント: `src/components/admin/SpecialVideosManagement.tsx`**

主要機能：
- `series_prefix`が空の動画のみ表示
- デフォルトで`visibility: 'private'`
- 専用の追加・編集フォーム
- 招待リンク生成機能（将来拡張）

```typescript
// フィルタロジック
const { data } = usePaginatedTechniques(page, pageSize, {
  ...filters,
  seriesType: 'special' // 新規フィルタ
});

// usePaginatedTechniquesに追加
if (filters.seriesType === 'special') {
  query = query.or('series_prefix.is.null,series_prefix.eq.');
}
```

**`src/pages/AdminDashboard.tsx`**

```typescript
case "special-videos":
  return <SpecialVideosManagement />;
```

**`src/hooks/usePaginatedTechniques.tsx`**

```typescript
interface TechniqueFilters {
  // 既存...
  seriesType?: 'regular' | 'special' | 'all'; // 新規
}

// クエリ構築
if (filters.seriesType === 'special') {
  query = query.or('series_prefix.is.null,series_prefix.eq.');
} else if (filters.seriesType === 'regular') {
  query = query.not('series_prefix', 'is', null)
               .neq('series_prefix', '');
}
```

### UI設計

```text
┌─────────────────────────────────────────────────────────────┐
│ 特別講習                                      [＋ 新規追加]   │
├─────────────────────────────────────────────────────────────┤
│ 🔒 これらの動画はシリーズに属さず、                           │
│    招待者のみ閲覧可能です                                    │
├─────────────────────────────────────────────────────────────┤
│ [検索...]                                                   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [サムネ] 初心者向け基礎講座                              │ │
│ │          👁 非公開 • ⏱ 15:32                            │ │
│ │          [再生] [編集] [DL] [削除]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideoCard.tsx` | ダウンロードボタン追加、props追加 |
| `src/components/admin/LocalizationStatus.tsx` | ✓○マーク削除 |
| `src/components/admin/VideosManagement.tsx` | Edge Function経由でduration取得、特別講習フィルタ除外 |
| `src/components/admin/AdminSidebar.tsx` | 「特別講習」メニュー追加 |
| `src/pages/AdminDashboard.tsx` | special-videosタブ追加 |
| `src/hooks/usePaginatedTechniques.tsx` | seriesTypeフィルタ追加 |
| `supabase/functions/admin-update-video-durations/index.ts` | Cloudflare API経由でduration取得機能追加 |
| 新規: `supabase/functions/get-video-download-url/index.ts` | ダウンロードURL取得 |
| 新規: `src/components/admin/SpecialVideosManagement.tsx` | 特別講習管理画面 |

---

## 技術詳細

### Cloudflare API活用

動画情報取得API：
```
GET https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/{video_id}
```

レスポンス例：
```json
{
  "result": {
    "uid": "abc123",
    "duration": 245.5,
    "preview": "https://...",
    "playback": {
      "hls": "https://..."
    }
  }
}
```

### 必要な環境変数
- `CLOUDFLARE_ACCOUNT_ID`: 既存
- `CLOUDFLARE_STREAM_TOKEN`: 既存

### セキュリティ考慮
- ダウンロード機能は管理者のみ利用可能（Edge Functionで認証チェック）
- 特別講習動画はRLSポリシーで`visibility = 'private'`を強制
