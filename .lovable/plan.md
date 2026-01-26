
# 新しい大会スケジュール追加計画

## 調査結果

データベースと最新の公式情報を比較した結果、以下の大会がまだ登録されていないことが判明しました。

---

## 追加する大会一覧

### 2025年（未登録分）

| 大会名 | 日程 | 場所 | 主催 |
|--------|------|------|------|
| ADCC All Japan Championship Tokyo 2025 | 2025/12/28 | 墨田区総合体育館（ひがしんアリーナ） | ADCC Japan |
| Tokyo International Summer 2025 | 2025/07/26-27 | 墨田区総合体育館 | ASJJF |
| Hokkaido Championship 2025 | 2025/08/31 | 北ガスアリーナ札幌46 | ASJJF |
| All Japan Championship 2025 (SJJJF) | 2025/10/12-13 | 代々木第二体育館 | SJJJF |
| Spring Jiu-Jitsu Koushien 2025 | 2025/04/26 | 代々木第二体育館 | SJJJF |
| 21st Dumau International Championship | 2025/05/03-04 | 青山記念武道館 | ASJJF |
| Niigata International Open 2025 | 2025/06/29 | 北地区スポーツセンター | ASJJF |

### 2026年（未登録分）

| 大会名 | 日程 | 場所 | 主催 |
|--------|------|------|------|
| IBJJF Brazilian Nationals 2026 | 2026/04/24 - 05/03 | Ginásio José Correa, Barueri | IBJJF |
| SJJJF 9th All Japan Championship 2026 | 2026/10/11-12 | 代々木第二体育館 | SJJJF |
| Guam Marianas Pro Nagoya 2026 | 2026/03/14 | 愛知県武道館 | ASJJF |
| Chugoku Championship 2026 | 2026/03/22 | 岩国市総合体育館 | ASJJF |

---

## 実装手順

### 1. データベースに新しい大会を追加

tournamentsテーブルに以下のフィールドを含む新規レコードを挿入します：

```sql
INSERT INTO tournaments (
  name, name_ja, date_start, date_end, 
  location, location_ja, organizer, 
  country, is_international, category,
  registration_url, registration_deadline,
  venue, venue_ja, slug
) VALUES 
-- 2025年の大会
('ADCC All Japan Championship Tokyo 2025', 'ADCC全日本選手権東京2025', 
 '2025-12-28', NULL, 'Tokyo, Japan', '東京都墨田区', 
 'ADCC', 'JP', false, 'nogi',
 'https://smoothcomp.com/en/event/16936', '2025-12-17',
 'Sumida City Gymnasium', '墨田区総合体育館',
 'adcc-all-japan-championship-tokyo-2025'),

('Tokyo International Summer 2025', '東京インターナショナルサマー2025',
 '2025-07-26', '2025-07-27', 'Tokyo, Japan', '東京都墨田区',
 'ASJJF', 'JP', false, 'open',
 NULL, NULL,
 'Sumida City Gymnasium', '墨田区総合体育館',
 'tokyo-international-summer-2025'),

-- ... (他の大会も同様に追加)
```

### 2. 会場（venues）テーブルとの関連付け

既存の会場IDがある場合はvenue_idを設定：
- 墨田区総合体育館: 既存IDを確認して関連付け
- 代々木第二体育館: 既存IDを確認して関連付け
- 北ガスアリーナ: 既存IDを確認して関連付け

### 3. 重複チェック

登録前に既存の大会と重複がないかをname + date_startで確認し、重複する場合はスキップします。

---

## 技術的な注意点

- **カテゴリ**: `gi`, `nogi`, `open` のいずれかを設定
- **is_international**: 国際大会はtrue、国内大会はfalse
- **slug**: URLフレンドリーな形式（例: `adcc-all-japan-2025`）
- **registration_url**: 公式エントリーページがある場合は設定

---

## 変更対象

データベースへのINSERT操作のみ（コード変更なし）
