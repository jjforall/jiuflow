
# 管理画面機能拡張計画

## 実装する機能

1. **動画に略称を紐付け・略称フィルタリング**
2. **再生リストを略称の組み合わせで自動生成**
3. **特別講習に招待リンク機能を追加**
4. **略称マスターページのUI改善**

---

## 1. 動画と略称の紐付け・フィルタリング

### 概要
動画カードに略称バッジを表示し、動画編集ダイアログから略称を追加・削除できるようにする。また、略称でフィルタリングできるようにする。

### 変更ファイル

**`src/components/admin/VideosManagement.tsx`**

- 略称フィルタ用のセレクトボックスを追加
- 動画編集ダイアログに略称編集セクションを追加
- `usePaginatedTechniques`に略称フィルタを渡す

**`src/components/admin/VideoCard.tsx`**

- 動画に紐付いた略称バッジを表示するセクション追加

**`src/hooks/usePaginatedTechniques.tsx`**

- `notations?: string[]`フィルタを追加
- `technique_notations`テーブルとJOINして絞り込み

### UIイメージ

```text
動画カード:
┌──────────────────────────────────────┐
│ [サムネ]  A-1 クローズドガードの基本  │
│          ⏱ 5:32                      │
│          [CG] [Frm] [RET]  ← 略称    │
└──────────────────────────────────────┘

フィルタセクション:
[シリーズ ▼] [カテゴリ ▼] [略称 ▼] [検索...]
```

### 新規コンポーネント

**`src/components/admin/NotationSelector.tsx`**
- 略称を選択・追加・削除するためのコンポーネント
- カテゴリ別にグループ化されたドロップダウン

---

## 2. 再生リストを略称で自動生成

### 概要
略称の組み合わせ（例: `CG -> TC`）を指定すると、該当する動画を自動的にリストに追加する機能。

### 変更ファイル

**`src/components/admin/PlaylistsManagement.tsx`**

- 「略称から生成」ボタンを追加
- 生成ダイアログ：略称を複数選択 → 該当動画をプレビュー → 一括追加

### 機能フロー

```text
1. 「略称から生成」ボタンをクリック
2. ダイアログが開く
3. 略称を選択（複数可）: [CG] [TC] [SC]
4. 「検索」をクリック → 該当動画をプレビュー表示
5. 「選択した動画を追加」→ リストに一括追加
```

### 新規コンポーネント

**`src/components/admin/NotationPlaylistGenerator.tsx`**
- 略称選択UI
- 該当動画のプレビューリスト
- 一括追加機能

---

## 3. 特別講習に招待リンク機能

### 概要
特別講習の動画に一意のトークンを生成し、そのURLを持つ人だけがアクセスできるようにする。

### データベース変更

**新規テーブル: `special_video_invites`**

```sql
CREATE TABLE public.special_video_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id UUID NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);
```

### 変更ファイル

**`src/components/admin/SpecialVideosManagement.tsx`**

- 各動画カードに「招待リンク生成」ボタンを追加
- 生成ダイアログ：有効期限、最大視聴回数を設定
- 生成したリンクをコピー可能

**`src/pages/Video.tsx`**

- URLパラメータ`?invite=<token>`をチェック
- 有効なトークンなら非公開動画にアクセス許可

### UIイメージ

```text
招待リンク生成ダイアログ:
┌────────────────────────────────────┐
│ 招待リンクの設定                    │
├────────────────────────────────────┤
│ 有効期限: [7日後 ▼]               │
│ 最大視聴回数: [10 ▼] (無制限可)    │
├────────────────────────────────────┤
│ [リンクを生成]                     │
│                                    │
│ 生成されたリンク:                  │
│ https://jiuflow.art/video/xxx?invite=abc123 │
│ [コピー]                           │
└────────────────────────────────────┘
```

---

## 4. 略称マスターページのUI改善

### 現状の問題点（スクリーンショットより）

1. **カテゴリタブが3行に折り返している**
2. **検索ボックスの配置がおかしい**
3. **テーブルの日本語名が2行になっている**
4. **カテゴリバッジも2行になっている**

### 改善案

**`src/components/admin/NotationsManagement.tsx`**

1. **カテゴリタブをスクロール可能に**
   - `TabsList`に`overflow-x-auto`とスクロールバー非表示を適用
   - 各タブをコンパクトに（文字数削減）

2. **統計カードを上部にまとめる**
   - 現在の7カラムを4カラムに（2行構成）

3. **検索を右上に固定配置**
   - ヘッダー右側に検索ボックスを移動

4. **テーブルを改善**
   - 日本語/英語列の幅を固定
   - カテゴリバッジを小さく（1行に収まる短い表記）
   - `white-space: nowrap`で折り返し防止

### 改善後のUIイメージ

