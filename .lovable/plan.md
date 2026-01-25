

## HeyGen翻訳ステータス問題 & UI改善計画

### 問題1: HeyGen翻訳ステータスが「not found」になる

#### 原因分析

**ログから判明した事実:**
```
[heygen-check-status] HeyGen status response: {"data":null,"error":{"code":"internal_error","message":"Video translate not found"}}
```

**原因は複合的:**

1. **HeyGen API の仕様制限:**
   - HeyGenのドキュメントによると「翻訳後の動画URLは7日で期限切れ」
   - 翻訳ジョブ自体もAPIから一定期間後に削除される可能性がある
   - 完了メールは届いているが、ステータスAPIでは既に参照できない

2. **異なるプロバイダーのIDが混在:**
   - `ecca1e3dbd02445a9400ec834a1d0a6e-en` → HeyGenのIDパターン（32文字16進数）
   - `5F32SFsv2O1bpWcK9hqJ` → Raskのパターン（20文字英数字）
   - プロバイダーごとに異なるステータスエンドポイントを呼ぶ必要がある

3. **LocalStorageベースの追跡:**
   - `activeTranslations` はlocalStorageから復元される
   - データベースの `translation_history` からは読み込まれていない
   - 古いエントリが残り続ける問題がある

#### 解決策

##### 1-A. 失敗した翻訳のクリーンアップ機能
LocalStorageに残っている取得不能な翻訳エントリを手動で削除できるようにする。

**修正ファイル:** `src/components/admin/VideosManagement.tsx`

```tsx
// 進行中の翻訳カードに「削除」ボタンを追加
<Button 
  size="sm" 
  variant="ghost" 
  onClick={() => removeFromActiveTranslations(translation.projectId)}
>
  <X className="w-4 h-4" />
</Button>

// 削除関数
const removeFromActiveTranslations = (projectId: string) => {
  setActiveTranslations(prev => prev.filter(t => t.projectId !== projectId));
};
```

##### 1-B. HeyGenメール完了時の手動URL登録機能
HeyGenからのメールには翻訳完了動画のURLが含まれているため、手動で入力できるダイアログを追加する。

**新規追加:**
- 「完了済みだがURL未取得」ケースで「URLを手動入力」ボタンを表示
- URLを入力→Cloudflareにアップロード→video_metadataに保存

##### 1-C. 起動時にデータベースからも翻訳履歴を読み込む
`translation_history` テーブルから `status = 'processing'` のレコードも `activeTranslations` に追加する。

---

### 問題2: 公開設定をもっと視覚的に分かりやすく

#### 現状
- `unlisted`/`private` のみバッジ表示
- `public` は何も表示されない
- バッジが小さく目立たない

#### 改善案

##### 2-A. すべてのvisibilityにバッジを表示（サムネイル左上）
サムネイル画像の左上隅に公開設定バッジを固定表示する。

```tsx
// サムネイル内の左上にバッジ追加
<div className="absolute top-1.5 left-1.5">
  {technique.visibility === 'public' && (
    <Badge className="bg-green-600/90 text-white text-[9px] px-1.5 py-0.5">
      <Globe className="h-2.5 w-2.5 mr-0.5" />
      公開
    </Badge>
  )}
  {technique.visibility === 'unlisted' && (
    <Badge className="bg-yellow-500/90 text-black text-[9px] px-1.5 py-0.5">
      <Link2 className="h-2.5 w-2.5 mr-0.5" />
      限定
    </Badge>
  )}
  {technique.visibility === 'private' && (
    <Badge className="bg-red-600/90 text-white text-[9px] px-1.5 py-0.5">
      <Lock className="h-2.5 w-2.5 mr-0.5" />
      非公開
    </Badge>
  )}
</div>
```

##### 2-B. コンテンツエリアのvisibilityバッジを削除
サムネイルに表示することで、コンテンツエリアのバッジは不要になる。

---

### 問題3: 旧タグを動画カードの右下に小さく表示

#### 現状
```text
┌─────────────────────────────────────────────────┐
│ [サムネイル]  タイトル                          │
│              説明                               │
│              [技術タグバッジ...]                │
│              ⚠️ A-3 (旧・削除予定)  ← ここ      │
│              [ローカライズ状況...]              │
│              [アクションボタン...]              │
└─────────────────────────────────────────────────┘
```

#### 改善後
```text
┌─────────────────────────────────────────────────┐
│ [サムネイル]  タイトル                          │
│ └🔒非公開    説明                               │
│              [技術タグバッジ...]                │
│              [ローカライズ状況...]              │
│              [アクションボタン...]    A-3 (旧) ← │
└─────────────────────────────────────────────────┘
```

**修正ファイル:** `src/components/admin/VideoCard.tsx`

```tsx
// Line 242-250 の旧タグ表示を削除し、
// アクションボタン行の右端に移動

<div className="mt-auto flex flex-wrap gap-1.5 sm:gap-2 items-center">
  {/* 既存のアクションボタン */}
  
  {/* 旧タグ - 右端に小さく表示 */}
  {technique.series_prefix && (
    <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono">
      {technique.series_prefix}{technique.series_order ? `-${technique.series_order}` : ''} (旧)
    </span>
  )}
</div>
```

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideoCard.tsx` | ① サムネイル左上にvisibilityバッジ追加<br>② コンテンツエリアのvisibilityバッジ削除<br>③ 旧タグをアクション行の右端に移動 |
| `src/components/admin/VideosManagement.tsx` | ① 進行中翻訳カードに削除ボタン追加<br>② 起動時にDBからも処理中翻訳を読み込み |

---

### 実装順序

1. **VideoCard.tsx の改修**
   - visibilityバッジをサムネイル左上に移動
   - 旧タグをアクション行の右端に移動
   - 縦幅を節約

2. **VideosManagement.tsx の改修**
   - 進行中翻訳カードに削除ボタン追加
   - DBから処理中翻訳を読み込み

3. **テスト・確認**
   - UI表示確認
   - 不要な翻訳エントリを削除できることを確認

---

### 期待される結果

**問題1修正後:**
- 取得不能な進行中翻訳を手動で削除可能
- DBの `translation_history` からも処理中翻訳を表示

**問題2修正後:**
- サムネイル左上に公開設定が一目で分かる
- 緑=公開、黄=限定、赤=非公開

**問題3修正後:**
- 旧タグは右下に小さく表示
- カードの縦幅が削減される

