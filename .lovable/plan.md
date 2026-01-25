

## 動画一覧画面のUI改善計画

### 概要
動画一覧画面（VideosManagement.tsx）のUIを整理し、より直感的な操作性を実現します。

---

### 変更内容

#### 1. 再生ボタン（オーバーレイ）の削除
現在、サムネイル上にホバー時に表示される再生オーバーレイと、アクションボタン行にある「再生」ボタンの両方があります。

**変更**:
- `VideoCard.tsx`から再生オーバーレイ（134-143行目）を削除
- アクション行の「再生」ボタン（259-268行目）を削除
- サムネイルクリック（`onClick={() => onPreview()}`）は維持

---

#### 2. 編集ボタンをモーダル化
現在は `/admin/technique/:id` へのページ遷移ですが、モーダルで編集できるように変更します。

**変更**:
- `VideosManagement.tsx`に技術編集用のモーダルコンポーネントを追加
- 既存の`showEditDialog`と`editingTechnique`状態を活用
- `openEditDialog`関数を`navigate()`から`setEditingTechnique()`に変更
- モーダル内に編集フォーム（名前、日本語名、ポルトガル語名、公開設定、略称など）を実装
- 保存時に`updateTechnique.mutateAsync()`を呼び出し

---

#### 3. 削除確認ダイアログの追加
現在は`confirm()`のブラウザダイアログを使用していますが、UIライブラリの`AlertDialog`に変更します。

**変更**:
- `VideosManagement.tsx`に削除確認用の状態を追加
  - `deleteTargetId: string | null`
  - `showDeleteConfirm: boolean`
- `AlertDialog`コンポーネントを使用して削除確認UIを実装
- 確認後に`deleteTechnique.mutateAsync(id)`を実行

---

#### 4. 吹き替えボタンの削除
LocalizationStatusの「追加」ボタンから吹き替え機能にアクセスできるため、アクション行の吹き替えボタンは不要です。

**変更**:
- `VideoCard.tsx`から吹き替えボタン（286-295行目）を削除
- `onTranslate`プロップは維持（LocalizationStatusで使用）

---

### 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideoCard.tsx` | 再生オーバーレイ削除、再生ボタン削除、吹き替えボタン削除 |
| `src/components/admin/VideosManagement.tsx` | 編集モーダル追加、削除確認ダイアログ追加 |

---

### 技術詳細

#### VideoCard.tsx の変更
```typescript
// 削除: 再生オーバーレイ (134-143行目)
// 削除: アクション行の再生ボタン (259-268行目)  
// 削除: 吹き替えボタン (286-295行目)
```

#### VideosManagement.tsx の変更
```typescript
// 新規状態
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

// openEditDialog の変更
const openEditDialog = (technique: Technique) => {
  setEditingTechnique(technique);
  setFormData({
    name: technique.name || "",
    name_ja: technique.name_ja || "",
    // ...他のフィールド
  });
  setShowEditDialog(true);
};

// handleDelete の変更
const handleDelete = (id: string) => {
  setDeleteTargetId(id);
};

const confirmDelete = async () => {
  if (deleteTargetId) {
    await deleteTechnique.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
  }
};
```

#### 編集モーダルのUI
- 日本語名（必須）
- 英語名
- ポルトガル語名  
- 公開設定（public/unlisted/private）
- 略称セレクター（NotationSelector）

#### 削除確認ダイアログのUI
```text
┌─────────────────────────────┐
│  本当に削除しますか？         │
│                             │
│  「[技術名]」を削除します。   │
│  この操作は取り消せません。   │
│                             │
│       [キャンセル] [削除]    │
└─────────────────────────────┘
```

