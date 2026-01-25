
# 進行中の翻訳「Not Found」問題の調査結果と修正プラン

## 問題の全体像

何度も報告されている「経過時間だけが増え続け、ステータス確認するとnot foundになる」問題について、以下の3つの根本原因が特定されました。

---

## 根本原因の分析

### 1. **HeyGen APIの制限・エラー**
```
HeyGen API Response:
{"data":null,"error":{"code":"internal_error","message":"Video translate not found"}}
```

**発生理由**:
- **APIプラン不足**: HeyGenのVideo Translate APIは**Scale/Enterpriseプラン専用**。通常プランでは使用不可
- **翻訳開始時の失敗**: API呼び出しは成功したように見えても、実際にはHeyGen側でジョブが作成されていない
- **プロジェクトの期限切れ**: HeyGenのプロジェクトは一定期間後に削除される（通常7日間）

**現在の対応状況**:
- `heygen-check-status` Edge Function (Line 102-114) で "not found" エラーを検知し、`failed: true` を返している
- UIにヒントメッセージ「HeyGenのScale/Enterpriseプランが必要な場合があります」を表示している

**不足している点**:
- ❌ `failed: true` が返されても、進行中リストから自動削除されない
- ❌ ユーザーは手動で削除ボタンを押す必要がある

---

### 2. **localStorage に古いデータが残り続ける**

**問題のコード**:
```typescript
// src/components/admin/VideosManagement.tsx:802-812
useEffect(() => {
  const stored = localStorage.getItem('activeTranslations');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      setActiveTranslations(parsed);  // ← 古いデータをそのまま復元
    } catch (e) {
      console.error('Failed to parse stored translations:', e);
    }
  }
}, []);
```

**何が起きているか**:
1. 過去にHeyGen翻訳を開始したが、実際にはAPI側でジョブが作成されなかった
2. その無効な `projectId` が `activeTranslations` に追加され、localStorageに保存された
3. ページをリロードしても、localStorageから古いデータが復元される
4. 30秒ごとのステータスチェック（Line 824-913）が延々と "not found" エラーを返し続ける
5. 経過時間だけが増え続ける

**検証方法**:
ネットワークログで以下のパターンが確認されました：
```json
Request Body: {
  "projectId": "05f14f525f074f9399f28402a7c04a85-en",
  "techniqueId": "77489a0b-7bce-4136-8b20-10f3265fc379",
  "targetLanguage": "en"
}
Response: {
  "status": "not_found",
  "failed": true,
  "error": "Video translate not found"
}
```

この `-en` サフィックスは、`heygen-check-status` (Line 71) で除去される仕組みがあるため、直接の問題ではありません。しかし、**無効なprojectID自体が問題**です。

---

### 3. **失敗したジョブの自動削除機能がない**

**現在の動作**:
```typescript
// src/components/admin/VideosManagement.tsx:891-898
} else if (statusData?.status === 'failed') {
  toast.error("動画翻訳失敗", {
    description: `「${translation.techniqueName}」の翻訳処理に失敗しました`,
  });

  setActiveTranslations(prev => 
    prev.filter(t => t.projectId !== translation.projectId)
  );
}
```

これは `statusData?.status === 'failed'` のケースのみカバーしています。

**不足しているケース**:
- ❌ `statusData?.failed === true` が返されても削除されない（HeyGenの "not found" エラー）
- ❌ 一定時間経過したジョブの自動削除がない

---

## 修正プラン

### **修正1: failed フラグによる自動削除**

**対象ファイル**: `src/components/admin/VideosManagement.tsx`

**修正箇所**: Line 891-899 の `else if` ブロックを以下に変更：

```typescript
// 変更前
} else if (statusData?.status === 'failed') {
  toast.error("動画翻訳失敗", {
    description: `「${translation.techniqueName}」の翻訳処理に失敗しました`,
  });

  setActiveTranslations(prev => 
    prev.filter(t => t.projectId !== translation.projectId)
  );
}

// 変更後
} else if (statusData?.status === 'failed' || statusData?.failed === true) {
  const errorHint = statusData?.hint || '';
  toast.error("動画翻訳失敗", {
    description: `「${translation.techniqueName}」の翻訳処理に失敗しました${errorHint ? '\n' + errorHint : ''}`,
  });

  setActiveTranslations(prev => 
    prev.filter(t => t.projectId !== translation.projectId)
  );
}
```

**効果**:
- HeyGenの "not found" エラー（`failed: true`）を検知して自動削除
- ユーザーへのエラー通知にヒントメッセージを含める

---

### **修正2: 一定時間経過後の自動削除 (オプション)**

