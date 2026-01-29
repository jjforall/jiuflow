

# hacomono風 会員管理・予約システム実装プラン

## 概要

hacomonoは、フィットネス・ウェルネス施設向けの会員管理・予約・決済・入退館一元管理プラットフォームです。JiuFlowに同様の機能を実装することで、柔術道場の運営を効率化し、会員のユーザー体験を向上させます。

## 現状分析

### 既存リソース（活用可能）
- **dojos テーブル**: classes, pricing, schedule, trial_info などのJSONBカラムが既に存在（静的データとして表示のみ）
- **events テーブル + event_registrations テーブル**: イベント登録の仕組みが存在
- **subscriptions テーブル**: Stripe連携による月額課金システムが稼働中
- **profiles テーブル**: ユーザー情報管理
- **user_dojos テーブル**: ユーザーと道場の関係性（home/training）を管理

### 不足している機能
1. インタラクティブなクラス予約システム
2. デジタル会員証（QRコード）
3. 入退館管理
4. 道場単位の会員プラン管理
5. 出席履歴・統計

---

## 実装計画

### Phase 1: データベース設計

以下の新規テーブルを作成します：

```text
+-------------------+     +-------------------+     +-------------------+
|   dojo_classes    |     | class_schedules   |     | class_bookings    |
+-------------------+     +-------------------+     +-------------------+
| id                |<--->| id                |<--->| id                |
| dojo_id (FK)      |     | class_id (FK)     |     | schedule_id (FK)  |
| name              |     | day_of_week       |     | user_id (FK)      |
| description       |     | start_time        |     | status            |
| class_type        |     | end_time          |     | checked_in_at     |
| instructor_id     |     | max_capacity      |     | created_at        |
| duration_minutes  |     | is_active         |     +-------------------+
| level             |     +-------------------+
+-------------------+

+-------------------+     +-------------------+
| dojo_memberships  |     | dojo_check_ins    |
+-------------------+     +-------------------+
| id                |     | id                |
| dojo_id (FK)      |     | dojo_id (FK)      |
| user_id (FK)      |     | user_id (FK)      |
| plan_name         |     | checked_in_at     |
| status            |     | checked_out_at    |
| valid_from        |     | booking_id (FK)   |
| valid_until       |     +-------------------+
| qr_token          |
+-------------------+
```

### Phase 2: 会員マイページ機能強化

**新規コンポーネント:**
- `DojoMembershipCard.tsx` - デジタル会員証（QRコード表示）
- `ClassCalendar.tsx` - 週間スケジュールカレンダー
- `ClassBookingDialog.tsx` - クラス予約ダイアログ
- `MyBookings.tsx` - 予約一覧・履歴
- `AttendanceHistory.tsx` - 出席履歴

**MyPage.tsx への追加タブ:**
- 「予約」タブ - 今後の予約一覧
- 「出席履歴」タブ - 月別出席統計
- 「会員証」タブ - QRコード表示

### Phase 3: 道場詳細ページ拡張

**Dojo.tsx への追加:**
- インタラクティブな週間スケジュール表示
- 「このクラスを予約」ボタン
- 残り空き枠数のリアルタイム表示
- 体験予約フォーム

### Phase 4: 管理画面（道場オーナー向け）

**新規管理コンポーネント:**
- `DojoClassesManagement.tsx` - クラス・スケジュール管理
- `DojoMembersManagement.tsx` - 会員一覧・管理
- `DojoCheckInManagement.tsx` - 入退館確認画面（スキャナー用）
- `DojoBookingsManagement.tsx` - 予約一覧・管理
- `DojoAttendanceReport.tsx` - 出席レポート

### Phase 5: QRコード入退館システム

**実装内容:**
1. 会員ごとにユニークなQRトークン発行
2. 道場側でQRスキャンして入退館記録
3. 予約との自動紐付け（予約なしでも入館可能なオプション）

---

## 技術的詳細

### 新規データベーステーブル

```sql
-- クラス定義
CREATE TABLE dojo_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  description_ja TEXT,
  class_type TEXT NOT NULL, -- 'regular', 'open_mat', 'competition', 'private'
  instructor_name TEXT,
  instructor_id UUID REFERENCES celebrities(id),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  level TEXT, -- 'all', 'beginner', 'intermediate', 'advanced'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- スケジュール（繰り返し設定）
CREATE TABLE dojo_class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES dojo_classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 予約
CREATE TABLE dojo_class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES dojo_class_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'attended', 'no_show'
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, user_id, booking_date)
);

-- 道場会員プラン
CREATE TABLE dojo_membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  price INTEGER NOT NULL, -- cents
  interval TEXT NOT NULL DEFAULT 'month', -- 'month', 'year'
  max_bookings_per_month INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 道場会員登録
CREATE TABLE dojo_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES dojo_membership_plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dojo_id, user_id)
);

-- 入退館記録
CREATE TABLE dojo_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES dojo_memberships(id),
  booking_id UUID REFERENCES dojo_class_bookings(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  method TEXT DEFAULT 'qr' -- 'qr', 'manual', 'auto'
);
```

### RLSポリシー

```sql
-- ユーザーは自分の予約のみ閲覧・操作可能
ALTER TABLE dojo_class_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookings" ON dojo_class_bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookings" ON dojo_class_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own bookings" ON dojo_class_bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- 道場オーナー/管理者は全予約を閲覧可能
CREATE POLICY "Dojo admins can view all bookings" ON dojo_class_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dojo_class_schedules s
      JOIN dojo_classes c ON s.id = c.id
      JOIN dojos d ON c.dojo_id = d.id
      WHERE s.id = schedule_id AND d.created_by = auth.uid()
    )
  );
```

### 新規コンポーネント構造

```text
src/components/
  dojo/
    ClassCalendar.tsx         # 週間カレンダー表示
    ClassBookingDialog.tsx    # 予約フォーム
    DojoMembershipCard.tsx    # デジタル会員証
    MyBookings.tsx            # 予約一覧
    AttendanceHistory.tsx     # 出席履歴

  admin/
    DojoClassesManagement.tsx   # クラス管理
    DojoScheduleEditor.tsx      # スケジュール編集
    DojoMembersManagement.tsx   # 会員管理
    DojoCheckInScanner.tsx      # QRスキャナー
    DojoBookingsView.tsx        # 予約一覧（管理者用）
```

### ルーティング追加

```tsx
// App.tsx に追加
<Route path="dojo/:id/schedule" element={<DojoSchedule />} />
<Route path="dojo/:id/book/:scheduleId" element={<ClassBooking />} />
<Route path="dojo/:id/manage" element={
  <ProtectedRoute>
    <DojoManagement />
  </ProtectedRoute>
} />
<Route path="dojo/:id/check-in" element={
  <ProtectedRoute>
    <DojoCheckIn />
  </ProtectedRoute>
} />
```

---

## 実装順序

1. **Week 1**: データベーステーブル作成 + RLSポリシー
2. **Week 2**: クラス・スケジュール管理（管理画面）
3. **Week 3**: 予約システム（ユーザー側）
4. **Week 4**: 会員証・QRコード機能
5. **Week 5**: 入退館管理・出席レポート
6. **Week 6**: テスト・調整

---

## 注意事項

- 既存の `dojos.schedule` JSONBカラムは後方互換性のため残し、新システムへの移行期間を設ける
- Stripe連携は既存の仕組みを拡張し、道場単位のサブスクリプションに対応
- QRコードはクライアントサイドで `qrcode.react` ライブラリを使用して生成

