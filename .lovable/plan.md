## 原因

`techniques` テーブルは中間テーブルを使わず単一行で管理されており、シリーズ情報は2つのカラムに二重管理されています。

- `series_prefix` (A〜K) + `series_order`: 新しい体系（A-17 など）
- `series_name` (テキスト, 例「エスケープ」「クローズドガード」): 旧体系。管理画面のグルーピングと、視聴ページの「関連動画」取得 (`Video.tsx` の `.eq("series_name", ...)`) に使われている

過去の移行（J-1〜J-8 → A-17〜A-25, J-2→D-7, J-3→G-12 等）では `series_prefix` と `series_order` のみ更新し、`series_name` を据え置きにしたため：

1. 元 J の動画が `series_name = "エスケープ"` のまま prefix だけ A / D / G に変わり、
2. 管理画面の「シリーズ別カウント」（series_name 集計）では J/K から減らず、
3. 視聴ページの関連動画は `series_name = "エスケープ"` で引くので、prefix=A の A-10 等が混ざって表示される

現在の DB 実数：
- prefix J = 1 件（アキレス腱固めのエスケープとカウンター）
- prefix K = 1 件（アキレス腱固め）
- series_name="エスケープ" は A:7, D:1, G:1, J:1 にまたがる

## 対応

### 1. データクレンジング（マイグレーションで一括補正）

prefix と series_name の正規対応表を確定し、ズレている行の `series_name` を prefix 側に揃える。

```text
A → クローズドガード
B → クローズドガードブレイク
C → コンバットベース
D → マウント
E → 引き込み
F → コンバットベースへの対応
G → サイドポジション
H → バックコントロール
I → スパイダーガード
J → エスケープ
K → サブミッション
```

対象（事前に SELECT で再確認してから UPDATE）：
- series_name="エスケープ" かつ prefix∈(A,D,G) の 9 件 → prefix に対応する名前へ
- series_name="サブミッション" かつ prefix=A の 2 件 → 「クローズドガード」へ

実行は `supabase--insert`（UPDATE 文）で行い、件数を出して報告。

### 2. 移行ロジックの修正（再発防止）

`src/components/admin/VideosManagement.tsx` のインライン編集 (`saveEdit`):
- `series_prefix` を編集した場合、prefix→canonical series_name マップを使って `series_name` も同時更新する。
- `series_name` 編集時の自動 prefix 同期は既存のまま維持。

`src/pages/TechniqueEdit.tsx` の保存処理:
- フォーム保存時に `series_prefix` と `series_name` のどちらかだけが変わっても、もう一方を canonical マップで補正してから UPDATE。

canonical マップは `src/lib/seriesMap.ts`（新規）に切り出して両画面で共有。

### 3. 「動画の数」のソース統一

管理画面のシリーズ別件数表示は現状 `series_name` を group key にしている。これを `series_prefix` 基準（または prefix+canonical name）の集計に変更し、レガシー名残りでも正しい件数になるようにする。該当箇所：`VideosManagement.tsx` の `seriesMapping` / 3097行付近の表示、`VideoTranslationManagement.tsx` の同等表示。

### 4. 関連動画クエリの一貫化

`src/pages/Video.tsx` の 2 箇所 (`.eq("series_name", ...)`) を `.eq("series_prefix", techniqueData.series_prefix)` に変更。prefix が空のレガシー動画のみ series_name フォールバックを残す。これで「J の動画を開いたら A-10 が関連に出る」現象が消える。

### 5. 検証

- マイグレーション後、`series_name` × `series_prefix` の組合せを再集計し、各 prefix が単一 series_name に収束していることを確認。
- prefix J/K の件数（J=1, K=1）と各 series_name のカウントが一致することを確認し、結果を報告。

## 触るファイル

- 新規: `src/lib/seriesMap.ts`
- 編集: `src/components/admin/VideosManagement.tsx`, `src/components/admin/VideoTranslationManagement.tsx`, `src/pages/TechniqueEdit.tsx`, `src/pages/Video.tsx`
- DB: `supabase--insert` による UPDATE（スキーマ変更なし、マイグレーション不要）
