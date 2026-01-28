
# 翻訳プロバイダーUI改善・HeyGenマッピング修正・2段階自動翻訳の実装計画

## 概要

3つの改善を実施します：
1. 翻訳プロバイダー選択UIの改善（成功率・対応言語の表示）
2. HeyGen言語マッピングの修正（Chinese → Mandarin）
3. 中国語翻訳時の2段階自動翻訳（ja → en → zh）

---

## 現状分析

### データベース統計（translation_history）
| プロバイダー | ソース | ターゲット | 完了 | 失敗 |
|-------------|--------|-----------|------|------|
| ElevenLabs | ja | en | 1 | 0 |
| ElevenLabs | en | zh | 1 | 0 |
| HeyGen | ja | en | 0 | 2 |
| HeyGen | ja | zh | 0 | 2 |

**結論**: HeyGenは日本語ソースで100%失敗、ElevenLabsは100%成功

### HeyGenの問題
- 現在 `zh: "Chinese"` とマッピング
- HeyGen APIは `"Mandarin"` を期待している可能性
- Scale/Enterpriseプラン制限の可能性もあり

---

## 変更内容

### 1. TranslationQuickDialog.tsx：プロバイダーUI改善

**追加データ構造**:
```typescript
interface ProviderInfo {
  id: 'elevenlabs' | 'rask' | 'heygen';
  name: string;
  supportedSourceLangs: string[];
  supportedTargetLangs: string[];
  notes: string;
  recommended?: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    supportedSourceLangs: ['ja', 'en', 'pt', 'es', 'fr', 'de', 'zh', 'ko'],
    supportedTargetLangs: ['en', 'pt', 'es', 'fr', 'de', 'zh', 'ko', 'it', 'ru'],
    notes: '日本語ソース対応、高品質',
    recommended: true,
  },
  {
    id: 'rask',
    name: 'Rask.ai',
    supportedSourceLangs: ['en', 'pt', 'es', 'fr', 'de'], // 日本語非対応
    supportedTargetLangs: ['en', 'pt', 'es', 'fr', 'de', 'zh', 'ko'],
    notes: '日本語ソース非対応',
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    supportedSourceLangs: ['en', 'pt', 'es', 'fr', 'de'],
    supportedTargetLangs: ['en', 'pt', 'es', 'fr', 'de', 'zh', 'ko'],
    notes: '日本語ソースは不安定（APIプラン制限）',
  },
];
```

**成功率の動的取得**:
```typescript
const [providerStats, setProviderStats] = useState<Record<string, { total: number; success: number }>>({});

useEffect(() => {
  const fetchStats = async () => {
    const { data } = await supabase
      .from('translation_history')
      .select('provider, status')
      .in('status', ['completed', 'failed', 'timeout']);
    
    if (data) {
      const stats: Record<string, { total: number; success: number }> = {};
      data.forEach(row => {
        if (!stats[row.provider]) stats[row.provider] = { total: 0, success: 0 };
        stats[row.provider].total++;
        if (row.status === 'completed') stats[row.provider].success++;
      });
      setProviderStats(stats);
    }
  };
  fetchStats();
}, [open]);
```

**改善後のUI表示**:
```
翻訳プロバイダー
┌─────────────────────────────────────────────────┐
│ ElevenLabs ★推奨                                │
│   成功率: 100% (2/2) | 日本語ソース ✓           │
├─────────────────────────────────────────────────┤
│ Rask.ai                                         │
│   成功率: - (実績なし) | 日本語ソース ✗         │
├─────────────────────────────────────────────────┤
│ HeyGen                                          │
│   成功率: 0% (0/4) | 日本語ソース ⚠             │
└─────────────────────────────────────────────────┘
```

### 2. heygen-translate-video/index.ts：言語マッピング修正

**変更箇所**: L17
```typescript
// 変更前
zh: "Chinese",

// 変更後
zh: "Mandarin",
```

HeyGen APIは中国語に対して `"Mandarin"` を使用する可能性が高い

### 3. TranslationQuickDialog.tsx：2段階自動翻訳

**ロジック**:
- ターゲット言語が `zh`（中国語）で、英語版がまだ存在しない場合
- 自動的に「ja → en」を先に実行
- 完了後に「en → zh」を実行（またはユーザーに促す）

**実装方法A: 警告表示 + 手動2段階**:
```typescript
// 中国語を選択時に英語版がなければ警告を表示
const needsTwoStepTranslation = targetLanguage === 'zh' 
  && sourceLanguage === 'ja' 
  && !translatedLangs.includes('en');

{needsTwoStepTranslation && (
  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm">
      <strong>2段階翻訳が必要です</strong>
      <p className="text-muted-foreground mt-1">
        日本語→中国語の直接翻訳は不安定です。先に日本語→英語に翻訳後、英語→中国語をお勧めします。
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          setTargetLanguage('en');
          setIsTwoStepMode(true);
        }}
      >
        日本語→英語を先に翻訳
      </Button>
    </div>
  </div>
)}
```

**実装方法B: 完全自動2段階翻訳**:
```typescript
const handleTranslate = async () => {
  // 中国語で英語版がない場合、2段階実行
  if (targetLanguage === 'zh' && sourceLanguage === 'ja' && !translatedLangs.includes('en')) {
    toast.info("2段階翻訳を開始", {
      description: "まず日本語→英語、次に英語→中国語の順で翻訳します",
    });
    
    // Step 1: ja → en
    await executeTranslation('ja', 'en');
    
    // Step 2 はステータス監視で完了後に自動トリガー
    // 翻訳履歴に「pending_second_step: zh」フラグを保存
    await supabase.from('translation_history').update({
      pending_second_step: 'zh'
    }).eq('project_id', projectId);
    
    return;
  }
  
  // 通常の単一翻訳
  await executeTranslation(sourceLanguage, targetLanguage);
};
```

**推奨: 方法A（警告表示 + 手動）**
- シンプルで透明性が高い
- ユーザーが意図を理解しやすい
- 自動化による予期しない課金を防止

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/components/admin/TranslationQuickDialog.tsx` | 修正 | プロバイダー成功率表示、2段階翻訳警告UI |
| `supabase/functions/heygen-translate-video/index.ts` | 修正 | `zh: "Mandarin"` に変更 |

---

## UI変更詳細

### プロバイダー選択の改善後

```
翻訳プロバイダー

┌─────────────────────────────────────────┐
│ ● ElevenLabs ★推奨                      │
│   成功率: 100% (2件) │ 日本語ソース ✓   │
│   高品質な吹き替え                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ○ Rask.ai                               │
│   成功率: -- │ 日本語ソース ✗           │
│   日本語をソースとして使用できません      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ○ HeyGen                                │
│   成功率: 0% (4件失敗) │ 日本語ソース ⚠  │
│   APIプラン制限の可能性あり              │
└─────────────────────────────────────────┘
```

### 2段階翻訳の警告表示

```
⚠ 2段階翻訳が必要です

日本語→中国語の直接翻訳は不安定です。
先に日本語→英語に翻訳後、英語→中国語をお勧めします。

[日本語→英語を先に翻訳]
```

---

## 期待される効果

1. **プロバイダー選択の改善**: 実績データに基づいて最適なプロバイダーを選択可能
2. **HeyGen中国語修正**: `Mandarin`マッピングで成功率向上の可能性
3. **2段階翻訳ガイダンス**: ja→zh直接翻訳の失敗を防止、ユーザーに明確な手順を提示
4. **透明性向上**: 各プロバイダーの制限が一目でわかる