**対象ファイル**: `src/components/admin/VideosManagement.tsx`

**追加ロジック**: Line 899 の後に以下を追加：

```typescript
// 24時間以上経過したジョブを自動削除
const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
if (translation.startTime < twentyFourHoursAgo) {
  console.warn(`Removing stale translation job: ${translation.projectId}`);
  toast.info("古い翻訳ジョブを削除しました", {
    description: `「${translation.techniqueName}」は24時間以上前に開始されたため削除されました`,
  });
  
  setActiveTranslations(prev => 
    prev.filter(t => t.projectId !== translation.projectId)
  );
  continue; // 次のループへ
}
```

**効果**:
- 24時間以上前のジョブを自動的にクリーンアップ
- localStorageの肥大化を防ぐ

---

### **修正3: localStorageのバリデーション (推奨)**

**対象ファイル**: `src/components/admin/VideosManagement.tsx`

**修正箇所**: Line 802-812 の復元ロジックに検証を追加：

```typescript
// 変更前
useEffect(() => {
  const stored = localStorage.getItem('activeTranslations');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      setActiveTranslations(parsed);
    } catch (e) {
      console.error('Failed to parse stored translations:', e);
    }
  }
}, []);

// 変更後
useEffect(() => {
  const stored = localStorage.getItem('activeTranslations');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      
      // 24時間以内のジョブのみ復元
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const validTranslations = parsed.filter((t: any) => {
        if (!t.startTime || !t.projectId || !t.techniqueId) {
          console.warn('Invalid translation data in localStorage:', t);
          return false;
        }
        if (t.startTime < twentyFourHoursAgo) {
          console.warn('Removing expired translation from localStorage:', t.projectId);
          return false;
        }
        return true;
      });
      
      setActiveTranslations(validTranslations);
      
      // クリーンアップされたデータで保存し直す
      if (validTranslations.length !== parsed.length) {
        if (validTranslations.length > 0) {
          localStorage.setItem('activeTranslations', JSON.stringify(validTranslations));
        } else {
          localStorage.removeItem('activeTranslations');
        }
      }
    } catch (e) {
      console.error('Failed to parse stored translations:', e);
      localStorage.removeItem('activeTranslations'); // 壊れたデータは削除
    }
  }
}, []);
```

**効果**:
- 古いデータを自動的にクリーンアップ
- 無効なデータ構造を検出して除外
- localStorageの整合性を保つ

---

### **修正4: 手動削除ボタンの強化 (オプション)**

**UI改善案**: 管理ツールセクションに「失敗したジョブを一括削除」ボタンを追加

**対象ファイル**: `src/components/admin/VideosManagement.tsx`

**追加箇所**: Line 2200 付近（進行中の翻訳セクション）

```typescript
<div className="flex items-center justify-between mb-2">
  <h3 className="text-sm font-medium">進行中の翻訳 ({activeTranslations.length})</h3>
  {activeTranslations.length > 0 && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // 全ての失敗/24時間以上経過したジョブを削除
        const threshold = Date.now() - (24 * 60 * 60 * 1000);
        const cleaned = activeTranslations.filter(t => t.startTime >= threshold);
        const removedCount = activeTranslations.length - cleaned.length;
        
        if (removedCount > 0) {
          setActiveTranslations(cleaned);
          toast.success(`${removedCount}件の古いジョブを削除しました`);
        } else {
          toast.info("削除対象のジョブがありません");
        }
      }}
    >
      <Trash2 className="w-3 h-3 mr-1" />
      古いジョブをクリア
    </Button>
  )}
</div>
```

---

## まとめ

| 修正 | 優先度 | 効果 | 影響範囲 |
|------|--------|------|----------|
| **修正1**: `failed` フラグで自動削除 | **必須** | HeyGen "not found" エラーを自動削除 | 低（既存のロジックの拡張） |
| **修正2**: 24時間経過で自動削除 | 推奨 | 古いジョブの自動クリーンアップ | 低（追加ロジック） |
| **修正3**: localStorage バリデーション | **必須** | 無効データの復元を防ぐ | 低（初期化時のみ） |
| **修正4**: 一括削除UIボタン | オプション | ユーザーが手動でクリアしやすくなる | 低（UI追加のみ） |

**推奨実施順序**:
1. 修正3（localStorage バリデーション）→ 既存の問題を解決
2. 修正1（failed フラグ対応）→ 今後の問題を防ぐ
3. 修正2（自動期限切れ削除）→ 長期的な安定性
4. 修正4（UI強化）→ ユーザビリティ向上

これらの修正により、「経過時間だけが増え続ける」問題は解決されます。
