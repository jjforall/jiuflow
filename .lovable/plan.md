
# 動画一覧改善計画

## 要件

1. **動画カードに略称（notation）を表示する** - 現在紐付けられている略称バッジをカードに表示
2. **旧シリーズ（A, B, etc.）を「削除予定」として別の場所に表示** - レガシー情報を明確に区別
3. **動画時間取得機能の修正** - 現在「Failed to fetch」エラーが出る問題を調査・修正

---

## 現状分析

### VideoCard.tsx の現状
- 略称（notation）バッジは表示されていない
- シリーズバッジ（A-1, B-2等）はサムネイル左上に表示
- 動画時間は右下に表示、未取得時は「取得」ボタン

### VideosManagement.tsx の現状
- 略称データは`technique_notations`テーブルから取得可能だが、VideoCardに渡していない
- 動画時間取得は`admin-update-video-durations`エッジ関数を使用

### 動画時間取得の問題
- ネットワークログ: `Failed to fetch`エラー
- エッジ関数自体は正常に動作（認証なしで403返却確認済み）
- Cloudflare認証情報（CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN）は設定済み
- 原因: CORSエラーまたはタイムアウトの可能性

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/admin/VideoCard.tsx` | 略称バッジ追加、旧シリーズを「削除予定」表示に変更 |
| `src/components/admin/VideosManagement.tsx` | 略称データをバッチ取得してVideoCardに渡す |

---

## 技術詳細

### 1. VideoCard.tsx - 略称バッジと旧シリーズ表示の追加

**新しいpropsを追加:**
```typescript
interface VideoCardProps {
  technique: Technique;
  // ...existing props...
  notations?: Array<{ code: string; category: string }>; // 追加
}
```

**カードレイアウトの変更:**
```text
┌──────────────────────────────────────────────────────────────┐
│ ┌─────────────┐  タイトル                    [カテゴリ]      │
│ │             │  サブタイトル                                │
│ │  サムネイル  │                                              │
│ │             │  略称: [CG] [SW] [ARM]  (新システム)         │
│ │  ⏱ 5:32    │                                              │
│ └─────────────┘  🗑️ A-3 (旧・削除予定)                       │
│                                                              │
│                  ローカライズステータス                       │
│                  [再生] [字幕] [吹替] [編集] [削除]           │
└──────────────────────────────────────────────────────────────┘
```

**実装変更:**
- 略称バッジをタイトル下に表示（色分けはカテゴリ別）
- 旧シリーズバッジを薄いグレーの「削除予定」スタイルに変更
- 旧シリーズは小さく目立たないように表示

### 2. VideosManagement.tsx - 略称データの一括取得

**データ取得の追加:**
```typescript
// 全動画の略称マッピングを取得
const [notationMap, setNotationMap] = useState<Record<string, Array<{ code: string; category: string }>>>({});

useEffect(() => {
  const fetchNotationLinks = async () => {
    const { data: links } = await supabase
      .from('technique_notations')
      .select('technique_id, notation:bjj_notations(code, category)');
    
    const map: Record<string, Array<{ code: string; category: string }>> = {};
    links?.forEach(link => {
      if (link.technique_id && link.notation) {
        if (!map[link.technique_id]) map[link.technique_id] = [];
        map[link.technique_id].push({
          code: link.notation.code,
          category: link.notation.category,
        });
      }
    });
    setNotationMap(map);
  };
  
  fetchNotationLinks();
}, []);
```

**VideoCardへのデータ渡し:**
```typescript
<VideoCard
  key={technique.id}
  technique={technique}
  notations={notationMap[technique.id] || []}
  // ...other props
/>
```

### 3. 動画時間取得の修正

**問題の原因調査:**
- 「Failed to fetch」はブラウザ側のネットワークエラー（CORSまたはタイムアウト）
- エッジ関数は正常動作（認証なしで適切な403返却）

**修正ポイント:**
- エッジ関数の呼び出し時のエラーハンドリング強化
- タイムアウト設定の追加
- リトライ機能の追加

```typescript
const fetchDurationFromVideo = async (videoUrl: string): Promise<number | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
    
    const { data, error } = await supabase.functions.invoke(
      'admin-update-video-durations',
      { 
        body: { mode: 'fetch', videoUrl },
      }
    );
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error('Duration fetch error:', error);
      return null;
    }
    
    return data?.duration || null;
  } catch (err) {
    console.error('Failed to fetch duration:', err);
    return null;
  }
};
```

---

## 略称バッジのデザイン

カテゴリ別の色を使用（既存の`NOTATION_CATEGORY_LABELS`を活用）:
- position（位置）: 青
- action（動作）: 緑
- submission（極技）: 赤
- grip（グリップ）: 黄
- movement（移動）: 紫
- takedown（立技）: オレンジ

**表示例:**
```
略称: [CG] [SW] [ARM]
      (青)  (緑)  (赤)
```

---

## 旧シリーズバッジのデザイン変更

**Before (現在):**
```
[A-3]  ← サムネイル左上、目立つ色
```

**After (変更後):**
```
🗑️ A-3 (旧)  ← 本文エリアに移動、グレー・小さいフォント
```

スタイル:
- 薄いグレー背景
- 小さいフォント (text-xs)
- 「(旧)」または「⚠️削除予定」のラベル
- 略称バッジの後に表示

---

## 実装順序

1. VideoCard.tsxに`notations` propsを追加
2. 略称バッジの表示ロジックを実装
3. 旧シリーズバッジのスタイルを「削除予定」に変更
4. VideosManagement.tsxで略称データを一括取得
5. VideoCardにデータを渡す
6. 動画時間取得のエラーハンドリング強化

---

## 追加インポート

```typescript
// VideoCard.tsx
import { NOTATION_CATEGORY_LABELS, type NotationCategory } from "@/types/notation";
```
