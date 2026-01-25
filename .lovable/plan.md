

## HeyGen等プロバイダーから翻訳済み動画をインポートする機能

### 現状の課題

外部プロバイダー（HeyGen、ElevenLabs、Rask.ai）で既に翻訳・吹き替えが完了している動画が、システムに取り込まれていない場合があります。これは翻訳完了時にCloudflare Streamへのアップロードが失敗した（容量超過など）、または手動で翻訳を行った場合に発生します。

---

### 解決策：翻訳動画インポートツール

動画一覧の「管理ツール」セクションに、HeyGenプロジェクトIDを入力して翻訳済み動画を取り込む機能を追加します。

---

### 実装内容

#### 1. 新しいEdge Function: `import-heygen-video`

| 処理 | 詳細 |
|------|------|
| 入力 | HeyGenプロジェクトID、対象technique_id、言語コード |
| 動作1 | HeyGen APIからステータス確認・動画URL取得 |
| 動作2 | 完了済み動画をCloudflare Streamにコピー |
| 動作3 | `techniques.video_metadata`に保存 |

```typescript
// supabase/functions/import-heygen-video/index.ts
serve(async (req) => {
  const { projectId, techniqueId, targetLanguage } = await req.json();
  
  // 1. HeyGen APIで翻訳動画URLを取得
  const statusRes = await fetch(
    `https://api.heygen.com/v2/video_translate/status?video_translate_id=${projectId}`,
    { headers: { "x-api-key": heygenApiKey } }
  );
  const statusData = await statusRes.json();
  
  if (statusData.data?.status !== "completed") {
    return error("翻訳が完了していません");
  }
  
  const heygenVideoUrl = statusData.data.url;
  
  // 2. Cloudflare Streamにコピー
  const cloudflareUrl = await uploadToCloudflare(heygenVideoUrl, `technique-${techniqueId}-${targetLanguage}`);
  
  // 3. データベース更新
  const { data: technique } = await supabase
    .from("techniques")
    .select("video_metadata")
    .eq("id", techniqueId)
    .single();
  
  const updatedMetadata = {
    ...technique.video_metadata,
    [targetLanguage]: {
      video_url: cloudflareUrl,
      provider: "heygen",
      created_at: new Date().toISOString(),
    },
  };
  
  await supabase
    .from("techniques")
    .update({ video_metadata: updatedMetadata })
    .eq("id", techniqueId);
  
  return { success: true, videoUrl: cloudflareUrl };
});
```

#### 2. UI: 管理ツールセクションに追加

動画一覧ページの「管理ツール」（折りたたみセクション）内に以下を追加：

```
┌─────────────────────────────────────────────────────────────┐
│  📥 翻訳動画インポート                                        │
├─────────────────────────────────────────────────────────────┤
│  プロバイダー:  ○ HeyGen  ○ ElevenLabs  ○ Rask.ai         │
│                                                             │
│  プロジェクトID: [________________________]                  │
│                                                             │
│  対象動画:      [▼ 動画を選択 ___________]                  │
│                                                             │
│  言語:          [▼ English ____________]                   │
│                                                             │
│  [インポート実行]                                            │
└─────────────────────────────────────────────────────────────┘
```

#### 3. フロー

```text
[管理者] プロジェクトID入力
         ↓
[管理者] 対象動画・言語を選択
         ↓
[Edge Function] HeyGen APIでステータス確認
         ↓
[Edge Function] 翻訳動画URLをCloudflare Streamにコピー
         ↓
[Edge Function] video_metadataに保存
         ↓
[UI] 成功メッセージ・動画一覧に反映
```

---

### ファイル変更

| ファイル | 変更内容 |
|----------|----------|
| `supabase/functions/import-heygen-video/index.ts` | 新規作成 |
| `supabase/config.toml` | 関数登録 |
| `src/components/admin/VideosManagement.tsx` | 管理ツールにインポートUI追加 |

---

### 技術的考慮事項

1. **HeyGen動画URLの有効期限**: HeyGenの翻訳済み動画URLは7日間で失効するため、インポート時にCloudflare Streamへの永続保存が必須
2. **ElevenLabs/Rask.ai対応**: 将来的に他プロバイダーも同様のインポート機能を追加可能（同じUIで切り替え）
3. **重複チェック**: 既に同じ言語の翻訳が存在する場合は警告を表示し、上書きするか確認

---

### 注意事項

- HeyGenのプロジェクトIDは32文字の16進数（例: `05f14f525f074f9399f28402a7c04a85`）
- Cloudflare Streamの容量に注意（先に不要動画を削除しておく必要あり）
- インポート成功後、動画一覧の「翻訳済み」バッジに反映される

