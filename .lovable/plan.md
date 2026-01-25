

## 問題分析

調査の結果、以下の3つの問題が確認されました：

### 1. 動画時間取得の失敗

**原因**: `admin-update-video-durations` Edge Functionが403エラー（Forbidden）を返しています。

コンソールログに表示されているエラー：
```
[Duration Fetch] Supabase invoke error: FunctionsHttpError: Edge Function returned a non-2xx status code
```

**根本原因**:
Edge Function内でadmin権限チェックを行う際、Supabaseクライアントの初期化方法に問題があります：

```typescript
// 現在のコード（問題あり）
const supabaseUser = createClient(supabaseUrl, anonKey);
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser(token);
```

この方法では、RLSが有効な`user_roles`テーブルに対するクエリが失敗します。クライアントをユーザーのトークンでスコープする必要があります：

```typescript
// 修正後
const supabaseUser = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
  auth: { persistSession: false },
});
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
```

---

### 2. 吹き替え機能が動作しない

**原因**: 2つの問題があります：

1. **TranslationQuickDialogの`onTranslationStarted`コールバックが空**

現在のコード（VideosManagement.tsx 2398-2400行）：
```typescript
onTranslationStarted={() => {
  // Refresh data after translation starts
}}
```

コールバックが何もしていないため、翻訳を開始しても`activeTranslations`に追加されません。

2. **進行中の翻訳が追跡されない**

`TranslationQuickDialog`は翻訳を開始しますが、`projectId`や進行状況を親コンポーネントに渡していません。そのため、`VideosManagement`側で進行状況を追跡できません。

---

### 3. 吹き替え中のステータス表示がない

**原因**: 上記の問題により、`activeTranslations`配列に翻訳タスクが追加されないため、進行中表示が出ません。

また、`VideoCard`コンポーネントには`processingLanguages` propがありますが、これが正しく渡されていません：

現在のVideoCard呼び出し（2225行付近）：
```typescript
<VideoCard
  ...
  processingLanguages={[]}  // 常に空配列
  ...
/>
```

---

## 修正計画

### ステップ1: admin-update-video-durations Edge Functionの修正

Supabaseクライアントの初期化を修正し、ユーザートークンを適切にスコープします：

```typescript
// 変更前
const supabaseUser = createClient(supabaseUrl, anonKey);
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser(token);

// 変更後
const supabaseUser = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
  auth: { persistSession: false },
});
const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
```

---

### ステップ2: TranslationQuickDialogの修正

翻訳開始時に必要な情報を親コンポーネントに渡すように変更：

1. `onTranslationStarted`の型を拡張
2. 翻訳開始成功時に`projectId`、`targetLanguage`、`provider`を返す

```typescript
interface TranslationQuickDialogProps {
  // ...
  onTranslationStarted?: (info: {
    projectId: string;
    techniqueId: string;
    techniqueName: string;
    targetLang: string;
    provider: 'rask' | 'elevenlabs' | 'heygen';
  }) => void;
}
```

---

### ステップ3: VideosManagementの修正

1. **onTranslationStartedコールバックを実装**:

```typescript
onTranslationStarted={(info) => {
  // activeTranslationsに追加
  setActiveTranslations(prev => [...prev, {
    projectId: info.projectId,
    techniqueId: info.techniqueId,
    techniqueName: info.techniqueName,
    targetLang: info.targetLang,
    startTime: Date.now(),
    provider: info.provider,
  }]);
  
  // ダイアログを閉じる
  setTranslationDialogTechnique(null);
  
  // トースト通知
  toast.info('吹き替え翻訳を開始しました', {
    description: `${info.techniqueName}の翻訳をバックグラウンドで処理中...`
  });
}}
```

2. **processingLanguagesを正しく算出**:

```typescript
// 進行中の言語を取得するヘルパー関数
const getProcessingLanguagesForTechnique = (techniqueId: string): string[] => {
  return activeTranslations
    .filter(t => t.techniqueId === techniqueId)
    .map(t => t.targetLang);
};

// VideoCardに渡す
<VideoCard
  ...
  processingLanguages={getProcessingLanguagesForTechnique(technique.id)}
  ...
/>
```

---

### ステップ4: 進行中表示の強化

**VideosManagementに進行中翻訳の表示セクションを追加**:

動画リストの上部に、現在進行中の翻訳タスクを表示するカードを追加：

```text
+---------------------------------------------------+
| 🔄 吹き替え翻訳処理中 (2件)                          |
+---------------------------------------------------+
| ▶ クローズドガード基礎 → English  (02:34経過)  [確認] |
| ▶ マウントエスケープ → Português (01:12経過)  [確認] |
+---------------------------------------------------+
```

**VideoCard内の進行中表示**:

`LocalizationStatus`コンポーネントは既に`processingLanguages`を受け取って表示する機能がありますが、データが渡されていませんでした。上記の修正により、処理中の言語にはパルスアニメーション付きのバッジが表示されます。

---

## 技術的な詳細

### 修正が必要なファイル

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/admin-update-video-durations/index.ts` | Supabaseクライアントのトークンスコープ修正 |
| `src/components/admin/TranslationQuickDialog.tsx` | `onTranslationStarted`の型拡張と情報の返却 |
| `src/components/admin/VideosManagement.tsx` | コールバック実装、processingLanguages算出、進行中表示セクション追加 |

### Edge Functionの再デプロイ

`admin-update-video-durations`は修正後に再デプロイが必要です。

