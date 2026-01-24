
# BJJ略称マスターシステム実装計画

## 概要

現在の「A-*, B-*, C-*...」シリーズシステムを「旧」としてレガシー扱いにし、新しいBJJ略称体系（CG, HG, DLR, TC, RNC等）をマスターデータとして構築します。これにより、動画の分類・検索・再生リスト作成がより柔軟になります。

---

## 現状分析

### 現在のシステム
- **techniques テーブル**: `series_prefix`（A, B, C...）と `series_name`（クローズドガード等）で管理
- **カテゴリ**: `category`列（pull, control, submission, guard-pass）
- **ハッシュタグ**: `hashtags` 配列（現在未活用）
- **既存データ**: A〜F シリーズで42件の動画

### 新システムの要件
1. **略称マスター**: ポジション、アクション、サブミッション等をカテゴリ別に管理
2. **動画との関連付け**: 1つの動画に複数の略称をタグ付け可能
3. **フィルタリング**: 略称で動画を絞り込み
4. **カウント表示**: 各略称に何件の動画があるか表示
5. **再生リスト連携**: 略称の組み合わせで再生リストを作成

---

## データベース設計

### 新規テーブル1: `bjj_notations` (略称マスター)

```text
┌─────────────────────────────────────────────────────────────┐
│ bjj_notations (略称マスター)                                  │
├─────────────────────────────────────────────────────────────┤
│ id             UUID PRIMARY KEY                             │
│ code           TEXT UNIQUE NOT NULL  -- 'CG', 'HG', 'TC'等   │
│ name_ja        TEXT NOT NULL         -- '日本語名称'          │
│ name_en        TEXT NOT NULL         -- 'English Name'       │
│ category       TEXT NOT NULL         -- 'position', 'action',│
│                                      -- 'submission', 'grip',│
│                                      -- 'movement', 'outcome'│
│ description    TEXT                  -- 詳細説明              │
│ usage_example  TEXT                  -- 使用例                │
│ display_order  INTEGER DEFAULT 0     -- 表示順                │
│ is_active      BOOLEAN DEFAULT true  -- 有効/無効             │
│ created_at     TIMESTAMPTZ           -- 作成日時              │
└─────────────────────────────────────────────────────────────┘
```

### 新規テーブル2: `technique_notations` (動画×略称の中間テーブル)

```text
┌─────────────────────────────────────────────────────────────┐
│ technique_notations (動画と略称の関連付け)                    │
├─────────────────────────────────────────────────────────────┤
│ id             UUID PRIMARY KEY                             │
│ technique_id   UUID REFERENCES techniques(id)               │
│ notation_id    UUID REFERENCES bjj_notations(id)            │
│ context        TEXT                  -- 'start', 'end',      │
│                                      -- 'opponent' 等        │
│ created_at     TIMESTAMPTZ                                  │
│ UNIQUE(technique_id, notation_id, context)                  │
└─────────────────────────────────────────────────────────────┘
```

### 略称カテゴリ一覧

| category | 説明 | 例 |
|----------|------|-----|
| position | ポジション・ガード | CG, HG, MT, SC, BC |
| action | アクション・動作 | K, B, P, SW, ESC |
| submission | サブミッション | AB, TC, RNC, GUI, KIM |
| grip | グリップ・クラッチ | UH, OH, CF, WrC |
| movement | 基本動作・概念 | Ebi, Brg, Frm, Pst |
| outcome | 試合・結果 | Tap, Sub, Pts, Adv |
| takedown | 立ち技・テイクダウン | TD, GP, DL, SL |

---

## 管理画面設計

### 新規コンポーネント: `NotationsManagement.tsx`

AdminSidebarの「コンテンツ」グループ内に追加:

```text
コンテンツ
├── 動画一覧
├── 再生リスト
└── 略称マスター  ← 新規追加
```

### 略称マスター画面の機能

1. **一覧表示**
   - カテゴリ別タブ（ポジション/アクション/サブミッション等）
   - 各略称の使用件数を表示
   - 検索・フィルタ機能

2. **CRUD操作**
   - 新規略称の追加
   - 編集・削除
   - 有効/無効の切り替え

3. **統計ダッシュボード**
   - カテゴリ別の略称数
   - 動画への紐付け状況

### 動画管理画面への統合

`VideosManagement.tsx`に以下を追加:

1. **略称タグ表示**: 各動画カードに紐付いた略称バッジを表示
2. **略称フィルタ**: 特定の略称で動画を絞り込み
3. **略称編集**: 動画編集ダイアログで略称を追加/削除

### 再生リストへの統合

`PlaylistsManagement.tsx`に以下を追加:

1. **略称ベースの自動リスト生成**: 例「CGからの攻め」「サブミッション系」
2. **フロー記述**: `CG -> CGB -> SC` のような記法で動画を選択

---

## 初期データ投入

ユーザーが提供した略称リストをすべてマスターに登録:

### ポジション (17件)
CG, HG, OG, CB, DLR, RDLR, BFG, SLX, XG, SG, LG, SC, MT, BC, KOB, TT, DHG, ZG, 5050, RG, WG, SqG, Don

### アクション (11件)
K, B, P, SW, ESC, RET, TD, Pull, BP, KP, SP, LP, LgD, OP