```text
┌──────────────────────────────────────────────────────────────────┐
│ 略称マスター                               🔍 [検索...]  [更新] [＋追加] │
│ BJJ略称の管理 • 合計 98 件                                          │
├──────────────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┬─────────┐                        │
│ │● 位置   │● 動作   │● 極技   │● グリップ│ (スクロール可能)        │
│ │   23    │   14    │   24    │   14    │                        │
│ │  0動画  │  0動画  │  0動画  │  0動画  │                        │
│ └─────────┴─────────┴─────────┴─────────┘                        │
├──────────────────────────────────────────────────────────────────┤
│ [全て] [位置] [動作] [極技] [グリップ] [移動] [立技] [結果]  ←横スクロール │
├──────────────────────────────────────────────────────────────────┤
│ コード │ 日本語        │ English      │ 分類   │ 動画 │状態│ 操作 │
│ CG    │ クローズドガード │ Closed Guard │ 位置  │  0  │有効│ ✎ 🗑 │
│ HG    │ ハーフガード    │ Half Guard   │ 位置  │  0  │有効│ ✎ 🗑 │
└──────────────────────────────────────────────────────────────────┘
```

### 具体的な変更点

1. **統計カードを2行4列に変更** (lines 219-249)
   - `grid-cols-4`をベースに
   - ラベルを短縮: 「ポジション」→「位置」、「サブミッション」→「極技」

2. **タブをスクロール可能に** (lines 253-268)
   ```tsx
   <TabsList className="flex overflow-x-auto scrollbar-hide gap-1 w-full">
   ```

3. **検索をヘッダーに統合** (lines 199-216)
   - ヘッダー右側にまとめる

4. **テーブル列幅の固定** (lines 283-293)
   - `w-[80px]`, `w-[150px]`など固定幅を設定
   - `truncate`クラスで長いテキストを省略表示

5. **短いカテゴリラベル**
   ```typescript
   const SHORT_LABELS: Record<NotationCategory, string> = {
     position: '位置',
     action: '動作',
     submission: '極技',
     grip: 'グリップ',
     movement: '移動',
     takedown: '立技',
     outcome: '結果',
   };
   ```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/NotationsManagement.tsx` | UIレイアウト全面改修、短いラベル、スクロール対応 |
| `src/components/admin/VideosManagement.tsx` | 略称フィルタ追加、動画編集に略称選択 |
| `src/components/admin/VideoCard.tsx` | 略称バッジ表示 |
| `src/components/admin/PlaylistsManagement.tsx` | 略称から自動生成機能 |
| `src/components/admin/SpecialVideosManagement.tsx` | 招待リンク生成機能 |
| `src/pages/Video.tsx` | 招待トークン認証チェック |
| `src/hooks/usePaginatedTechniques.tsx` | 略称フィルタ対応 |
| 新規: `src/components/admin/NotationSelector.tsx` | 略称選択コンポーネント |
| 新規: `src/components/admin/NotationPlaylistGenerator.tsx` | 略称から再生リスト生成 |
| 新規: `src/components/admin/InviteLinkDialog.tsx` | 招待リンク生成ダイアログ |
| DB: マイグレーション | `special_video_invites`テーブル作成 |

---

## 技術詳細

### 略称フィルタのクエリ例

```typescript
// usePaginatedTechniques.tsx
if (filters.notations && filters.notations.length > 0) {
  // technique_notations経由で絞り込み
  const { data: linkedTechniqueIds } = await supabase
    .from('technique_notations')
    .select('technique_id')
    .in('notation_id', filters.notations);
  
  const ids = linkedTechniqueIds?.map(t => t.technique_id) || [];
  query = query.in('id', ids);
}
```

### 招待リンクの認証フロー

```typescript
// Video.tsx
const inviteToken = searchParams.get('invite');

if (inviteToken) {
  const { data: invite } = await supabase
    .from('special_video_invites')
    .select('*')
    .eq('token', inviteToken)
    .eq('technique_id', id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (invite) {
    // 視聴回数をインクリメント
    await supabase.from('special_video_invites')
      .update({ view_count: invite.view_count + 1 })
      .eq('id', invite.id);
    
    setHasInviteAccess(true);
  }
}
```

### 短いカテゴリラベルの定義

```typescript
// types/notation.ts に追加
export const NOTATION_CATEGORY_SHORT_LABELS: Record<NotationCategory, string> = {
  position: '位置',
  action: '動作',
  submission: '極技',
  grip: 'グリップ',
  movement: '移動',
  takedown: '立技',
  outcome: '結果',
};
```

---

## 実装優先順位

1. **略称マスターUIの改善** (最も緊急 - 既存画面の見た目問題)
2. **動画と略称の紐付け** (基盤機能)
3. **略称フィルタリング** (動画管理の利便性向上)
4. **再生リスト自動生成** (応用機能)
5. **招待リンク機能** (特別講習の活用拡大)
