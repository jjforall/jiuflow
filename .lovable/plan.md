

## Cloudflare Stream 不要動画削除機能

### 現状の問題

| 項目 | 状態 |
|------|------|
| Cloudflare使用量 | 1000.72分 / 1000分（容量オーバー） |
| データベース登録動画 | 約142分 |
| 孤児動画（不要） | 約850分以上 |

孤児動画とは、テスト、削除済み動画、吹き替え失敗の残骸など、データベースに登録されていない動画です。

---

### 保持すべき動画

1. **オリジナル動画**: `techniques.video_url` に登録されたCloudflare Stream ID
2. **吹き替え版**: `techniques.video_metadata` 内の各言語（en, es, pt, zh等）の `video_url`

---

### 実装内容

#### 1. 新しいEdge Function `cleanup-cloudflare-videos` を作成

**機能:**
- Cloudflare Stream APIから全動画リストを取得
- データベースから保持すべきVideo ID一覧を抽出
- 不要な動画を特定して削除

**安全策:**
- 削除前に対象動画リストを返すプレビューモード
- 確認後に実際の削除を実行

#### 2. 管理画面に削除ボタンを追加（オプション）

---

### 技術的な詳細

```typescript
// supabase/functions/cleanup-cloudflare-videos/index.ts

// 1. Cloudflare Streamから全動画を取得
const allVideos = await fetchAllCloudflareVideos(accountId, apiToken);

// 2. データベースから保持すべきIDを抽出
const keepIds = new Set<string>();
for (const technique of techniques) {
  // video_urlからCloudflare IDを抽出
  const mainId = extractCloudflareId(technique.video_url);
  if (mainId) keepIds.add(mainId);
  
  // video_metadataから吹き替え版のIDを抽出
  if (technique.video_metadata) {
    for (const lang of ['en', 'es', 'pt', 'zh', 'fr', 'de', 'ko']) {
      const dubbedUrl = technique.video_metadata[lang]?.video_url;
      if (dubbedUrl?.includes('videodelivery.net')) {
        const dubbedId = extractCloudflareId(dubbedUrl);
        if (dubbedId) keepIds.add(dubbedId);
      }
    }
  }
}

// 3. 不要な動画を特定
const toDelete = allVideos.filter(v => !keepIds.has(v.uid));

// 4. プレビューモードなら対象リストを返す
if (mode === 'preview') {
  return { toDelete, toKeep: keepIds.size };
}

// 5. 削除実行
for (const video of toDelete) {
  await deleteCloudflareVideo(video.uid, accountId, apiToken);
}
```

---

### 実行フロー

```text
[管理者] → [cleanup-cloudflare-videos?mode=preview]
                    ↓
         削除対象リスト表示（確認）
                    ↓
[管理者] → [cleanup-cloudflare-videos?mode=execute]
                    ↓
              不要動画を削除
                    ↓
           容量回復（推定850分以上）
```

---

### ファイル変更

| ファイル | 変更内容 |
|----------|----------|
| `supabase/functions/cleanup-cloudflare-videos/index.ts` | 新規作成 |
| `supabase/config.toml` | 関数設定追加（JWT不要） |

---

### 注意事項

- Cloudflare APIはページネーションがあるため、全動画を取得するにはループが必要
- 削除は不可逆なので、プレビューモードで確認してから実行
- 吹き替え版のURLがRask.ai（一時URL）の場合は削除対象から除外不要（そもそもCloudflareにない）