### サブミッション (23件)
AB, TC, RNC, GUI, KIM, AMI, OMO, HH, KB, TH, EZ, CC, DAR, ANA, BA, LC, Clk, BB, WL, SAL, IHH, OHH, CS, Est

### グリップ (14件)
UH, OH, WZ, CF, KC, WrC, Slv, Clr, Pnt, BlT, PG, PkG, GG, SGS

### ムーブメント (7件)
Ebi, Brg, Frm, Pst, Scr, Inv, Hip

### 立ち技 (10件)
GP, DL, SL, AL, OSG, UCH, SMG, ST, AT, CT

### 結果 (6件)
Tap, Sub, Pts, Adv, Pen, DQ

合計: 約90件の初期データ

---

## 実装ステップ

### Phase 1: データベース構築
1. `bjj_notations` テーブル作成
2. `technique_notations` 中間テーブル作成
3. RLSポリシー設定（管理者のみ編集可、閲覧は全員可）
4. 初期データ投入

### Phase 2: 管理画面 - 略称マスター
1. `NotationsManagement.tsx` 作成
2. AdminSidebarにメニュー追加
3. CRUD機能実装
4. カテゴリ別タブとカウント表示

### Phase 3: 動画管理への統合
1. 動画カードに略称バッジ追加
2. 略称フィルタ機能
3. 動画編集ダイアログで略称編集
4. `usePaginatedTechniques`に略称フィルタ追加

### Phase 4: 再生リスト連携
1. 略称による動画自動選択機能
2. フロー記法のプレビュー

---

## 技術詳細

### フロント側の型定義

```typescript
// src/types/notation.ts
export interface BJJNotation {
  id: string;
  code: string;          // 'CG', 'TC' 等
  name_ja: string;       // 'クローズドガード'
  name_en: string;       // 'Closed Guard'
  category: NotationCategory;
  description?: string;
  usage_example?: string;
  display_order: number;
  is_active: boolean;
  technique_count?: number; // 紐付いた動画数
}

export type NotationCategory = 
  | 'position' 
  | 'action' 
  | 'submission' 
  | 'grip' 
  | 'movement' 
  | 'takedown'
  | 'outcome';
```

### 動画への略称フィルタ例

```typescript
// usePaginatedTechniques.tsx に追加
if (filters.notations && filters.notations.length > 0) {
  // technique_notations テーブルとJOIN
  query = query.in('id', 
    supabase.from('technique_notations')
      .select('technique_id')
      .in('notation_id', filters.notations)
  );
}
```

---

## 既存データとの互換性

| 既存 | 対応 |
|------|------|
| series_prefix: A | CG（クローズドガード）に紐付け |
| series_prefix: B | CGB等（クローズドガードブレイク）に紐付け |
| series_prefix: C | CB（コンバットベース）に紐付け |
| series_prefix: D | MT（マウント）に紐付け |
| series_prefix: E | Pull（引き込み）に紐付け |
| series_prefix: F | CB系（コンバットベース対応）に紐付け |

旧シリーズ表記はユーザー画面でそのまま使用を継続し、新システムは管理・分類用として並行運用。

---

## UIイメージ

### 略称マスター管理画面

```text
┌────────────────────────────────────────────────────────────┐
│ 略称マスター                                    [＋ 新規追加] │
├────────────────────────────────────────────────────────────┤
│ [ポジション(23)] [アクション(11)] [サブミッション(23)] ...   │
├────────────────────────────────────────────────────────────┤
│ 🔍 検索...                                                  │
├────────────────────────────────────────────────────────────┤
│ ┌──────┬────────────────┬─────────────────┬──────┬────┐    │
│ │ CODE │ 日本語          │ English         │ 動画 │ 操作│    │
│ ├──────┼────────────────┼─────────────────┼──────┼────┤    │
│ │ CG   │ クローズドガード │ Closed Guard    │  10  │ ✎ 🗑│    │
│ │ HG   │ ハーフガード     │ Half Guard      │   5  │ ✎ 🗑│    │
│ │ DLR  │ デラヒーバ       │ De La Riva      │   3  │ ✎ 🗑│    │
│ └──────┴────────────────┴─────────────────┴──────┴────┘    │
└────────────────────────────────────────────────────────────┘
```

### 動画カードでの表示

```text
┌──────────────────────────────────────┐
│ [サムネイル]  A-1 クローズドガードの基本 │
│              ⏱ 5:32                   │
│              [CG] [Frm] [RET]         │ ← 略称バッジ
└──────────────────────────────────────┘
```

---

## 成果物一覧

| ファイル | 内容 |
|----------|------|
| 新規: `src/components/admin/NotationsManagement.tsx` | 略称マスター管理画面 |
| 新規: `src/types/notation.ts` | 略称関連の型定義 |
| 新規: `src/hooks/useNotations.ts` | 略称データ取得用Hook |
| 変更: `src/components/admin/AdminSidebar.tsx` | メニューに略称マスター追加 |
| 変更: `src/components/admin/VideosManagement.tsx` | 略称フィルタ・バッジ追加 |
| 変更: `src/components/admin/VideoCard.tsx` | 略称バッジ表示 |
| 変更: `src/hooks/usePaginatedTechniques.tsx` | 略称フィルタ対応 |
| DB: マイグレーション | `bjj_notations`, `technique_notations` テーブル作成 + 初期データ |
