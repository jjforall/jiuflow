

# 技術編集ダイアログ改善計画

## 要件

1. **略称を複数選択可能に** - NotationSelectorを編集ダイアログに組み込む
2. **言語切り替えをプルダウン形式に** - ボタン形式からSelect/Dropdownに変更
3. **編集画面の整理** - ごちゃごちゃしたレイアウトを見やすく整理

---

## 現状の問題点

### 編集ダイアログ（VideosManagement.tsx: 2320-2634）
- フォームが縦に長く、スクロール量が多い
- 関連する項目がグループ化されていない
- 略称の選択機能がない
- 言語切り替えの視認性が低い

### VideoPreviewDialog
- 言語切り替えがボタン形式で横に並んでいる
- 言語数が多い場合に場所を取りすぎる

---

## 改善案

### 1. 編集ダイアログをセクション分けして整理

```text
┌─────────────────────────────────────────────────────────┐
│ 技術編集                                                 │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 基本情報                                          │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 日本語名 *     │ English Name * │ Portuguese Name * │ │
│ │ [入力欄]       │ [入力欄]       │ [入力欄]           │ │
│ │                                                     │ │
│ │ カテゴリ *     │ 公開設定                           │ │
│ │ [選択/入力]    │ [🌍一般公開 ▼]                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📚 シリーズ設定                                      │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ シリーズ名    │ プレフィックス │ 順序               │ │
│ │ [入力欄]      │ [自動：A]     │ [1]                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🏷️ 略称（複数選択可）                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [CG] [SW] [×]  [+略称を追加]                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 説明                                              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [タブ: 日本語 | English | Português]                 │ │
│ │ ┌───────────────────────────────────────────────────┐│ │
│ │ │                                                   ││ │
│ │ │ (現在選択中の言語の説明欄)                         ││ │
│ │ │                                                   ││ │
│ │ └───────────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎬 動画                                              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ファイル: [ファイルを選択]                          │ │
│ │ 現在の動画: ✓ アップロード済み                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ #️⃣ ハッシュタグ                                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [#closeGuard] [#sweep] [×]  [入力...] [追加]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [キャンセル] [更新]       │
└─────────────────────────────────────────────────────────┘
```

### 2. 言語切り替えをプルダウン形式に

**VideoPreviewDialog改善**

```text
現在:
[日本語] [English] [Português] [Español] [Français]...

改善後:
┌──────────────────────────────────────┐
│ 🌐 音声言語: [日本語（オリジナル）▼] │
│              ├────────────────────────│
│              │ 日本語（オリジナル）✓  │
│              │ English                │
│              │ Português              │
│              │ Español                │
│              └────────────────────────│
└──────────────────────────────────────┘
```

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideosManagement.tsx` | 編集ダイアログにNotationSelector追加、セクション分け |
| `src/components/admin/VideoPreviewDialog.tsx` | 言語切り替えをSelectプルダウンに変更 |

---

## 技術詳細

### VideosManagement.tsx - 編集ダイアログ改善

1. **セクションコンポーネントを追加**
```typescript
// セクションヘッダーコンポーネント
const FormSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
    {children}
  </div>
);
```

2. **NotationSelectorを略称セクションに追加**
```typescript
// 略称セクション（編集時のみ表示）
{editingTechnique && (
  <FormSection icon={<Tags className="h-4 w-4" />} title="略称">
    <NotationSelector techniqueId={editingTechnique.id} />
    <p className="text-xs text-muted-foreground">
      複数の略称を選択できます
    </p>
  </FormSection>
)}
```

3. **説明欄をタブ形式に**
```typescript
const [descriptionTab, setDescriptionTab] = useState<"ja" | "en" | "pt">("ja");

// 説明セクション
<FormSection icon={<FileText className="h-4 w-4" />} title="説明">
  <Tabs value={descriptionTab} onValueChange={(v) => setDescriptionTab(v as any)}>
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="ja">日本語</TabsTrigger>
      <TabsTrigger value="en">English</TabsTrigger>
      <TabsTrigger value="pt">Português</TabsTrigger>
    </TabsList>
    <TabsContent value="ja">
      <Textarea value={formData.description_ja} onChange={...} rows={4} />
    </TabsContent>
    <TabsContent value="en">
      <Textarea value={formData.description} onChange={...} rows={4} />
    </TabsContent>
    <TabsContent value="pt">
      <Textarea value={formData.description_pt} onChange={...} rows={4} />
    </TabsContent>
  </Tabs>
</FormSection>
```

### VideoPreviewDialog.tsx - プルダウン化

```typescript
// 現在のボタン形式を削除し、Selectに変更
<div className="flex items-center gap-3">
  <Globe className="h-4 w-4 text-muted-foreground" />
  <span className="text-sm text-muted-foreground">音声言語:</span>
  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
    <SelectTrigger className="w-[200px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {availableLanguages.map((lang) => (
        <SelectItem key={lang.code} value={lang.code}>
          <div className="flex items-center gap-2">
            {lang.isOriginal && <Check className="h-3 w-3" />}
            <span>{lang.label}</span>
            {lang.isOriginal && (
              <span className="text-xs text-muted-foreground">（オリジナル）</span>
            )}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## レイアウト改善のポイント

1. **グループ化** - 関連項目をセクションで囲む
2. **アイコン** - 各セクションにアイコンを付けて視認性向上
3. **余白** - セクション間に適切な余白を設定
4. **タブ化** - 説明欄は3言語をタブで切り替え（縦スクロールを削減）
5. **条件表示** - 略称セクションは編集時のみ表示（新規作成時は非表示）

---

## 追加インポート

```typescript
// VideosManagement.tsx に追加
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, FileText, Film, Hash } from "lucide-react";
import { NotationSelector } from "@/components/admin/NotationSelector";

// VideoPreviewDialog.tsx に追加
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

