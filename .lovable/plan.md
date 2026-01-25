
## 動画管理機能の改善計画

### 概要
ユーザーからの4つのリクエストを実装します：

1. **限定公開動画でも技術タグを登録・表示**
2. **編集画面で技術タグにコードと名前の両方を表示**
3. **編集画面の多言語フィールドを言語切り替え方式に変更**
4. **新規動画登録時に文字起こしから日本語名・説明・技術タグを自動抽出**

---

### 変更1: 限定公開動画での技術タグ対応

**現状の問題:**
- 技術タグ（Notation）は全visibilityの動画に対して登録可能（技術的制約なし）
- 確認の結果、現在のコードでは既に限定公開動画でも技術タグを登録できる仕組み

**確認ポイント:**
- `technique_notations`テーブルはtechnique_idで紐づくため、visibilityに関係なく登録可能
- VideoCardでもnotationsを表示する仕組みが既に存在
- 現状で対応済みのため、追加の変更は不要

---

### 変更2: NotationSelectorでコード+名前を表示

**現状:**
- 選択時にコードのみがバッジに表示される（例: `[CG]`）

**変更内容:**
- バッジにコードと日本語名の両方を表示（例: `[CG] クローズドガード`）
- VideoCardでは既に対応済み（`[{n.code}] {n.name_ja}`）
- NotationSelectorの選択済みバッジも同様に更新

**修正ファイル:** `src/components/admin/NotationSelector.tsx`

```tsx
// 現在（Line 88-91）
<Badge>
  {notation.code}
</Badge>

// 変更後
<Badge>
  <span className="font-mono">[{notation.code}]</span>
  <span className="ml-1 truncate">{notation.name_ja}</span>
</Badge>
```

---

### 変更3: 編集画面の言語切り替え方式

**現状:**
- 日本語名、英語名、ポルトガル語名が個別フィールドとして縦に並ぶ
- 説明のみがタブ切り替え方式

**変更内容:**
- 名前フィールドを言語タブ方式に統一
- 説明フィールドも同じタブに統合
- デフォルトは日本語
- 他の言語に内容がない場合、日本語を翻訳して自動入力

**修正ファイル:** `src/components/admin/VideosManagement.tsx`

**変更前の構造:**
```text
┌─────────────────────────────┐
│ 日本語名 [____________]     │
│ 英語名   [____________]     │
│ ポルトガル語名 [________]    │
│ 公開設定 [▼]                │
│ 技術タグ [...]              │
│ 説明 [日本語|英語|PT]       │
│ [テキストエリア]            │
└─────────────────────────────┘
```

**変更後の構造:**
```text
┌─────────────────────────────┐
│ 言語 [日本語 ▼]             │  ← 言語セレクター（12言語対応）
├─────────────────────────────┤
│ 名前 [____________]         │  ← 選択言語の名前
│ 説明 [テキストエリア]       │  ← 選択言語の説明
│ [🔄 翻訳] (他言語選択時)    │  ← 内容がなければ日本語から翻訳
├─────────────────────────────┤
│ 公開設定 [▼]                │
│ 技術タグ [...]              │
└─────────────────────────────┘
```

**formDataの拡張:**
```typescript
// 現在のformData
{
  name: "",       // 英語名
  name_ja: "",    // 日本語名
  name_pt: "",    // ポルトガル語名
  description: "", // 英語説明
  description_ja: "", // 日本語説明
  description_pt: "", // ポルトガル語説明
  // ...
}

// 拡張後（12言語対応）
{
  names: { ja: "", en: "", pt: "", es: "", fr: "", de: "", zh: "", ko: "", it: "", ru: "", ar: "", hi: "" },
  descriptions: { ja: "", en: "", pt: "", es: "", fr: "", de: "", zh: "", ko: "", it: "", ru: "", ar: "", hi: "" },
  // ...
}
```

**自動翻訳ロジック:**
- 言語を切り替えた時に該当言語のフィールドが空の場合
- 「翻訳を取得」ボタンを表示
- クリックすると`translate-text` Edge Functionで日本語から翻訳
- 翻訳結果をフォームに自動入力

---

### 変更4: 新規登録時のAI自動抽出フロー

**現状のフロー:**
1. 新規動画登録画面を開く
2. 動画ファイルを選択
3. 名前・説明等を手動入力
4. 保存
5. 保存後に自動文字起こしが開始

**変更後のフロー:**
1. 新規動画登録画面を開く
2. 動画ファイルを選択
3. **確認ダイアログ表示:**
   ```text
   ┌───────────────────────────────────────┐
   │ 動画からメタデータを自動抽出しますか？  │
   │                                       │
   │ 文字起こしを行い、AIが以下を抽出します：│
   │ ・日本語タイトル                       │
   │ ・日本語説明文                         │
   │ ・技術タグ（推奨）                     │
   │                                       │
   │ [スキップして編集]  [自動抽出する]     │
   └───────────────────────────────────────┘
   ```
