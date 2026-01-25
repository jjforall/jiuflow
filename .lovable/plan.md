
## 動画翻訳処理時間記録と見込み時間表示機能

### 概要
動画の吹き替え翻訳について、どの動画が何分かかったかを記録し、新しい翻訳を開始する際に過去のデータに基づいて見込み時間を表示する機能を実装します。

---

### 変更内容

#### 1. 翻訳履歴テーブルの作成
新しいテーブル `translation_history` を作成して、翻訳処理の統計データを永続化します。

**テーブル構造:**
| カラム名 | 型 | 説明 |
|---------|---|------|
| id | uuid | プライマリキー |
| technique_id | uuid | 技術（動画）ID |
| source_language | text | ソース言語（例: ja） |
| target_language | text | ターゲット言語（例: en） |
| provider | text | 翻訳プロバイダー（elevenlabs/rask/heygen） |
| video_duration_seconds | integer | 動画の長さ（秒） |
| processing_duration_seconds | integer | 処理にかかった時間（秒） |
| started_at | timestamp | 開始日時 |
| completed_at | timestamp | 完了日時 |
| status | text | 結果（completed/failed） |
| project_id | text | プロバイダーのプロジェクトID |
| created_at | timestamp | 作成日時 |

**RLSポリシー:**
- 管理者のみがアクセス可能

---

#### 2. 翻訳開始時に履歴レコードを作成
翻訳を開始した際に、`translation_history` に新しいレコードを作成します。

**変更箇所:**
- `src/components/admin/TranslationQuickDialog.tsx`
- `src/components/admin/VideoTranslationManagement.tsx`

```typescript
// handleTranslate 内
const historyRecord = {
  technique_id: technique.id,
  source_language: sourceLanguage,
  target_language: targetLanguage,
  provider: translationProvider,
  video_duration_seconds: Math.floor(videoDuration || 0),
  started_at: new Date().toISOString(),
  status: 'processing',
  project_id: data.projectId,
};

await supabase.from('translation_history').insert(historyRecord);
```

---

#### 3. 翻訳完了時に処理時間を記録
ステータスチェック完了時に、`completed_at` と `processing_duration_seconds` を更新します。

**変更箇所:**
- `src/components/admin/VideoTranslationManagement.tsx` の `manualCheckTranslation` 関数

```typescript
// 完了時
if (isCompleted && statusData?.videoUrl) {
  // 履歴レコードを更新
  await supabase
    .from('translation_history')
    .update({
      completed_at: new Date().toISOString(),
      processing_duration_seconds: Math.floor((Date.now() - translation.startTime) / 1000),
      status: 'completed',
    })
    .eq('project_id', translation.projectId);
}
```

---

#### 4. 見込み時間の計算と表示
翻訳ダイアログを開いた際に、過去の履歴から見込み時間を計算して表示します。

**計算ロジック:**
1. 同じプロバイダー、同じ言語ペア（ソース→ターゲット）の過去の成功履歴を取得
2. 動画の長さに対する処理時間の平均比率を計算
3. 現在の動画の長さに基づいて見込み時間を推定

```typescript
// 見込み時間の計算
const getEstimatedDuration = async (
  provider: string,
  sourceLang: string,
  targetLang: string,
  videoDuration: number
): Promise<number | null> => {
  const { data: history } = await supabase
    .from('translation_history')
    .select('video_duration_seconds, processing_duration_seconds')
    .eq('provider', provider)
    .eq('source_language', sourceLang)
    .eq('target_language', targetLang)
    .eq('status', 'completed')
    .not('processing_duration_seconds', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (!history || history.length === 0) return null;

  // 動画長と処理時間の比率の平均を計算
  const avgRatio = history.reduce((sum, h) => {
    return sum + (h.processing_duration_seconds / h.video_duration_seconds);
  }, 0) / history.length;

  return Math.ceil(videoDuration * avgRatio);
};
```

