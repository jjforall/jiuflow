
# 吹き替え表示とソート機能の追加計画

## 概要

ユーザー画面（テクニックマップ）に以下の機能を追加します：
1. 各動画に吹き替えがあることを表示
2. 選択中の言語の吹き替えがある動画を優先的に上部に表示

---

## 変更内容

### 1. テクニックマップ（Map.tsx）に吹き替えバッジを追加

**ファイル**: `src/pages/Map.tsx`

現在、テクニック一覧には視聴済みバッジ（✓）とお気に入りハート（♥）のみが表示されています。ここに吹き替え言語バッジを追加します。

**変更箇所**: 技術名の横に吹き替え対応言語を表示

```
変更前:
  [A-1] クローズドガードの基本 ✓ 👁 3 ♥

変更後:
  [A-1] クローズドガードの基本 ✓ 🎤EN 👁 3 ♥
```

**表示ロジック**:
- ユーザーが選択している言語（例: EN）の吹き替えがある場合のみ、その言語のバッジを表示
- 日本語選択時は吹き替えバッジは非表示（オリジナル音声のため）
- バッジは小さく控えめなデザイン（`🎤EN` 形式）

---

### 2. 吹き替え対応動画を上部に優先表示

**ファイル**: `src/pages/Map.tsx`

各シリーズ内で、ユーザーが選択している言語の吹き替えがある動画を先頭に表示します。

**ソート順**:
1. 選択言語の吹き替えがある動画 → 上部
2. 吹き替えがない動画 → 下部
3. 各グループ内では従来通り `series_order` でソート

**例（英語選択時）**:
```
変更前:
  A-1 技術A（吹替なし）
  A-2 技術B（EN吹替あり）
  A-3 技術C（吹替なし）
  A-4 技術D（EN吹替あり）

変更後:
  A-2 技術B（EN吹替あり）🎤EN
  A-4 技術D（EN吹替あり）🎤EN
  A-1 技術A（吹替なし）
  A-3 技術C（吹替なし）
```

---

### 3. LocalizationBadges コンポーネントの拡張

**ファイル**: `src/components/ui/LocalizationBadges.tsx`

新しい props を追加して、ユーザー画面向けの簡潔な表示モードをサポート：

```typescript
interface LocalizationBadgesProps {
  // 既存
  subtitleLanguages?: string[];
  dubbedLanguages?: string[];
  hasTranscription?: boolean;
  compact?: boolean;
  // 新規追加
  highlightLanguage?: string;  // 強調表示する言語（ユーザー選択言語）
  userFacing?: boolean;        // ユーザー画面向けの簡潔表示
}
```

**userFacing=true の表示**:
- 選択言語の吹き替えがある場合のみバッジを表示
- 「🎤EN」のような最小限の表示
- より目立つが邪魔にならないデザイン

---

## 技術的詳細

### Map.tsx の変更箇所

#### 1. Technique インターフェースにヘルパー関数を追加（L50付近）

```typescript
// 吹き替え言語を取得するヘルパー関数
const getDubbedLanguages = (tech: Technique): string[] => {
  const langs: string[] = [];
  
  // video_metadata から翻訳済み言語を取得
  if (tech.video_metadata && typeof tech.video_metadata === 'object') {
    Object.keys(tech.video_metadata).forEach(lang => {
      if (tech.video_metadata[lang]?.video_url && lang !== 'ja') {
        langs.push(lang);
      }
    });
  }
  
  // レガシーフィールドをチェック
  if (tech.video_url_pt && !langs.includes('pt')) {
    langs.push('pt');
  }
  
  return langs;
};

// 選択言語の吹き替えがあるかチェック
const hasDubbingForLanguage = (tech: Technique, lang: string): boolean => {
  if (lang === 'ja') return true; // オリジナル
  const dubbedLangs = getDubbedLanguages(tech);
  return dubbedLangs.includes(lang);
};
```

#### 2. ソート関数の追加（L670付近）

```typescript
// シリーズ内の技術をソート（吹き替え優先）
const sortTechniquesWithDubbingPriority = (techs: Technique[], lang: string) => {
  return [...techs].sort((a, b) => {
    const aHasDub = hasDubbingForLanguage(a, lang);
    const bHasDub = hasDubbingForLanguage(b, lang);
    
    // 吹き替えありを優先
    if (aHasDub && !bHasDub) return -1;
    if (!aHasDub && bHasDub) return 1;
    
    // 同じ場合は series_order でソート
    return (a.series_order || 0) - (b.series_order || 0);
  });
};
```

#### 3. レンダリング部分の変更（L671-710付近）

```typescript
{sortTechniquesWithDubbingPriority(seriesTechs, language)
  .map((tech, index) => {
    const viewCount = videoViews[tech.id];
    const isWatched = viewCount && viewCount > 0;
    const dubbedLanguages = getDubbedLanguages(tech);
    const hasCurrentLangDub = language !== 'ja' && hasDubbingForLanguage(tech, language);
    
    return (
      <div key={tech.id} className="...">
        {/* 既存のコンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h4 className="...">{getTechniqueName(tech)}</h4>
            {/* 吹き替えバッジを追加 */}
            {hasCurrentLangDub && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                <Mic className="w-2.5 h-2.5" />
                {language.toUpperCase()}
              </span>
            )}
            {isWatched && (...)}
          </div>
        </div>
      </div>
    );
  })}
```

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/pages/Map.tsx` | 修正 | 吹き替えバッジ追加、ソートロジック変更 |
| `src/components/ui/LocalizationBadges.tsx` | 修正 | `highlightLanguage` props追加（オプション） |

---

## UI/UXの考慮事項

### バッジデザイン
- 小さく控えめ（10px フォント）
- プライマリカラーのソフトな背景
- マイクアイコン + 言語コード（例: 🎤EN）

### 日本語ユーザー
- 日本語選択時は吹き替えバッジ非表示（オリジナル音声のため）
- ソート順も通常通り（series_order）

### 非日本語ユーザー
- 選択言語の吹き替えがある動画に目立つバッジ表示
- 吹き替えあり動画が上部に表示され、探しやすくなる

---

## 期待される効果

1. **発見性の向上**: ユーザーは自分の言語で視聴できる動画をすぐに見つけられる
2. **エンゲージメント向上**: 吹き替え動画が優先表示されることで視聴率アップ
3. **翻訳価値の可視化**: 翻訳作業の成果がユーザーに直接見える形で表示される