4. **「自動抽出する」を選択した場合:**
   - まず動画をアップロード
   - 文字起こし実行
   - AI（Lovable AI）で名前・説明・タグを抽出
   - 抽出結果を編集画面に表示
5. **「スキップして編集」を選択した場合:**
   - 従来通り手動編集画面を開く

**新規Edge Function: `extract-video-metadata`**

```typescript
// supabase/functions/extract-video-metadata/index.ts
// 文字起こしテキストからAIで以下を抽出:
// - title_ja: 動画のタイトル（日本語）
// - description_ja: 動画の説明文（日本語）
// - suggested_notations: 推奨技術タグのコード配列

const prompt = `
以下の柔術テクニック動画の文字起こしテキストを分析してください。

【文字起こし】
${transcriptionText}

以下のJSON形式で回答してください：
{
  "title_ja": "テクニック名（日本語、簡潔に）",
  "description_ja": "テクニックの説明（1-2文）",
  "suggested_tags": ["CG", "ARM", "..."] // BJJ略称コード
}

利用可能な技術タグ:
${notationsList}
`;
```

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/NotationSelector.tsx` | バッジにコード+名前を表示 |
| `src/components/admin/VideosManagement.tsx` | 言語切り替え式フォーム + AI抽出確認ダイアログ |
| `supabase/functions/extract-video-metadata/index.ts` | 新規作成: AI抽出ロジック |

---

### 技術詳細

#### NotationSelector更新（Line 75-99）

```tsx
{linkedNotations.map((notation) => {
  const link = techniqueNotations?.find(tn => tn.notation_id === notation?.id);
  const categoryLabel = NOTATION_CATEGORY_LABELS[notation?.category as NotationCategory];
  return notation ? (
    <Badge
      key={notation.id}
      variant="secondary"
      className={cn(
        "text-xs font-mono max-w-[180px]",
        categoryLabel?.color,
        "text-white"
      )}
    >
      <span className="font-mono font-medium">[{notation.code}]</span>
      <span className="ml-1 truncate">{notation.name_ja}</span>
      {!readOnly && link && (
        <button
          onClick={() => handleRemove(link.id)}
          className="ml-1 hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  ) : null;
})}
```

#### 編集ダイアログの言語切り替え

```tsx
// 言語選択state追加
const [editLanguage, setEditLanguage] = useState<"ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi">("ja");

// 言語ごとの名前・説明をformDataから取得するヘルパー
const getNameField = (lang: string) => {
  if (lang === "en") return formData.name;
  return formData[`name_${lang}`] || "";
};

const getDescField = (lang: string) => {
  if (lang === "en") return formData.description;
  return formData[`description_${lang}`] || "";
};

// 翻訳ボタン（内容が空の場合のみ表示）
{editLanguage !== "ja" && !getNameField(editLanguage) && (
  <Button variant="outline" size="sm" onClick={() => translateFromJapanese(editLanguage)}>
    🔄 日本語から翻訳
  </Button>
)}
```

#### AI抽出確認ダイアログ

```tsx
// 新規動画アップロード後に表示
<AlertDialog open={showExtractConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>動画からメタデータを自動抽出しますか？</AlertDialogTitle>
      <AlertDialogDescription>
        文字起こしを行い、AIが以下を抽出します：
        <ul className="list-disc list-inside mt-2">
          <li>日本語タイトル</li>
          <li>日本語説明文</li>
          <li>技術タグ（推奨）</li>
        </ul>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={handleSkipExtraction}>
        スキップして編集
      </AlertDialogCancel>
      <AlertDialogAction onClick={handleAutoExtract}>
        自動抽出する
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 実装順序

1. **NotationSelector更新** - バッジ表示を改善
2. **編集ダイアログの言語切り替え** - formData構造を維持しつつUI変更
3. **extract-video-metadata Edge Function作成** - AI抽出ロジック
4. **新規登録フローの変更** - 確認ダイアログ追加
5. **デプロイとテスト**

---

### 期待される結果

**変更1:**
- 限定公開動画でも技術タグが正常に表示される（既に対応済み）

**変更2:**
- 編集画面の技術タグバッジに`[CG] クローズドガード`のように表示

**変更3:**
- 言語セレクターで日本語/英語/etc.を切り替え
- 選択言語の名前と説明を編集
- 内容がない言語は「翻訳を取得」ボタンで自動入力

**変更4:**
- 新規動画登録時に「自動抽出するか」確認
- 自動抽出を選択すると、文字起こし→AI分析→結果を編集画面に反映
