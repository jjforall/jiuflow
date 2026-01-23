
# 翻訳動画の再生機能追加計画

## 概要
翻訳済みの動画（吹き替え版）を管理画面とユーザーページで再生できるようにします。

## 現状分析

### 既に対応済み
- **テクニック動画ページ（Video.tsx）**: VideoPlayerコンポーネントに音声言語切り替え機能が実装済み

### 対応が必要な箇所

| ページ | 現状 | 課題 |
|--------|------|------|
| 管理画面 - テクニック管理 | 単純な`<video>`タグでプレビュー | 言語切り替えなし |
| 管理画面 - 動画リスト管理 | プレビュー機能なし | 再生自体ができない |
| 管理画面 - 動画ローカライズ | 翻訳状況のみ表示 | プレビューなし |
| ユーザーページ（MyPage） | サムネイルのみ表示 | データ構造上、翻訳版がない |

## 実装内容

### 1. 管理画面テクニック管理のプレビュー強化
**ファイル**: `src/components/admin/TechniquesManagement.tsx`

- 現在の単純な`<video>`タグを`VideoPlayer`コンポーネントに置き換え
- プレビュー時に翻訳版動画も選択できるUI追加

```
┌─────────────────────────────────────────────────────────────┐
│ 動画プレビュー                                     [×]      │
├─────────────────────────────────────────────────────────────┤
│ 音声言語: [日本語 ▾] [English] [Português]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [VideoPlayer コンポーネント]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**変更内容**:
- `previewVideoUrl` を `previewTechnique` (テクニック全体) に変更
- プレビューダイアログ内で言語選択タブを追加
- 選択した言語の動画URLで`VideoPlayer`を表示

### 2. 動画リスト管理にプレビュー機能追加
**ファイル**: `src/components/admin/VideoListsManagement.tsx`

- 各動画アイテムにプレビューボタン追加
- クリックでプレビューダイアログを表示
- 言語切り替え対応

### 3. 共通コンポーネントの作成
**新規ファイル**: `src/components/admin/VideoPreviewDialog.tsx`

管理画面用の動画プレビューダイアログを共通化:
- 翻訳版の言語選択タブ
- VideoPlayerコンポーネントの統合
- 翻訳状態の表示（翻訳済み / 未翻訳）

```typescript
interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technique: {
    name: string;
    video_url: string | null;
    video_url_ja?: string | null;
    video_url_pt?: string | null;
    video_metadata?: any;
  } | null;
}
```

## 技術詳細

### 翻訳版動画URLの取得ロジック（既存を再利用）

Video.tsx の `getAvailableAudioLanguages` 関数と同様のロジックを共通化:

```typescript
// src/lib/videoLanguages.ts (新規作成)
export function getAvailableAudioLanguages(technique: {
  video_url: string | null;
  video_url_ja?: string | null;
  video_url_pt?: string | null;
  video_metadata?: any;
}): { code: string; label: string; videoUrl: string }[] {
  const languages = [];
  
  // 日本語（オリジナル）
  const jaUrl = technique.video_url_ja || technique.video_url;
  if (jaUrl) languages.push({ code: "ja", label: "日本語", videoUrl: jaUrl });
  
  // 英語
  if (technique.video_metadata?.en?.video_url) {
    languages.push({ code: "en", label: "English", videoUrl: technique.video_metadata.en.video_url });
  }
  
  // ポルトガル語
  if (technique.video_metadata?.pt?.video_url) {
    languages.push({ code: "pt", label: "Português", videoUrl: technique.video_metadata.pt.video_url });
  } else if (technique.video_url_pt) {
    languages.push({ code: "pt", label: "Português", videoUrl: technique.video_url_pt });
  }
  
  return languages;
}
```

### 対象外（ユーザーページ）
- **MyPage.tsx のユーザー動画**: `user_videos` テーブルにはオリジナル動画のみ保存される設計のため、翻訳機能は対象外
- ユーザーがアップロードした動画の翻訳は現在のスコープ外

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/videoLanguages.ts` | **新規作成** - 多言語動画URL取得ロジックの共通化 |
| `src/components/admin/VideoPreviewDialog.tsx` | **新規作成** - 管理画面用プレビューダイアログ |
| `src/components/admin/TechniquesManagement.tsx` | プレビューダイアログを新コンポーネントに置換 |
| `src/components/admin/VideoListsManagement.tsx` | プレビューボタンとダイアログ追加 |
| `src/pages/Video.tsx` | 共通化したロジックをimportに変更（リファクタリング） |

## 画面イメージ

### テクニック管理画面のプレビュー
```
┌──────────────────────────────────────────────────────┐
│ Closed Guard Pass - A-1                              │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ 🇯🇵 日本語 │ 🇺🇸 English │ 🇧🇷 Português (未翻訳) │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │                                                │   │
│ │           [VideoPlayer]                        │   │
│ │                                                │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [閉じる]                                             │
└──────────────────────────────────────────────────────┘
```

### 動画リスト管理画面
```
┌─────┬─────────────┬────────────────────────────────────────┐
│ 順序 │ サムネイル  │ テクニック名                            │
├─────┼─────────────┼────────────────────────────────────────┤
│ 1   │ [画像] ▶️   │ Closed Guard Pass                      │
│     │             │ A-1  📝完了  🔤日本語・EN  🎤EN・PT    │
├─────┼─────────────┼────────────────────────────────────────┤
│ 2   │ [画像] ▶️   │ Mount Escape                           │
│     │             │ B-1  📝完了  🔤日本語                   │
└─────┴─────────────┴────────────────────────────────────────┘
       ↑
      クリックでプレビューダイアログ表示
```

## 実装順序
1. `src/lib/videoLanguages.ts` の作成（共通ロジック）
2. `src/components/admin/VideoPreviewDialog.tsx` の作成
3. `TechniquesManagement.tsx` のプレビュー機能を新ダイアログに置換
4. `VideoListsManagement.tsx` にプレビュー機能追加
5. `Video.tsx` を共通ロジック使用にリファクタリング
