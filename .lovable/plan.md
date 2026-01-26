

# HeyGen動画吹き替えが「処理中」のまま止まる問題の修正計画

## 問題の分析結果

781分間止まっている原因を調査しました：

1. **プロバイダー情報の欠落**: `localStorage` から復元された翻訳ジョブに `provider` フィールド（heygen/rask/elevenlabs）が保存されていなかった
2. **間違ったAPIエンドポイントへのルーティング**: `provider` が undefined のとき、コードはデフォルトで `check-translation-status`（ElevenLabs用）を呼び出す
3. **結果**: HeyGenのプロジェクトIDがElevenLabsのAPIに送信され、ElevenLabs側でIDが見つからないがエラーを返さず「処理中」として返される

## 修正内容

### 1. LocalStorage復元時のプロバイダー推定ロジックを追加

`provider` が欠落している古いジョブを復元する際に、プロジェクトIDのパターンからプロバイダーを推定する機能を追加します。

```text
変更ファイル: src/components/admin/VideosManagement.tsx

修正箇所: lines 801-837 (useEffect - localStorage復元)

追加ロジック:
- HeyGenのプロジェクトIDは短い英数字（例: "abc123xyz"）
- ElevenLabsのdubbing_idは英数字混合
- Rask.aiは特定のパターン

providerが欠落している場合:
1. プロジェクトIDの長さとパターンで推定を試みる
2. 推定できない場合は「unknown」として明示的にマーク
3. 「unknown」のジョブは手動確認を促す警告を表示
```

### 2. 不明なプロバイダーの場合のフォールバック処理

```text
変更ファイル: src/components/admin/VideosManagement.tsx

修正箇所: lines 852-868 (checkAllTranslations関数)

改善内容:
- provider が undefined または "unknown" の場合、3つのエンドポイント全てを順番に試行
- 最初に成功したレスポンスを採用
- エラーが続く場合は「failed」として処理
```

### 3. 「処理中」UIでプロバイダー情報を表示

```text
変更ファイル: src/components/admin/VideosManagement.tsx

修正箇所: 処理中ジョブのカード表示部分

追加内容:
- プロバイダー名をバッジで表示（ElevenLabs=青、Rask=緑、HeyGen=紫）
- provider が不明な場合は警告アイコンと「プロバイダー不明」を表示
- 手動でプロバイダーを選択し直すオプションを追加
```

### 4. スタックしたジョブの強制クリア機能

```text
変更ファイル: src/components/admin/VideosManagement.tsx

追加箇所: 処理中カードに「強制削除」ボタン

機能:
- 個別ジョブの即時削除
- 確認ダイアログなしで即座にリストから削除
- localStorageも更新
```

### 5. 根本対策: 保存時のprovider必須化

```text
変更ファイル: src/components/admin/TranslationQuickDialog.tsx

確認・修正箇所: 翻訳開始時のコールバック

確認内容:
- onTranslationStarted コールバックで provider が正しく渡されているか確認
- localStorageへの保存時に provider が含まれているか確認
```

---

## 実装順序

1. まず「強制削除」ボタンを追加して、781分止まっているジョブを削除できるようにする
2. provider 推定ロジックを追加
3. フォールバック処理を実装
4. UI表示を改善

---

## 技術詳細

### Provider推定ロジック（仮案）

```typescript
function inferProvider(projectId: string): 'heygen' | 'rask' | 'elevenlabs' | 'unknown' {
  // HeyGen: 比較的短いUID形式
  if (/^[a-zA-Z0-9]{15,25}$/.test(projectId)) {
    return 'heygen';
  }
  // ElevenLabs dubbing_id: 特定のパターン
  if (/^[a-zA-Z0-9_-]{20,40}$/.test(projectId)) {
    return 'elevenlabs';
  }
  // Rask.ai: 特定のフォーマット
  if (projectId.includes('-') && projectId.length > 30) {
    return 'rask';
  }
  return 'unknown';
}
```

### 即時対応策

現在781分止まっているジョブについては：
- 「古いジョブをクリア」ボタンで24時間以上のジョブを削除
- または「X」ボタンで個別削除

これらの機能は既に存在するので、まずそちらをお試しください。

