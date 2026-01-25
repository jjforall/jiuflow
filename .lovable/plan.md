

## 修正内容

### 1. 翻訳プロバイダーにHeyGenを追加

**問題:** 管理ツールの翻訳プロバイダー選択にHeyGenが含まれていない

**修正箇所:** `src/components/admin/VideosManagement.tsx`

- 型定義を更新: `type TranslationProvider = "elevenlabs" | "rask" | "heygen";`
- 管理ツールのRadioGroupにHeyGenオプションを追加
- `handleProviderChange`でHeyGenの名前を正しく表示
- `handleVideoTranslate`でHeyGen用の関数呼び出しを追加

```typescript
// Line 150
type TranslationProvider = "elevenlabs" | "rask" | "heygen";

// Line 2651-2664 RadioGroup内に追加
<div className="flex items-center gap-1.5">
  <RadioGroupItem value="heygen" id="admin-heygen" />
  <Label htmlFor="admin-heygen">HeyGen</Label>
</div>

// handleVideoTranslate内の関数名決定
const functionName = provider === 'rask' 
  ? 'rask-translate-video' 
  : provider === 'heygen'
    ? 'heygen-translate-video'
    : 'translate-video';
```

---

### 2. ステータス確認の「not found」問題の調査結果

**ログから判明した原因:**

```
[heygen-check-status] HeyGen status response: 
{"data":null,"error":{"code":"internal_error","message":"Video translate not found"}}
```

これは以下のいずれかを意味します：
1. **HeyGenで翻訳ジョブが正常に作成されなかった** - 開始時にAPIエラーがあった可能性
2. **HeyGen Scale/Enterpriseプラン未加入** - Video Translate APIはScale以上のプランが必要
3. **プロジェクトIDが期限切れまたは無効** - HeyGenのプロジェクトは一定期間後に削除される

**現在の対応:**
- `heygen-check-status`は既に適切にエラーハンドリングしている（`failed: true`を返す）
- UIでは「HeyGenのScale/Enterpriseプランが必要な場合があります」というヒントを表示

**追加修正:**
- 進行中の翻訳リストから、`failed: true`のジョブを自動削除するオプションを追加
- 管理ツールに「失敗したジョブを削除」ボタンを追加

---

### 3. ファイル変更一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/components/admin/VideosManagement.tsx` | HeyGenを翻訳プロバイダーに追加、handleVideoTranslateのHeyGen対応 |

---

### 4. 技術的詳細

```typescript
// handleProviderChange更新
const handleProviderChange = (value: TranslationProvider) => {
  setTranslationProvider(value);
  localStorage.setItem('translation_provider', value);
  const providerNames = {
    elevenlabs: 'ElevenLabs',
    rask: 'Rask.ai',
    heygen: 'HeyGen'
  };
  toast.success(`翻訳プロバイダーを ${providerNames[value]} に変更しました`);
};

// handleVideoTranslate更新（Line ~1856）
const provider = localStorage.getItem('translation_provider') || 'elevenlabs';
const functionName = provider === 'rask' 
  ? 'rask-translate-video' 
  : provider === 'heygen'
    ? 'heygen-translate-video'
    : 'translate-video';  // ElevenLabsのデフォルト
```

---

### 5. HeyGenの「not found」問題について

**注意事項:**
- HeyGenで翻訳を開始する際、APIが成功レスポンスを返しても、その後のステータス確認で「not found」になる場合がある
- これはHeyGen側のプラン制限またはAPI制限による可能性が高い
- 既存の`failed: true`ハンドリングにより、UIで適切に「翻訳ジョブが見つかりません」と表示される
- ユーザーは「削除」ボタンで進行中リストから手動で削除可能

