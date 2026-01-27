
# 動画吹き替え翻訳のペンディング状態問題 - 調査結果と解決策

## 問題の現状

### データベースの状態
- **11件のHeyGen翻訳ジョブ**が「processing」状態で残存
- **10件が2時間以上経過**（最長で1000分以上）
- すべてHeyGenプロバイダーのジョブ

### エッジ関数ログの分析
```
[heygen-check-status] HeyGen status response: 
{"data":null,"error":{"code":"internal_error","message":"Video translate not found"}}
```

HeyGen APIが継続的に「Video translate not found」エラーを返しています。

---

## 根本原因

### 1. HeyGen側でのジョブ削除
HeyGenの翻訳ジョブは通常、数分〜数十分で完了します。2時間以上経過しているジョブは：
- HeyGen側で既にタイムアウトしてクリーンアップされた
- またはエラーで開始に失敗し、ジョブが作成されなかった
- HeyGen APIプランの制限に達している可能性（メモリーでは「Scale/Enterprise API plan required」との記載）

### 2. データベースとフロントエンドの二重管理
- **`translation_history`テーブル**: 翻訳開始時に記録（11件残存）
- **`activeTranslations` (LocalStorage)**: フロントエンドで24時間後に自動削除

この2つが同期していないため、データベースには古いレコードが残り続けます。

### 3. エッジ関数の修正が最近適用された
最新のコードでは言語サフィックス除去ロジックが追加されましたが、古いジョブは既にHeyGen側に存在しないため、修正後も「not found」が返り続けています。

---

## 解決策

### 即時対応（ユーザーが今すぐできること）

#### A. フロントエンドから手動削除
管理画面上部に表示されている「進行中の翻訳」セクションで：
1. 各ジョブの右側にある **「×」ボタン** をクリック
2. これでフロントエンドの表示から削除されます（LocalStorageから削除）

#### B. データベース直接クリーンアップ（推奨）
以下のSQLで古いHeyGenジョブを一括削除：
```sql
-- 2時間以上経過したHeyGen processingジョブを削除
DELETE FROM translation_history
WHERE provider = 'heygen'
  AND status IN ('processing', 'pending')
  AND EXTRACT(EPOCH FROM (NOW() - started_at))/3600 > 2;
```

これにより11件のstuckジョブがすべて削除されます。

---

### 恒久対策（コード修正）

#### 1. translation_history の自動クリーンアップ機能追加

**新規エッジ関数**: `cleanup-stale-translations`
```typescript
// 24時間以上経過したprocessingジョブを自動的にfailedに更新
UPDATE translation_history
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Job timed out after 24 hours'
WHERE status IN ('processing', 'pending')
  AND started_at < NOW() - INTERVAL '24 hours';
```

この関数を：
- 管理画面から手動実行できるボタンを追加
- または、定期的に実行するCron Job化（Supabase pg_cronまたは外部スケジューラー）

#### 2. heygen-check-status の改善

`not found` エラー時の挙動を改善：
```typescript
if (errorMessage.includes("not found")) {
  // 2時間以上経過している場合は失敗として扱う
  const { data: historyData } = await supabase
    .from('translation_history')
    .select('started_at')
    .eq('project_id', projectId)
    .single();
  
  if (historyData) {
    const elapsedHours = (Date.now() - new Date(historyData.started_at).getTime()) / (1000 * 60 * 60);
    
    if (elapsedHours > 2) {
      // 2時間経過後は失敗として記録
      await supabase
        .from('translation_history')
        .update({ 
          status: 'failed', 
          completed_at: new Date().toISOString(),
          error_message: 'Job not found in HeyGen after 2 hours'
        })
        .eq('project_id', projectId);
      
      return new Response(JSON.stringify({
        status: "failed",
        failed: true,
        error: "Translation job not found (likely expired on HeyGen)",
      }), { headers: corsHeaders });
    }
  }
  
  // 2時間未満の場合は、まだ登録中の可能性があるため pending を返す
  return new Response(JSON.stringify({
    status: "pending",
    progress: 5,
    // ...
  }));
}
```

#### 3. VideosManagement.tsx に一括クリーンアップボタン追加

管理ツールセクション（2760行目付近）に新しいボタンを追加：
```tsx
<Button 
  onClick={handleCleanupStaleTranslations}
  variant="outline"
  size="sm"
  className="text-xs h-7 border-amber-500/50 text-amber-600"
>
  <Trash2 className="w-3 h-3 mr-1" />
  古い翻訳ジョブをクリーンアップ
</Button>
```

ハンドラー実装：
```typescript
const handleCleanupStaleTranslations = async () => {
  if (!confirm('2時間以上経過した未完了の翻訳ジョブを削除しますか？')) return;
  
  try {
    const { data, error } = await supabase.functions.invoke('cleanup-stale-translations');
    if (error) throw error;
    
    toast.success('クリーンアップ完了', {
      description: `${data.deletedCount}件のジョブを削除しました`,
    });
    
    // LocalStorageもクリーンアップ
    setActiveTranslations(prev => 
      prev.filter(t => {
        const elapsedHours = (Date.now() - t.startTime) / (1000 * 60 * 60);
        return elapsedHours <= 2;
      })
    );
  } catch (err) {
    toast.error('クリーンアップに失敗しました');
  }
};
```

---

## 実装の優先順位

### 高優先度（即座に実装）
1. **データベース直接クリーンアップ** - 既存の11件のstuckジョブを削除
2. **一括クリーンアップボタン追加** - 今後の再発に備えた手動対処手段

### 中優先度（今週中に実装）
3. **heygen-check-status の2時間タイムアウト処理** - 自動的に失敗として記録
4. **cleanup-stale-translations エッジ関数** - 定期実行用

### 低優先度（将来的に検討）
5. **Cron Jobによる自動クリーンアップ** - 完全自動化

---

## ファイル変更リスト

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/heygen-check-status/index.ts` | 2時間経過後のタイムアウト処理追加 |
| `supabase/functions/cleanup-stale-translations/index.ts` | 新規作成：古いジョブのクリーンアップ |
| `src/components/admin/VideosManagement.tsx` | クリーンアップボタンとハンドラー追加 |

---

## HeyGen API プランの確認が必要

メモリーによると、HeyGen APIは「Scale/Enterprise API plan」が必要です。現在のAPIキーが適切なプランかどうかを確認してください。プランが不足している場合、新しい翻訳ジョブも開始に失敗します。

確認方法：
1. HeyGen ダッシュボードにログイン
2. アカウントプラン・API制限を確認
3. 必要に応じてプランをアップグレード

---

## まとめ

**今すぐできること:**
- 管理画面の「×」ボタンでフロントエンド表示を削除
- SQLでデータベースの古いレコードを削除

**恒久対策:**
- エッジ関数に2時間タイムアウト処理を追加
- 一括クリーンアップボタンをUIに追加
- 定期的な自動クリーンアップ機能を実装
