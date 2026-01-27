
# スタックした翻訳ジョブの解決計画

## 現状分析

データベースを調査した結果、2つのジョブがスタックしていることを確認しました：

### ジョブ1: HeyGen (中国語翻訳)
- **技術名**: コンバットベースへのアクション3
- **経過時間**: 46分
- **問題**: HeyGen APIが「Video translate not found」を返し続けている
- **原因**: HeyGen側でジョブが正しく作成されなかった可能性が高い

### ジョブ2: ElevenLabs (英語翻訳)
- **技術名**: マウントエスケープのバリエーション1
- **経過時間**: 49分
- **問題**: translation_historyでは「processing」だが、実際にはすでに完了している
- **証拠**: `video_metadata.en.video_url`にCloudflare URL (`https://videodelivery.net/9994f309257922268fa943687ba6e519/manifest/video.m3u8`) が保存済み

---

## 解決方法

### 即時対応（手動）

**管理ツールの「古い翻訳ジョブをクリーンアップ」ボタンを使用してください。**

現在のタイムアウト設定は2時間ですが、これを1時間に設定してクリーンアップを実行することで、現在スタックしているジョブを解決できます。

**手順:**
1. 管理画面の「翻訳管理」または「管理ツール」セクションに移動
2. 「古い翻訳ジョブをクリーンアップ」ボタンをクリック
3. しきい値を「1時間」に設定してクリーンアップを実行

---

## 根本的な改善計画

スタックしたジョブを自動的に検出・解決するため、以下の改善を提案します：

### 改善1: ElevenLabsの完了済みジョブ自動検出

`check-translation-status` Edge Functionは既にキャッシュされたURLを返しますが、`translation_history`のステータスを更新していません。

**変更内容**: 完了済みの動画URLがある場合、translation_historyのステータスも「completed」に更新する

```typescript
// supabase/functions/check-translation-status/index.ts
// 既存のキャッシュチェック後に追加
if (existingVideoUrl) {
  // Update translation_history status
  await supabase
    .from('translation_history')
    .update({ 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    })
    .eq('technique_id', techniqueId)
    .eq('target_language', targetLanguage)
    .in('status', ['processing', 'pending']);
    
  return new Response(...);
}
```

### 改善2: タイムアウト値の短縮

現在の2時間タイムアウトは長すぎます。ほとんどの翻訳は15分以内に完了します。

**変更内容**: HeyGenのタイムアウトを1時間に短縮

```typescript
// heygen-check-status/index.ts 
// 122行目付近
if (elapsedHours > 1) {  // 2時間 → 1時間に変更
  // ...mark as failed
}
```

### 改善3: クリーンアップUIの改善

「古い翻訳ジョブをクリーンアップ」ボタンに、カスタムしきい値（分単位）を指定できる機能を追加

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/check-translation-status/index.ts` | 完了済みジョブのステータス自動更新を追加 |
| `supabase/functions/heygen-check-status/index.ts` | タイムアウトを2時間から1時間に短縮 |

---

## 技術的詳細

### check-translation-status の変更 (L40-60付近)

```typescript
// 既存: 完了済みの動画URLを返すだけ
if (existingVideoUrl) {
  console.log(`Video already uploaded for ${targetLanguage}, returning cached URL`);
  
  // 追加: translation_historyのステータスも更新
  const { error: historyError } = await supabase
    .from('translation_history')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('technique_id', techniqueId)
    .eq('target_language', targetLanguage)
    .in('status', ['processing', 'pending']);
    
  if (historyError) {
    console.error('Failed to update translation history:', historyError);
  }
  
  return new Response(
    JSON.stringify({
      status: "dubbed",
      videoUrl: existingVideoUrl,
      progress: 100,
      message: "Translation completed",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### heygen-check-status の変更 (L123付近)

```typescript
// 変更前
if (elapsedHours > 2) {

// 変更後  
if (elapsedHours > 1) {
```

---

## 今すぐできること

改善を実装する前に、現在のスタックしたジョブを解決するには：

1. **管理ツールでクリーンアップを実行** - 「古い翻訳ジョブをクリーンアップ」ボタンを使用（しきい値1時間）
2. **または** - 次のステータス確認時に2時間が経過すれば自動的にfailed扱いになる

上記の改善を実装すれば、将来同様の問題が発生した際に自動的に解決されるようになります。

---

## 期待される効果

- ElevenLabsの完了済みジョブは次回のステータス確認時に自動的に「completed」に更新される
- HeyGenのタイムアウトが1時間に短縮され、スタックしたジョブがより早く検出される
- ユーザーがスタックした翻訳ジョブを手動で解決する必要がなくなる
