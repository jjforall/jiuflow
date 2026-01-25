

## 吹き替え機能の問題分析と修正計画

### 調査結果

すべての3つのプロバイダー（ElevenLabs、Rask.ai、HeyGen）のEdge Functionとフロントエンドコードを詳細に調査しました。APIドキュメントも確認し、以下の問題を特定しました。

---

### 問題1: Edge Functionがデプロイされていない可能性

Edge Functionのログが空（`No logs found`）であることから、Edge Functionが正しくデプロイされていないか、または一度も呼び出されていない可能性があります。

**修正**:
- すべての翻訳関連Edge Functionを再デプロイ
  - `translate-video`（ElevenLabs）
  - `rask-translate-video`（Rask.ai）
  - `heygen-translate-video`（HeyGen）
  - `check-translation-status`（ElevenLabs）
  - `rask-check-status`（Rask.ai）
  - `heygen-check-status`（HeyGen）

---

### 問題2: TranslationQuickDialogでの成功判定が不十分

現在のコードでは`data.projectId`の存在のみをチェックしていますが、各プロバイダーが返すレスポンス形式が異なります：

| プロバイダー | 返されるID |
|-------------|-----------|
| ElevenLabs | `dubbing_id` → `projectId`にマッピング済み |
| Rask.ai | `projectId` + `videoId` |
| HeyGen | `video_translate_id` → `projectId`にマッピング済み |

また、`data.success`も確認すべきです。

**修正** (`TranslationQuickDialog.tsx`):
```typescript
// 変更前
if (data && data.projectId) {

// 変更後
if (data && data.success && data.projectId) {
```

---

### 問題3: translate-video (ElevenLabs) のCloudflare共有モジュールが不足

`translate-video/index.ts`では、Cloudflare Stream API を直接実装していますが、他の2つのプロバイダーは`_shared/cloudflare-download.ts`を使用しています。実装の一貫性を保つために、共有モジュールを使用するように修正します。

**修正** (`translate-video/index.ts`):
```typescript
// 変更前 - 直接実装
async function getCloudflareDownloadUrl(videoId: string): Promise<string | null> { ... }

// 変更後 - 共有モジュールを使用
import { getCloudflareStreamDownloadUrl } from "../_shared/cloudflare-download.ts";
```

---

### 問題4: HeyGen check-status の video_metadata 更新形式が他と異なる

HeyGenのステータスチェック時、`video_metadata`の更新形式が他のプロバイダーと異なります：

**現在のコード**（heygen-check-status）:
```typescript
const translations = existingMetadata.translations || {};
translations[targetLanguage] = { url, provider, created_at };
// metadata.translations[lang] に保存
```

**他のプロバイダー**（rask-check-status）:
```typescript
const updatedMetadata = {
  ...existingMetadata,
  [targetLanguage]: { video_url, provider, created_at }
};
// metadata[lang] に保存
```

フロントエンドは`video_metadata[lang].video_url`を参照しているため、HeyGenの形式では動画URLが正しく取得できません。

**修正** (`heygen-check-status/index.ts`):
```typescript
// 変更後 - 他のプロバイダーと同じ形式
const updatedMetadata = {
  ...existingMetadata,
  [targetLanguage]: {
    video_url: cloudflareUrl,
    provider: "heygen",
    created_at: new Date().toISOString(),
  },
};
```

---

### 問題5: Rask.ai の `speaker_detection` パラメータが不正

Rask.ai APIドキュメントでは`speaker_detection`というパラメータは存在しません。代わりに`num_speakers`を使用します。

**修正** (`rask-translate-video/index.ts`):
```typescript
// 変更前
body: JSON.stringify({
  video_id: videoId,
  src_lang: srcLang,
  dst_lang: dstLang,
  name: `Technique ${techniqueId} - ${targetLanguage}`,
  speaker_detection: "auto",  // 無効なパラメータ
}),

// 変更後
body: JSON.stringify({
  video_id: videoId,
  src_lang: srcLang,
  dst_lang: dstLang,
  name: `Technique ${techniqueId} - ${targetLanguage}`,
  // num_speakers は省略して自動検出
}),
```

---

### 問題6: エラーハンドリングの強化

各Edge Functionでのエラーレスポンスをより詳細にし、フロントエンドでデバッグしやすくします。

**修正**（全Edge Function）:
```typescript
// より詳細なログ出力
console.log("[provider-translate-video] Request received:", { 
  videoUrl: videoUrl?.substring(0, 100),
  sourceLanguage,
  targetLanguage,
  techniqueId,
});

// エラー時も詳細を返す
return new Response(
  JSON.stringify({
    success: false,
    error: errorMessage,
    details: errorDetails,
    provider: "provider-name",
  }),
  { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

---

### 問題7: フロントエンドでのエラー表示改善

`TranslationQuickDialog`でエラー発生時により詳細な情報を表示します。

**修正** (`TranslationQuickDialog.tsx`):
```typescript
} catch (error: unknown) {
  console.error('Video translation error:', error);
  
  // 詳細なエラーメッセージを抽出
  let errorMessage = "動画翻訳中にエラーが発生しました";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = JSON.stringify(error);
  }
  
  toast.error("動画翻訳エラー", {
    description: errorMessage,
    duration: 10000, // エラーは長く表示
  });
}
```

---

## 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/translate-video/index.ts` | 共有モジュール使用、ログ強化 |
| `supabase/functions/rask-translate-video/index.ts` | `speaker_detection`パラメータ削除、ログ強化 |
| `supabase/functions/heygen-translate-video/index.ts` | ログ強化 |
| `supabase/functions/heygen-check-status/index.ts` | `video_metadata`更新形式を統一 |
| `src/components/admin/TranslationQuickDialog.tsx` | 成功判定強化、エラー表示改善 |

---

## 実装後の確認項目

1. **Edge Function再デプロイ**: すべての翻訳Edge Functionを再デプロイ
2. **テスト実行**: 各プロバイダーで吹き替えを開始し、`projectId`が正しく返されることを確認
3. **進行中表示**: 吹き替え開始後、VideosManagementの進行中セクションに表示されることを確認
4. **完了後保存**: ステータスチェックで完了後、`video_metadata`が正しく更新されることを確認

