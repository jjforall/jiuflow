
# HeyGen翻訳ステータス確認のバグ修正計画

## 問題の概要

HeyGenで開始された翻訳ジョブが2時間以上経過しても「pending」状態のままになっています。ログを分析した結果、以下の問題が判明しました：

**根本原因**: `heygen-check-status` エッジ関数がサフィックス付きのプロジェクトID（例：`8c8e2a5ff1084e9ebb04a5a0caf47a57-en`）をそのままHeyGen APIに送信しているため、HeyGen側で「Video translate not found」エラーが発生しています。

HeyGenが期待するのはサフィックスなしの元ID（`8c8e2a5ff1084e9ebb04a5a0caf47a57`）です。

---

## 修正内容

### 1. `heygen-check-status` エッジ関数の修正

**ファイル**: `supabase/functions/heygen-check-status/index.ts`

**変更内容**:
- 受け取った `projectId` から言語サフィックス（`-en`, `-zh`, `-pt` など）を除去してからHeyGen APIに問い合わせる
- サフィックスパターン: `-` + 2〜3文字の言語コード（末尾）

```typescript
// サフィックスを除去してHeyGen用のIDを取得
const languageSuffixPattern = /-[a-z]{2,3}$/i;
const heygenProjectId = projectId.replace(languageSuffixPattern, '');

console.log("[heygen-check-status] Original projectId:", projectId);
console.log("[heygen-check-status] HeyGen projectId (suffix removed):", heygenProjectId);

// HeyGen APIにはサフィックスなしのIDを使用
const statusResponse = await fetch(
  `https://api.heygen.com/v2/video_translate/status?video_translate_id=${heygenProjectId}`,
  // ...
);
```

### 2. 既存のstuckジョブのクリーンアップ

現在DBに残っている「processing」状態のHeyGenジョブは、実際には翻訳が完了しているか失敗している可能性があります。修正後、ステータスチェックが正常に動作し、実際の状態（completed/failed）が取得できるようになります。

---

## 技術詳細

### サフィックスパターンの解析

DBに保存されているHeyGen project_id例：
- `8c8e2a5ff1084e9ebb04a5a0caf47a57-en`（英語）
- `bdf0abab558343929abe3287103969e5-zh`（中国語）
- `6ff16f72dce74405ac62ab8b8772e52b-pt`（ポルトガル語）

パターン: `[32文字の英数字]-[2-3文字の言語コード]`

### 修正後の動作フロー

```text
1. フロントエンドがステータス確認リクエスト送信
   projectId: "8c8e2a5ff1084e9ebb04a5a0caf47a57-en"
   
2. heygen-check-status がサフィックスを除去
   heygenProjectId: "8c8e2a5ff1084e9ebb04a5a0caf47a57"
   
3. HeyGen APIに正しいIDで問い合わせ
   → 実際のステータス（completed/processing/failed）を取得
   
4. 完了時はCloudflareアップロード→DB更新→通知
```

---

## ファイル変更リスト

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/heygen-check-status/index.ts` | サフィックス除去ロジックを追加 |

---

## 影響範囲

- 既存のHeyGen翻訳ジョブのステータス確認が正常に動作するようになる
- 新規の翻訳ジョブも正しくトラッキングされる
- ElevenLabsおよびRask.aiのジョブには影響なし
