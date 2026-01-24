
# 動画翻訳管理画面の改善計画

## 現状分析

### 1. 「G」表示について
- データベースには「G」シリーズは存在しません（A〜Fのみ）
- 「次: G」という表示は`getNextAvailablePrefix()`関数が次に使えるプレフィックスを計算している結果
- **対応**: この「次: G」という行を削除します

### 2. 非アクティブ言語の表示問題
現在の`LocalizationStatus.tsx`では、字幕・吹替がない言語も「✗」マーク付きで表示されています：

```
字幕: JA✓ EN✗ PT✗
吹替: JA○ EN✗ PT✗
```

**ユーザー要望**: 翻訳がない言語は表示しない（存在するものだけ表示）

### 3. 変換中ステータスの表示
翻訳が進行中の場合、その言語バッジに「変換中」状態を表示する

### 4. クリックで再生
アクティブな言語バッジをクリックすると、その言語版の動画を再生できるようにする

---

## 実装内容

### 変更ファイル1: `src/components/admin/VideosManagement.tsx`
**「次: G」行の削除**

行2103-2105の削除：
```typescript
// 削除する箇所
<p className="text-[10px] text-muted-foreground mt-1.5">
  次: {getNextAvailablePrefix()}
</p>
```

### 変更ファイル2: `src/components/admin/LocalizationStatus.tsx`
**大幅なリファクタリング**

1. **存在する言語のみ表示**
   - 字幕・吹替がある言語だけをバッジ表示
   - なければ「字幕」「吹替」のラベル自体を非表示

2. **変換中ステータスの表示**
   - 新しいprops追加: `processingLanguages?: string[]`
   - 処理中の言語は点滅アイコン付きで「変換中」表示

3. **クリックで再生機能**
   - 新しいprops追加: `onPlayVideo?: (langCode: string) => void`
   - アクティブなバッジをクリックすると動画再生

改修後のイメージ：
```
字幕: JA✓ EN✓          ← 存在するもののみ表示
吹替: JA○ EN✓ [PT処理中...]  ← 変換中は点滅表示
```

### 変更ファイル3: `src/components/admin/VideoCard.tsx`
**LocalizationStatusへの新props渡し**

1. 処理中の言語情報を渡す
2. 再生ハンドラーを渡す

---

## 技術詳細

### LocalizationStatus コンポーネントの新インターフェース

```typescript
interface LocalizationStatusProps {
  hasTranscription: boolean;
  subtitleLanguages: string[];
  dubbedLanguages: string[];
  processingLanguages?: string[];     // 新規: 変換中の言語
  onGenerateSubtitle?: () => void;
  onAddDubbing?: () => void;
  onPlayVideo?: (langCode: string) => void;  // 新規: 再生コールバック
  compact?: boolean;
}
```

### 表示ロジックの変更

```typescript
// Before: すべての言語を表示
{LANGUAGES.map((lang) => { ... })}

// After: 存在する言語 + 処理中の言語のみ表示
const visibleLangs = LANGUAGES.filter(lang => 
  normalizedDubbing.includes(lang.code) || 
  processingLanguages?.includes(lang.code) ||
  lang.code === 'ja'
);
{visibleLangs.map((lang) => { ... })}
```

### 処理中表示のスタイル

```typescript
const isProcessing = processingLanguages?.includes(lang.code);
// 処理中の場合は点滅アニメーション付きで表示
<span className={cn(
  "px-1.5 py-0.5 rounded",
  isProcessing && "animate-pulse bg-yellow-500/20 text-yellow-600"
)}>
  {lang.label}
  {isProcessing ? "⏳" : "✓"}
</span>
```

### 再生フォーマットへの変換
現在の翻訳ワークフロー（ElevenLabs/Rask.ai/HeyGen）は完了後にCloudflare Streamへアップロードし、HLS形式のURLを保存しています。これは既に再生可能なフォーマットです。

もし変換が必要な場合は、check-translation-status等のEdge Functionで対応済みです。

---

## 変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `VideosManagement.tsx` | 「次: G」行を削除 |
| `LocalizationStatus.tsx` | 存在する言語のみ表示、変換中ステータス、クリック再生 |
| `VideoCard.tsx` | 新propsの受け渡し |

