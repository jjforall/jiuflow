
# 翻訳（吹き替え）スタック問題の解決計画

## 問題の概要

| 動画名 | 問題点 | 状態 |
|--------|--------|------|
| マウントエスケープのバリエーション1 | LocalStorageの `activeTranslations` に残存しているが、`translation_history` テーブルにはレコードなし | UIが永続的に「翻訳中」表示 |
| クローズドガードからのクロスチョーク（PT） | `video_metadata.pt.video_url` にRask.aiの署名付きURLが保存されているが、既に失効（1時間有効） | 再生不可 |

---

## 解決策

### 1. フロントエンド（LocalStorage）のクリーンアップ

**対象**: 「マウントエスケープのバリエーション1」の翻訳中表示

**手動操作**: 
- 管理画面を開く
- 上部の「進行中の翻訳」セクションで、該当ジョブの「×」ボタンをクリック
- これによりLocalStorageから削除され、UIの「翻訳中」表示が消える

**コード改善**（推奨）:
現在のポーリングロジック（`VideosManagement.tsx` 976-999行目）を強化し、**DBに対応するレコードがない孤児ジョブ**を自動削除するロジックを追加する。

```typescript
// 現在: 24時間経過で削除
// 改善: DBにproject_idがない場合も削除

// ステータスチェック後、DBにレコードがあるか確認
const { data: historyRecord } = await supabase
  .from('translation_history')
  .select('id')
  .eq('project_id', translation.projectId)
  .maybeSingle();

if (!historyRecord) {
  console.warn(`Orphan translation in localStorage (no DB record): ${translation.projectId}`);
  toast.info("孤児ジョブを削除しました", {
    description: `「${translation.techniqueName}」のDBレコードが見つからないため削除しました`,
  });
  setActiveTranslations(prev => 
    prev.filter(t => t.projectId !== translation.projectId)
  );
  continue; // 次のジョブへ
}
```

### 2. クローズドガードのPT翻訳データを削除

**対象**: `クローズドガードからのクロスチョーク` (ID: `00f3fa25-facb-4fd5-96a9-be96f27678e3`)

**現状**: `video_metadata.pt.video_url` に以下の失効URLが保存されている:
```
https://app.rask.ai/data/.../....mp4?X-Amz-...&X-Amz-Expires=3600&...
```
このURLは署名付きで1時間しか有効ではなく、現在は失効している。

**修正方法**:
1. 管理画面で「クローズドガードからのクロスチョーク」を見つける
2. 「吹替:」セクションのPTバッジの「×」をクリックして削除
3. 必要に応じて再度翻訳を開始

**代替（直接修正）**:
`video_metadata` からPTエントリを削除するSQLを実行:
```sql
UPDATE techniques
SET video_metadata = video_metadata - 'pt'
WHERE id = '00f3fa25-facb-4fd5-96a9-be96f27678e3';
```

### 3. 根本対策：Rask.ai完了時のCloudflareアップロード確認

`rask-check-status` Edge Functionを確認したところ、完了時にCloudflareへのコピーは実装されています（172-225行目）。しかし、過去にこの処理が失敗したか、当時は未実装だった可能性があります。

現在のコードでは問題ないため、追加修正は不要です。

---

## 実装する変更

### ファイル変更

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideosManagement.tsx` | 孤児LocalStorageジョブの自動削除ロジックを追加 |

### コード変更詳細

**VideosManagement.tsx** (ポーリングロジック内、約910行目付近に追加):

```typescript
// ステータスチェック前に、DBにレコードが存在するか確認
const { data: historyRecord } = await supabase
  .from('translation_history')
  .select('id')
  .eq('project_id', translation.projectId)
  .maybeSingle();

// DBにレコードがない場合は孤児ジョブとして削除
if (!historyRecord) {
  console.warn(`[checkAllTranslations] Orphan job detected (no DB record): ${translation.projectId}`);
  
  // 開始から2時間以上経過している場合のみ削除（開始直後のDB遅延を考慮）
  const elapsedHours = (Date.now() - translation.startTime) / (1000 * 60 * 60);
  if (elapsedHours > 0.1) { // 6分以上経過
    toast.info("孤児翻訳ジョブを削除しました", {
      description: `「${translation.techniqueName}」のDBレコードが見つからないため削除しました`,
    });
    
    setActiveTranslations(prev => 
      prev.filter(t => t.projectId !== translation.projectId)
    );
    continue;
  }
}
```

---

## ユーザーへの即時対応手順

### 今すぐできること

1. **マウントエスケープのバリエーション1の「翻訳中」表示を消す**:
   - 管理画面上部の「進行中の翻訳」セクションを確認
   - 該当ジョブの「×」ボタンをクリック

2. **クローズドガードのPT翻訳を削除して再翻訳**:
   - 動画カードの「吹替:」セクションでPTバッジの「×」をクリック
   - 「+追加」ボタンから再度ポルトガル語翻訳を開始
   - 今度はElevenLabsまたはHeyGenで翻訳することを推奨（Cloudflareへの自動保存が確実）

---

## 今後の再発防止

1. **孤児ジョブ自動検出**: LocalStorageにあるがDBにないジョブを自動削除
2. **Rask.ai使用時の注意**: Rask.aiの出力URLは1時間で失効するため、完了時のCloudflareコピーが必須（現在は実装済み）
3. **翻訳履歴の確認**: 定期的に `translation_history` テーブルと `activeTranslations` の整合性をチェック
