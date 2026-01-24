

# 略称フィルター・ツールチップ改善計画

## 要件

1. **略称マスターからの絞り込み** - 動画一覧で略称Selectフィルターを追加（動画数順で表示）
2. **動画数表示と多い順ソート** - 略称セレクトに動画件数を表示
3. **旧フィルター（カテゴリ/シリーズ）を管理ツールに移動** - 「旧絞り込み」として下部に寄せる
4. **略称バッジにツールチップ追加** - マウスオーバーで名前を表示

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideosManagement.tsx` | 略称フィルターSelect追加、旧フィルターを管理ツールに移動 |
| `src/components/admin/VideoCard.tsx` | 略称バッジにTooltip追加 |

---

## 技術詳細

### 1. VideosManagement.tsx - 略称フィルターの追加

**新規フィルターUI設計:**

```text
【現在】
┌────────────────────────────────────────────────────────────┐
│ [🔍 検索...]  [カテゴリー▼] [シリーズ▼] [並び順▼]          │
└────────────────────────────────────────────────────────────┘

【改善後】
┌────────────────────────────────────────────────────────────┐
│ [🔍 検索...]  [略称フィルター▼ (CG: 25件, SW: 18件...)]   │
│               [並び順▼]                                    │
└────────────────────────────────────────────────────────────┘

↓ 下部管理ツール内 ↓
┌────────────────────────────────────────────────────────────┐
│ 🔧 管理ツール                                              │
│   [旧絞り込み: カテゴリー▼] [シリーズ▼] ← 削除予定         │
│   [サムネイル修復] [動画時間取得] ...                       │
└────────────────────────────────────────────────────────────┘
```

**略称フィルターデータの取得:**
```typescript
// useNotationsフックを使用して動画数付きで取得
const { data: notationsForFilter } = useNotations();

// 動画数でソート済み（useNotations内でソート済み）
// notationsForFilter は technique_count の降順で並んでいる
```

**略称フィルターSelect:**
```typescript
<Select value={notationFilter} onValueChange={(value) => {
  setNotationFilter(value);
  // ラベルを設定
  const notation = notationsForFilter?.find(n => n.id === value);
  if (notation) {
    setNotationLabel(`${notation.code} - ${notation.name_ja}`);
  } else {
    setNotationLabel('');
  }
  setPage(1);
}}>
  <SelectTrigger className="w-full sm:w-[200px]">
    <SelectValue placeholder="略称で絞り込み" />
  </SelectTrigger>
  <SelectContent className="bg-background z-50 max-h-[300px]">
    <SelectItem value="all">すべて</SelectItem>
    {notationsForFilter?.map((notation) => (
      <SelectItem key={notation.id} value={notation.id}>
        <span className="font-mono">{notation.code}</span>
        <span className="ml-2 text-muted-foreground">{notation.name_ja}</span>
        <span className="ml-2 text-xs text-muted-foreground/70">
          ({notation.technique_count || 0}件)
        </span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 2. 旧フィルターを管理ツール内に移動

**管理ツールセクションに追加:**
```typescript
<Collapsible defaultOpen={false} className="mt-8 mb-4">
  <CollapsibleTrigger className="...">
    <div className="flex items-center gap-2">
      <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">管理ツール</span>
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3 space-y-3">
    
    {/* 旧絞り込み（削除予定） */}
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border border-dashed">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-xs text-muted-foreground">旧絞り込み（削除予定）:</span>
      <Select value={categoryFilter} onValueChange={(value) => {
        setCategoryFilter(value);
        setPage(1);
      }}>
        <SelectTrigger className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="カテゴリー" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">すべて</SelectItem>
          {availableCategories.map((category) => (
            <SelectItem key={category} value={category}>{category}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={seriesFilter} onValueChange={(value) => {
        setSeriesFilter(value);
        setPage(1);
      }}>
        <SelectTrigger className="w-[150px] h-7 text-xs">
          <SelectValue placeholder="シリーズ" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">すべて</SelectItem>
          {seriesMapping.map((mapping) => (
            <SelectItem key={mapping.series_prefix} value={mapping.series_prefix}>
              {mapping.series_prefix}. {mapping.series_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    
    {/* 既存の管理ボタン群 */}
    <div className="flex flex-wrap gap-2">
      ...
    </div>
  </CollapsibleContent>
</Collapsible>
```

### 3. VideoCard.tsx - 略称バッジにTooltip追加

**propsの拡張:**
```typescript
interface NotationBadge {
  code: string;
  category: string;
  name_ja?: string;  // 追加
  name_en?: string;  // 追加
}
```

**Tooltipでのラップ:**
```typescript
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

// 略称バッジ表示部分
{notations.slice(0, 5).map((n, idx) => (
  <Tooltip key={`${n.code}-${idx}`}>
    <TooltipTrigger asChild>
      <Badge 
        variant="secondary"
        className={cn(
          "text-[10px] px-1.5 py-0 h-5 font-mono text-white cursor-help",
          getNotationColor(n.category)
        )}
      >
        {n.code}
      </Badge>
    </TooltipTrigger>
    <TooltipContent side="top">
      <p className="text-sm">{n.name_ja || n.code}</p>
      {n.name_en && <p className="text-xs text-muted-foreground">{n.name_en}</p>}
    </TooltipContent>
  </Tooltip>
))}
```

### 4. VideosManagement.tsx - notationMapにname情報を追加

**データ取得の修正:**
```typescript
// Fetch notation links for all techniques - 名前情報も取得
const fetchNotationLinks = async () => {
  const { data: links, error } = await supabase
    .from('technique_notations')
    .select('technique_id, notation:bjj_notations(code, category, name_ja, name_en)');
  
  if (error) {
    console.error('Error fetching notation links:', error);
    return;
  }
  
  const map: Record<string, Array<{ code: string; category: string; name_ja?: string; name_en?: string }>> = {};
  links?.forEach((link: any) => {
    if (link.technique_id && link.notation) {
      if (!map[link.technique_id]) map[link.technique_id] = [];
      map[link.technique_id].push({
        code: link.notation.code,
        category: link.notation.category,
        name_ja: link.notation.name_ja,
        name_en: link.notation.name_en,
      });
    }
  });
  setNotationMap(map);
};
```

---

## UI/UX改善ポイント

1. **略称フィルターが目立つ位置に** - メインフィルターエリアに配置
2. **動画件数の視認性** - 略称セレクトに件数表示、多い順でソート
3. **レガシー機能の明示** - 「削除予定」ラベルで旧フィルターを区別
4. **ツールチップで詳細確認** - 略称バッジにマウスオーバーで名前表示

---

## 追加インポート

```typescript
// VideosManagement.tsx
import { useNotations } from "@/hooks/useNotations";
import { AlertTriangle } from "lucide-react"; // 既存

// VideoCard.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

---

## 実装順序

1. VideosManagement.tsx に useNotations フックをインポート
2. notationMap の型を拡張（name_ja, name_en を追加）
3. fetchNotationLinks で名前情報も取得
4. 略称フィルターSelectを追加（検索エリアに配置）
5. 旧カテゴリ/シリーズフィルターを管理ツールセクション内に移動
6. VideoCard.tsx のNotationBadgeインターフェース拡張
7. 略称バッジにTooltipを追加

