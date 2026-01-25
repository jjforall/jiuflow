
## 動画管理画面の改善計画

### 概要
「特別講習」という概念を廃止し、動画を「公開・限定公開・非公開」の3状態で管理。動画一覧からvisibilityで絞り込み可能にし、特別講習タブを削除します。

---

### 変更内容

#### 1. 特別講習タブの削除
以下のファイルから「特別講習」メニュー項目を削除します。

**ファイル:**
- `src/pages/AdminDashboard.tsx`: タブ定義とコンテンツ表示を削除
- `src/components/admin/AdminSidebar.tsx`: サイドバーメニュー項目を削除

#### 2. 動画一覧にvisibility絞り込みを追加
`VideosManagement.tsx`のフィルターセクションに公開設定の絞り込みを追加します。

**追加するフィルター:**
| 値 | 表示 | 説明 |
|---|---|---|
| all | すべて | 全動画を表示 |
| public | 公開 | 一般公開の動画 |
| unlisted | 限定公開 | URLを知っている人のみ |
| private | 非公開 | 管理者のみ |

**UIイメージ:**
```text
┌──────────────────────────────────────────────────────────────────┐
│  [🔍 検索...        ] [略称で絞り込み ▼] [公開設定 ▼] [並び順 ▼] │
│                                          ┌───────────┐           │
│                                          │ すべて    │           │
│                                          │ 🌐 公開   │           │
│                                          │ 🔗 限定   │           │
│                                          │ 🔒 非公開 │           │
│                                          └───────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

#### 3. 既存データのマイグレーション
データベースクエリで既存動画のvisibilityを更新します。

**更新ルール:**
1. 略称が未割り当ての動画 → `unlisted`（限定公開）に変更
2. 略称が割り当て済みで `visibility` が未設定の動画 → `public`（公開）のまま

**実行するSQLクエリ:**
```sql
-- 略称が割り当てられていない動画を限定公開に変更
UPDATE techniques t
SET visibility = 'unlisted'
WHERE NOT EXISTS (
  SELECT 1 FROM technique_notations tn 
  WHERE tn.technique_id = t.id
)
AND visibility = 'public';
```

#### 4. usePaginatedTechniquesフックにvisibilityフィルターを追加
`src/hooks/usePaginatedTechniques.tsx`にvisibilityによるフィルタリング機能を追加します。

**変更点:**
```typescript
interface TechniqueFilters {
  search?: string;
  category?: string;
  series?: string;
  notationId?: string;
  seriesType?: 'regular' | 'special' | 'all';
  visibility?: 'all' | 'public' | 'unlisted' | 'private'; // 追加
  sortBy?: 'order' | 'name' | 'category' | 'series' | 'created';
  sortDirection?: 'asc' | 'desc';
}

// フィルター適用部分に追加
if (filters.visibility && filters.visibility !== 'all') {
  query = query.eq('visibility', filters.visibility);
}
```

#### 5. VideoCardにvisibilityバッジを表示
動画カードにvisibility状態を示すバッジを追加します。

**表示例:**
- 🌐 公開: 緑系バッジ
- 🔗 限定公開: 黄系バッジ
- 🔒 非公開: 赤系バッジ

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/AdminDashboard.tsx` | special-videosタブ削除 |
| `src/components/admin/AdminSidebar.tsx` | 特別講習メニュー項目削除 |
| `src/hooks/usePaginatedTechniques.tsx` | visibilityフィルター追加 |
| `src/components/admin/VideosManagement.tsx` | visibility絞り込みセレクト追加 |
| `src/components/admin/VideoCard.tsx` | visibilityバッジ表示 |

---

### 削除対象ファイル

| ファイル | 理由 |
|---------|-----|
| `src/components/admin/SpecialVideosManagement.tsx` | 機能統合により不要 |

---

### 実装順序

1. **usePaginatedTechniques.tsx**: visibilityフィルター機能を追加
2. **VideosManagement.tsx**: 絞り込みセレクトを追加
3. **VideoCard.tsx**: visibilityバッジを追加
4. **AdminDashboard.tsx + AdminSidebar.tsx**: 特別講習タブを削除
5. **データマイグレーション**: 略称未割り当て動画をunlistedに更新

---

### 技術詳細

#### VideosManagementに追加するセレクト
```tsx
// state追加
const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

// フィルターセクションに追加
<Select value={visibilityFilter} onValueChange={(value) => {
  setVisibilityFilter(value);
  setPage(1);
}}>
  <SelectTrigger className="w-full sm:w-[140px]">
    <SelectValue placeholder="公開設定" />
  </SelectTrigger>
  <SelectContent className="bg-background z-50">
    <SelectItem value="all">すべて</SelectItem>
    <SelectItem value="public">
      <div className="flex items-center gap-2">
        <Globe className="h-3 w-3" />
        公開
      </div>
    </SelectItem>
    <SelectItem value="unlisted">
      <div className="flex items-center gap-2">
        <Link className="h-3 w-3" />
        限定公開
      </div>
    </SelectItem>
    <SelectItem value="private">
      <div className="flex items-center gap-2">
        <Lock className="h-3 w-3" />
        非公開
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

#### VideoCardのvisibilityバッジ
```tsx
// technique.visibility に基づいてバッジを表示
{technique.visibility === 'unlisted' && (
  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
    <Link className="h-3 w-3 mr-1" />
    限定公開
  </Badge>
)}
{technique.visibility === 'private' && (
  <Badge variant="outline" className="bg-red-500/10 text-red-600">
    <Lock className="h-3 w-3 mr-1" />
    非公開
  </Badge>
)}
```

---

### 期待される結果

**修正前:**
- 「特別講習」タブで略称未割り当て動画を別管理
- 動画一覧でvisibilityでの絞り込み不可

**修正後:**
- 全動画が「動画一覧」で一元管理
- visibility（公開・限定公開・非公開）で絞り込み可能
- 動画カードにvisibility状態が表示される
- 動画編集から公開設定を変更可能（既存機能）