**UI表示:**
```text
┌─────────────────────────────────────────┐
│  🎙️ 吹き替え翻訳                        │
│                                         │
│  ソース: 日本語 → ターゲット: English    │
│  プロバイダー: ElevenLabs               │
│                                         │
│  📊 見込み時間                          │
│  ┌─────────────────────────────────┐   │
│  │ この動画（3分20秒）の翻訳には    │   │
│  │ 約 8〜12分 かかる見込みです      │   │
│  │                                  │   │
│  │ ※ 過去10件の同条件翻訳実績に    │   │
│  │   基づく推定値です               │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [翻訳を開始]                    │
└─────────────────────────────────────────┘
```

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| 新規マイグレーション | `translation_history` テーブル作成 |
| `src/components/admin/TranslationQuickDialog.tsx` | 履歴作成、見込み時間表示 |
| `src/components/admin/VideoTranslationManagement.tsx` | 履歴更新（完了/失敗時） |

---

### データの流れ

```text
┌─────────────────────────────────────────────────────────────┐
│                     翻訳開始時                               │
├─────────────────────────────────────────────────────────────┤
│  1. ダイアログを開く                                         │
│  2. 過去の履歴から見込み時間を計算・表示                       │
│  3. 「翻訳開始」クリック                                      │
│  4. translation_history に status='processing' で INSERT     │
│  5. プロバイダーAPI呼び出し                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     処理中                                   │
├─────────────────────────────────────────────────────────────┤
│  - activeTranslations でリアルタイム経過時間表示              │
│  - 「確認」ボタンでステータスチェック                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     完了時                                   │
├─────────────────────────────────────────────────────────────┤
│  1. ステータスチェックで completed を検出                     │
│  2. translation_history を UPDATE:                           │
│     - completed_at = now()                                   │
│     - processing_duration_seconds = 経過秒数                 │
│     - status = 'completed' or 'failed'                      │
│  3. 次回以降の見込み時間計算に活用                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 技術詳細

#### マイグレーションSQL
```sql
CREATE TABLE translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id UUID NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  provider TEXT NOT NULL,
  video_duration_seconds INTEGER,
  processing_duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'processing',
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLSを有効化
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admins can manage translation history"
  ON translation_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- インデックス（見込み時間計算のクエリ最適化）
CREATE INDEX idx_translation_history_lookup 
  ON translation_history (provider, source_language, target_language, status);
```

#### 見込み時間の表示ロジック
```typescript
// TranslationQuickDialog.tsx に追加
const [estimatedDuration, setEstimatedDuration] = useState<{
  min: number;
  max: number;
  sampleCount: number;
} | null>(null);

useEffect(() => {
  if (open && videoDuration && translationProvider) {
    fetchEstimatedDuration();
  }
}, [open, videoDuration, translationProvider, sourceLanguage, targetLanguage]);

const fetchEstimatedDuration = async () => {
  const { data: history } = await supabase
    .from('translation_history')
    .select('video_duration_seconds, processing_duration_seconds')
    .eq('provider', translationProvider)
    .eq('source_language', sourceLanguage)
    .eq('target_language', targetLanguage)
    .eq('status', 'completed')
    .not('processing_duration_seconds', 'is', null)
    .not('video_duration_seconds', 'is', null)
    .gt('video_duration_seconds', 0)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (history && history.length >= 2) {
    const ratios = history.map(h => 
      h.processing_duration_seconds / h.video_duration_seconds
    );
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const minRatio = Math.min(...ratios);
    const maxRatio = Math.max(...ratios);

    setEstimatedDuration({
      min: Math.ceil(videoDuration * minRatio / 60),
      max: Math.ceil(videoDuration * maxRatio / 60),
      sampleCount: history.length,
    });
  } else {
    setEstimatedDuration(null);
  }
};
```

#### 見込み時間UI
```tsx
{estimatedDuration && (
  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
    <div className="flex items-start gap-2">
      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <strong>見込み時間: 約{estimatedDuration.min}〜{estimatedDuration.max}分</strong>
        <p className="text-xs text-muted-foreground mt-1">
          ※ 過去{estimatedDuration.sampleCount}件の同条件翻訳実績に基づく推定値
        </p>
      </div>
    </div>
  </div>
)}

{!estimatedDuration && videoDuration && (
  <div className="p-3 bg-muted/50 rounded-lg">
    <p className="text-sm text-muted-foreground">
      見込み時間: 通常5〜15分程度
      <span className="text-xs block mt-1">
        ※ この条件での翻訳実績がまだありません
      </span>
    </p>
  </div>
)}
```
