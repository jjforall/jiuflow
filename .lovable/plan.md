

# Cloudflare Stream 重複動画・タイトル問題の修正計画

## 問題の分析

スクリーンショットを見ると、Cloudflare Streamに「dubbed_video.mp4」というファイル名の動画が大量に重複して登録されています。原因は以下の3点です：

### 問題1: ElevenLabsの動画タイトルが固定
```typescript
// supabase/functions/check-translation-status/index.ts:145
uploadFormData.append("file", new Blob([audioBuffer], { type: "video/mp4" }), "dubbed_video.mp4");
```
ElevenLabsの吹き替え完了時、Cloudflareへのアップロードでファイル名が「dubbed_video.mp4」に固定されています。HeyGenとRask.aiは正しく `technique-${techniqueId}-${targetLanguage}` という名前を使用しています。

### 問題2: Cloudflareメタデータの未設定
ElevenLabsのエンドポイントは直接ファイルアップロード（FormData）を使用しており、Cloudflareの `meta.name` フィールドを設定していません。HeyGenとRask.aiは `/stream/copy` エンドポイントでメタデータを設定しています。

### 問題3: 重複アップロードの可能性
ポーリング中に複数のリクエストが同時に処理され、データベース更新前に再度アップロードが実行される可能性があります（レースコンディション）。

---

## 修正内容

### 1. ElevenLabsの動画タイトルを意味のある名前に変更

```text
変更ファイル: supabase/functions/check-translation-status/index.ts

修正箇所: lines 137-156

変更内容:
1. technique.name_ja を取得してタイトルに使用
2. ファイル名を `{技術名}_{言語コード}.mp4` 形式に変更
3. Cloudflareのメタデータ（name）を設定

修正後の処理:
- ElevenLabsからの動画取得後、技術名をDBから取得
- Cloudflare Stream API で meta.name を設定
- 例: "コンバットベースのポスチャー_en"
```

### 2. 共通のCloudflareアップロード関数を使用

HeyGenとRask.aiで使用している `/stream/copy` エンドポイントと同じパターンに統一します。ただし、ElevenLabsはURLではなくバイナリデータを返すため、以下の手順で対応：

```text
修正ロジック:
1. FormDataでのアップロード時に meta フィールドを追加
2. Cloudflare Stream APIはFormDataでも meta を受け付ける

コード例:
const uploadFormData = new FormData();
const videoName = `${technique?.name_ja || 'technique'}-${targetLanguage}`;
uploadFormData.append("file", new Blob([audioBuffer], { type: "video/mp4" }), `${videoName}.mp4`);
// Cloudflare APIにメタデータを渡すためにURLパラメータを使用
const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?meta.name=${encodeURIComponent(videoName)}`;
```

### 3. レースコンディション対策の強化

```text
変更ファイル: supabase/functions/check-translation-status/index.ts

追加箇所: アップロード前の再確認チェック

修正内容:
1. ElevenLabsから動画をダウンロードした後、再度DBをチェック
2. 既にアップロード済みの場合はスキップ
3. ログを追加して重複検出を記録
```

### 4. 全プロバイダーのタイトル形式統一

```text
統一フォーマット: {技術名}-{言語コード}

例:
- コンバットベースのポスチャー-en
- クローズドガードからのスイープ-pt

Cloudflareダッシュボードでの表示:
- 技術名と言語が一目でわかる
- 重複を視覚的に確認しやすい
```

---

## 技術的な詳細

### ElevenLabsステータスチェック関数の修正

```typescript
// supabase/functions/check-translation-status/index.ts

// 1. 技術名を取得してタイトルに使用
const { data: technique } = await supabase
  .from('techniques')
  .select('name_ja, video_metadata')
  .eq('id', techniqueId)
  .single();

// 2. 重複チェック（アップロード直前）
if (technique?.video_metadata?.[targetLanguage]?.video_url) {
  console.log(`[DUPLICATE PREVENTION] Video already exists for ${targetLanguage}`);
  return existingVideoUrl;
}

// 3. 意味のあるタイトルでアップロード
const videoName = `${technique?.name_ja || `technique-${techniqueId}`}-${targetLanguage}`;
const uploadFormData = new FormData();
uploadFormData.append("file", new Blob([audioBuffer], { type: "video/mp4" }), `${videoName}.mp4`);

// Cloudflare Stream APIにメタデータを渡す
const cfUploadRes = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
    },
    body: uploadFormData,
  }
);

// アップロード成功後、Cloudflareのメタデータを更新
if (cfUploadRes.ok) {
  const cfData = await cfUploadRes.json();
  const videoId = cfData.result.uid;
  
  // メタデータを設定（名前をわかりやすくする）
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { name: videoName }
      }),
    }
  );
}
```

---

## 既存の重複動画について

Cloudflareに既に登録されている「dubbed_video.mp4」の重複動画は、以下の方法で対処できます：

1. **手動削除**: Cloudflareダッシュボードで不要な動画を選択して削除
2. **クリーンアップツール使用**: 管理画面の「Settings」→「Cloudflare Stream Cleanup」機能で、データベースに登録されていない孤児動画を特定・削除

---

## 変更するファイル

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/check-translation-status/index.ts` | タイトル設定・重複防止ロジック追加 |

---

## 期待される効果

1. Cloudflareダッシュボードで動画が「技術名-言語」形式で表示される
2. 同じ動画の重複アップロードが防止される
3. どの動画がどの技術に対応しているか一目でわかる

