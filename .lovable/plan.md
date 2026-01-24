

# 略称セレクター・再生リスト画面改善計画

## 要件

1. **NotationSelector改善**
   - 2文字の略称コードだけでなく、日本語名も表示する
   - ポップオーバー内でマウススクロールできるようにする

2. **PlaylistsManagement改善**
   - タイトルを「動画管理」から「再生リスト」に変更
   - 上部の統計カード（4つの数字）を削除
   - 「再生リスト」と「全動画ローカライズ」のタブを削除
   - リスト作成と動画選択機能をメインに
   - **略称マスターから順番に選んでリストを自動生成**する機能を追加
   - テーブルレイアウトをカード形式に変更（PC/スマホで見やすく）

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/NotationSelector.tsx` | 略称に日本語名を追加表示、スクロール改善 |
| `src/components/admin/PlaylistsManagement.tsx` | タイトル変更、統計・タブ削除、カード形式レイアウト、略称ジェネレーター統合 |

---

## 技術詳細

### 1. NotationSelector.tsx - 略称名表示とスクロール改善

**略称一覧に日本語名を表示:**
```text
現在:
┌──────────────────────────────────────────┐
│ ● 位置                                    │
│ [CG]  [CB]  [MT]  [HG]  [OG]  [DLR]      │
└──────────────────────────────────────────┘

改善後:
┌──────────────────────────────────────────┐
│ ● 位置                                    │
│ [CG] クローズドガード                     │
│ [CB] クロスボディ                         │
│ [MT] マウント                             │
│ [HG] ハーフガード                         │
│ [OG] オープンガード                       │
│ [DLR] デラヒーバ                          │
└──────────────────────────────────────────┘
```

**変更ポイント:**
- グリッド3カラムから縦リスト形式に変更
- 各アイテムに `code + name_ja` を表示
- `overflow-auto` で確実にスクロール可能に
- ポップオーバーに `onWheel` イベント伝播を許可

**実装:**
```typescript
// グリッド表示をリスト表示に変更
<div className="space-y-1">
  {notations?.map((n) => {
    const isLinked = linkedNotationIds.has(n.id);
    return (
      <button
        key={n.id}
        onClick={() => !isLinked && handleAdd(n.id)}
        disabled={isLinked || addNotation.isPending}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors",
          isLinked 
            ? "bg-primary/20 text-primary cursor-not-allowed" 
            : "hover:bg-muted cursor-pointer"
        )}
      >
        {isLinked && <Check className="w-3 h-3 flex-shrink-0" />}
        <span className="font-mono text-xs font-medium w-10">{n.code}</span>
        <span className="text-sm truncate">{n.name_ja}</span>
      </button>
    );
  })}
</div>
```

---

### 2. PlaylistsManagement.tsx - 大幅リファクタリング

**削除する要素:**
- 統計カード（4つの数字）
- 「再生リスト」「全動画ローカライズ」タブ
- 「全動画ローカライズ」タブの内容全体

**変更するレイアウト:**
```text
┌──────────────────────────────────────────────────────────┐
│ 📋 再生リスト                            [更新] [新規作成]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [サムネイル]  リスト名                              │  │
│ │              説明文...                              │  │
│ │              [公開] 10本 • 2024/01/24               │  │
│ │              [URL] [プレビュー] [動画管理] [編集] [削除]│  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [サムネイル]  別のリスト名                          │  │
│ │              ...                                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**動画管理ダイアログ - 略称ジェネレーター統合:**
```text
┌──────────────────────────────────────────────────────────┐
│ リスト名 の動画管理                                      │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📋 略称から自動追加                           [開く]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────┐ ┌─────────────────┐                 │
│ │ リスト内 (5本)  │ │ 追加可能 (120本) │                 │
│ │                 │ │                 │                 │
│ │ 1. [thumb] 技A  │ │ [thumb] 技X +   │                 │
│ │ 2. [thumb] 技B  │ │ [thumb] 技Y +   │                 │
│ │ ...             │ │ ...             │                 │
│ └─────────────────┘ └─────────────────┘                 │
└──────────────────────────────────────────────────────────┘
```

**カード形式リストの実装:**
```typescript
// テーブルをカード形式に変更
<div className="grid gap-4">
  {lists.map((list) => (
    <Card key={list.id} className="overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* サムネイル */}
        <div className="relative w-full sm:w-40 aspect-video sm:aspect-auto sm:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
          {list.cover_image_url || coverItem?.technique?.thumbnail_url ? (
            <img src={...} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {list.item_count > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
              {list.item_count}本
            </div>
          )}
        </div>
        
        {/* 情報 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="font-medium truncate">{list.name_ja || list.name}</h3>
            {list.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getVisibilityBadge(list.visibility)}
            <span className="text-xs text-muted-foreground">
              {list.item_count || 0}本 • {new Date(list.created_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>
        
        {/* アクションボタン */}
        <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => openItemsDialog(list)}>
            動画管理
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => copyListUrl(list)}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(list)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(list.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  ))}
</div>
```

**動画管理ダイアログに略称ジェネレーターを統合:**
```typescript
// 動画管理ダイアログ内
<Dialog open={isItemsDialogOpen} onOpenChange={setIsItemsDialogOpen}>
  <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
    <DialogHeader>
      <DialogTitle>{selectedList?.name_ja || selectedList?.name} の動画管理</DialogTitle>
    </DialogHeader>
    
    {/* 略称から追加ボタン */}
    <div className="flex gap-2 pb-4 border-b">
      <Button 
        variant="outline" 
        onClick={() => setShowNotationGenerator(true)}
        className="flex items-center gap-2"
      >
        <Tag className="w-4 h-4" />
        略称から自動追加
      </Button>
    </div>
    
    {/* 既存のリスト管理UI */}
    <div className="flex-1 overflow-y-auto">
      ...
    </div>
  </DialogContent>
</Dialog>

{/* 略称ジェネレーターダイアログ */}
{selectedList && (
  <NotationPlaylistGenerator
    open={showNotationGenerator}
    onOpenChange={setShowNotationGenerator}
    listId={selectedList.id}
    existingTechniqueIds={listItems.map(item => item.technique_id)}
    onVideosAdded={() => {
      fetchListItems(selectedList.id);
      fetchLists();
    }}
  />
)}
```

---

## レスポンシブ対応

**PC表示:**
- カードは横並び（サムネイル左、情報中央、ボタン右）
- ボタンは縦に並べる

**スマホ表示:**
- カードは縦積み（サムネイル上、情報中央、ボタン下）
- サムネイルは全幅
- ボタンは横並び

---

## 追加インポート

```typescript
// NotationSelector.tsx - 変更なし

// PlaylistsManagement.tsx
import { Tag } from "lucide-react";
import { NotationPlaylistGenerator } from "@/components/admin/NotationPlaylistGenerator";
```

---

## 実装順序

1. NotationSelector.tsx のレイアウトを変更（コード + 日本語名の縦リスト化）
2. NotationSelector.tsx のスクロール問題を修正
3. PlaylistsManagement.tsx のタイトルを「再生リスト」に変更
4. 統計カードを削除
5. タブを削除してリスト表示のみに
6. テーブルをカード形式に変更
7. 動画管理ダイアログにNotationPlaylistGeneratorを統合
8. レスポンシブ対応の確認

