

## 問題: ElevenLabsで翻訳完了しても吹き替え言語が表示されない

### 原因の特定
ネットワークログとコード分析から、以下の問題を発見しました：

1. **`check-translation-status` Edge Function（ElevenLabs用）** が `video_metadata` を更新していない
   - 古いフィールドマッピング（`video_url`, `video_url_ja`, `video_url_pt`）のみ使用
   - `heygen-check-status` や `rask-check-status` は `video_metadata` を正しく更新している

2. **データベースの状態**:
   - `video_metadata` には `ja` キー（オリジナル）しかない
   - 翻訳完了後も `en` キーが追加されていない

3. **ネットワークリクエストの確認**:
   ```json
   Request: check-translation-status
   Response: {"status":"dubbed","videoUrl":"https://videodelivery.net/e320dd47726c2a60ece566ae80ef55e1/manifest/video.m3u8","progress":100}
   ```
   - 翻訳自体は成功している
   - しかし、`video_metadata` への保存がない

---

### 修正計画

#### 修正ファイル: `supabase/functions/check-translation-status/index.ts`

`heygen-check-status` と同様のロジックを追加して、翻訳完了時に `video_metadata` を更新します。

**変更内容:**
1. 既存の `video_metadata` を取得
2. ターゲット言語のキーに翻訳されたビデオURLを追加
3. プロバイダー情報も記録

```typescript
// 追加するロジック（翻訳完了時）
if (isCompleted && videoUrl && techniqueId && targetLanguage) {
  // Get existing metadata
  const { data: technique } = await supabase
    .from("techniques")
    .select("video_metadata")
    .eq("id", techniqueId)
    .single();

  const existingMetadata = technique?.video_metadata || {};

  // 他のプロバイダーと同じ形式で保存
  const updatedMetadata = {
    ...existingMetadata,
    [targetLanguage]: {
      video_url: videoUrl,
      provider: "elevenlabs",
      created_at: new Date().toISOString(),
    },
  };

  await supabase
    .from("techniques")
    .update({ video_metadata: updatedMetadata })
    .eq("id", techniqueId);
}
```

---

### 修正後のデータフロー

```text
┌─────────────────────────────────────────────────────────────┐
│  翻訳完了時の保存フロー（全プロバイダー共通化）               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ステータスチェック → "dubbed" / "completed"              │
│  2. 翻訳済みビデオをCloudflareにアップロード                │
│  3. video_metadata に以下の形式で保存:                      │
│                                                             │
│     {                                                       │
│       "ja": { "video_url": "...", created_at": "..." },    │
│       "en": {                                               │
│         "video_url": "https://videodelivery.net/xxx/...",  │
│         "provider": "elevenlabs",                          │
│         "created_at": "2026-01-25T..."                     │
│       },                                                    │
│       "pt": {                                               │
│         "video_url": "https://videodelivery.net/yyy/...",  │
│         "provider": "heygen",                              │
│         "created_at": "2026-01-25T..."                     │
│       }                                                    │
│     }                                                      │
│                                                             │
│  4. UIが video_metadata を読み取り、吹替言語バッジを表示    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/check-translation-status/index.ts` | `video_metadata` への保存ロジックを追加（HeyGen/Raskと同様の形式） |

---

### 期待される結果

**修正前:**
- ElevenLabsで翻訳 → 完了 → video_metadata 更新なし → 吹替言語が表示されない

**修正後:**
- ElevenLabsで翻訳 → 完了 → video_metadata に `en: { video_url, provider, created_at }` を追加 → 吹替言語バッジが表示される

---

### 技術詳細

#### 現在のコード（問題箇所）
```typescript
// 古いフィールドマッピングのみ
const fieldMap: Record<string, string> = {
  ja: 'video_url_ja',
  en: 'video_url',
  pt: 'video_url_pt',
};
const updateField = fieldMap[targetLanguage] || `video_url_${targetLanguage}`;

await supabase
  .from('techniques')
  .update({ [updateField]: videoUrl })
  .eq('id', techniqueId);
```

#### 修正後のコード
```typescript
// video_metadata への保存（他プロバイダーと統一）
const { data: technique } = await supabase
  .from("techniques")
  .select("video_metadata")
  .eq("id", techniqueId)
  .single();

const existingMetadata = technique?.video_metadata || {};

const updatedMetadata = {
  ...existingMetadata,
  [targetLanguage]: {
    video_url: videoUrl,
    provider: "elevenlabs",
    created_at: new Date().toISOString(),
  },
};

await supabase
  .from("techniques")
  .update({ video_metadata: updatedMetadata })
  .eq("id", techniqueId);

console.log(`Updated technique ${techniqueId} video_metadata.${targetLanguage}`);
```

