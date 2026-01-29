
# hacomono風システム - 追加機能実装プラン

## 現状分析

### 実装済みの機能 ✅
1. **データベース基盤**: 6テーブル（dojo_classes, dojo_class_schedules, dojo_class_bookings, dojo_membership_plans, dojo_memberships, dojo_check_ins）
2. **クラス管理**: DojoClassesManagement（クラス定義・スケジュール設定）
3. **会員管理**: DojoMembersManagement（会員一覧・ステータス更新）
4. **入退館スキャン**: DojoCheckInScanner（QRコード読取・チェックイン記録）
5. **予約システム**: ClassCalendar, ClassBookingDialog（週間カレンダー・予約作成）
6. **デジタル会員証**: DojoMembershipCard（QRコード表示）
7. **予約一覧**: MyBookings（ユーザーの予約履歴）
8. **出席履歴**: AttendanceHistory（チェックイン履歴）

### 未実装の機能 ❌
以下の機能がまだ実装されていません：

---

## 追加実装する機能

### 1. 予約管理ダッシュボード（管理者向け）
道場オーナーが全ての予約を一覧で確認・管理できる画面

**新規コンポーネント**: `DojoBookingsManagement.tsx`
- 日付フィルター（今日/今週/今月）
- ステータスフィルター（確認済み/キャンセル待ち/出席/欠席）
- クラス別フィルター
- 予約のキャンセル・ステータス変更機能
- CSVエクスポート機能

### 2. 出席レポート・統計ダッシュボード
出席率や人気クラスなどの統計情報をグラフで可視化

**新規コンポーネント**: `DojoAttendanceReport.tsx`
- 月別出席者数グラフ（recharts使用）
- 曜日別・時間帯別人気度ヒートマップ
- アクティブ会員数/休眠会員数の推移
- クラス別参加率ランキング
- 新規入会者数推移

### 3. 体験予約フォーム（非会員向け）
ウェブサイトから直接体験クラスを予約できる機能

**新規コンポーネント**: `TrialBookingForm.tsx`
- 名前・メール・電話番号入力
- 希望日時選択
- 体験クラス選択
- 確認メール送信
- 道場側への通知

**データベース変更**:
```sql
CREATE TABLE dojo_trial_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES dojos(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE NOT NULL,
  schedule_id UUID REFERENCES dojo_class_schedules(id),
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. キャンセル待ち自動昇格システム
キャンセル発生時に待機者を自動で繰り上げ

**実装内容**:
- データベーストリガー：予約キャンセル時に待機者を確認
- 待機者への通知（メール/プッシュ）
- 24時間以内に承諾がなければ次の待機者へ

**新規Edge Function**: `notify-waitlist/index.ts`

### 5. 予約リマインダー通知
クラス前日/当日にリマインダーを送信

**新規Edge Function**: `send-booking-reminder/index.ts`
- Resend API経由でメール送信
- クラス開始24時間前・1時間前に通知
- cronジョブで定期実行

### 6. 道場別Stripe連携（会員プラン決済）
道場ごとの会員プランをStripeで決済

**新規Edge Function**: `create-dojo-membership-checkout/index.ts`
- 道場の`stripe_price_id`を使用してCheckout Session作成
- 成功時に`dojo_memberships`テーブルに自動登録

**新規コンポーネント**: `DojoMembershipPlansManagement.tsx`
- プラン作成・編集・削除
- Stripe価格ID連携
- 決済リンク生成

### 7. 会員プラン管理（ユーザー側）
マイページから道場の会員登録・プラン変更

**MyPage.tsx への追加**:
- 「道場会員」タブ追加
- 所属道場一覧
- 会員証表示
- プラン変更・解約

### 8. 道場詳細ページへの予約UI統合
Dojo.tsxにインタラクティブなスケジュール表示を追加

**Dojo.tsx への変更**:
- ClassCalendarコンポーネントの組み込み
- 「このクラスを予約」ボタン
- リアルタイム空き状況表示
- 体験予約ボタン

---

## 技術詳細

### 新規データベーステーブル

```sql
-- 体験予約テーブル
CREATE TABLE public.dojo_trial_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  schedule_id UUID REFERENCES public.dojo_class_schedules(id) ON DELETE SET NULL,
  experience_level TEXT DEFAULT 'none',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  staff_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLSポリシー
ALTER TABLE public.dojo_trial_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dojo staff can manage trial bookings" ON public.dojo_trial_bookings
  FOR ALL USING (public.is_dojo_staff(dojo_id, auth.uid()));

CREATE POLICY "Public can create trial bookings" ON public.dojo_trial_bookings
  FOR INSERT WITH CHECK (true);
```

### 新規コンポーネント構造

```text
src/components/
  dojo/
    TrialBookingForm.tsx      # 体験予約フォーム
    DojoMembershipPlans.tsx   # 会員プラン表示（ユーザー向け）
    
  admin/
    DojoBookingsManagement.tsx    # 予約管理
    DojoAttendanceReport.tsx      # 出席レポート
    DojoMembershipPlansManagement.tsx  # プラン管理
    DojoTrialBookingsManagement.tsx    # 体験予約管理
```

### 新規Edge Functions

```text
supabase/functions/
  notify-waitlist/index.ts           # キャンセル待ち通知
  send-booking-reminder/index.ts     # 予約リマインダー
  create-dojo-membership-checkout/index.ts  # 道場会員決済
  process-dojo-membership-webhook/index.ts  # Webhook処理
```

---

## 実装優先順位

| 優先度 | 機能 | 理由 |
|--------|------|------|
| 1 | 予約管理ダッシュボード | 管理者が予約を確認できないと運用困難 |
| 2 | 出席レポート | 道場運営の分析に必須 |
| 3 | 道場詳細への予約UI統合 | ユーザーが予約できる導線が必要 |
| 4 | 体験予約フォーム | 新規会員獲得に重要 |
| 5 | 予約リマインダー | 無断欠席防止 |
| 6 | キャンセル待ち自動昇格 | 枠の有効活用 |
| 7 | 道場別Stripe連携 | マネタイズに必要 |
| 8 | 会員プラン管理（ユーザー側） | セルフサービス化 |

---

## UIイメージ

### DojoManagementWrapper への追加タブ
現在: クラス管理 / 会員管理 / 入退館
追加: **予約一覧** / **レポート** / **体験予約** / **プラン設定**

### 出席レポートのグラフ例
- 棒グラフ：月別チェックイン数
- 円グラフ：クラスタイプ別参加比率
- 折れ線グラフ：会員数推移
- ヒートマップ：曜日×時間帯の人気度
