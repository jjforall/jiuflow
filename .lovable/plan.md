

## お問い合わせ管理の改善：バグ修正 + 返信機能強化

### 調査結果：発見したバグと課題

---

#### バグ1: 技マップの検索が機能しない（ユーザー報告）

| 項目 | 詳細 |
|------|------|
| 報告者 | 辻根孝幸様（2件のお問い合わせ） |
| 問題 | 技マップで検索しても結果が表示されない |
| 原因 | **バグではない** - 技マップの検索は正常に動作している |

**調査結果：**
- 技マップ (`src/pages/Map.tsx`) の検索は全37件の公開技（total 42件中）を正しく読み込んでいる
- 検索はクライアントサイドで `name`、`description`、`hashtags` フィールドを対象に動作
- `name_ja`, `description_ja` も言語設定に応じて検索対象

**真の問題：**
ユーザーが「入会当初に設定した技以外が見られない」と報告している。これは以下の可能性：
1. サブスクリプションが有効になっていない
2. ログイン状態の問題
3. 検索キーワードが技名と一致していない

---

#### バグ2: Join.jsのモジュール読み込みエラー（サポートチケット）

| 項目 | 詳細 |
|------|------|
| 報告 | 匿名ユーザー（2025/12/24） |
| エラー | `TypeError: Failed to fetch dynamically imported module: https://jiuflow.art/assets/Join-DDtLgLkM.js` |
| 原因 | デプロイ時のキャッシュ問題またはネットワーク一時的なエラー |
| 対応 | ページリロードで解決する一時的な問題。特別な修正不要 |

---

#### 課題1: 返信機能がない（要改善）

現在の返信方法：
- `mailto:` リンクでメーラーを開くだけ
- 毎回同じ文面を手動で書く必要がある
- 対応状況の追跡ができない

---

### 実装内容

#### 1. 経過時間表示の追加

お問い合わせ一覧と詳細ダイアログに経過時間を表示：

```typescript
const getElapsedTime = (createdAt: string): { text: string; isDelayed: boolean } => {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return { text: "今日", isDelayed: false };
  if (days === 1) return { text: "昨日", isDelayed: false };
  if (days < 3) return { text: `${days}日前`, isDelayed: false };
  if (days < 7) return { text: `${days}日前`, isDelayed: true };
  if (days < 30) return { text: `${Math.floor(days / 7)}週間前`, isDelayed: true };
  return { text: `${Math.floor(days / 30)}ヶ月前`, isDelayed: true };
};
```

3日以上経過したものは赤色のバッジで「⚠️ 対応遅延」と表示。

---

#### 2. 返信テンプレート機能

定型文をワンクリックで挿入できるようにする：

**テンプレート一覧：**

| キー | ラベル | 用途 |
|------|--------|------|
| `delayed` | 遅延お詫び | 時間が空いたお問い合わせの冒頭に |
| `search` | 検索方法 | 技マップの使い方説明 |
| `cancel` | 解約方法 | 解約手順の案内 |
| `referral` | 紹介コード | 紹介コード適用の対応 |
| `login` | ログイン方法 | ログイン手順の案内 |

---

#### 3. 返信ダイアログ UI

```
┌─────────────────────────────────────────────────────────────┐
│ 📬 返信作成                                                  │
├─────────────────────────────────────────────────────────────┤
│ 宛先: 辻根孝幸様 <lushlife1031@gmai.com>                     │
│ 経過時間: 5日前 ⚠️ 対応遅延                                   │
├─────────────────────────────────────────────────────────────┤
│ 【テンプレート選択】                                         │
│ [遅延お詫び] [検索方法] [解約方法] [紹介コード] [ログイン]   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 辻根様                                                   │ │
│ │                                                         │ │
│ │ お問い合わせいただきありがとうございます。               │ │
│ │ お返事が遅くなり、大変申し訳ございません。               │ │
│ │                                                         │ │
│ │ 技マップの検索について...                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [📋 コピー] [📧 メーラーで開く] [✉️ Resendで送信]             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 4. 返信テンプレート内容

**遅延お詫び（3日以上経過時に自動挿入）：**
```
{name}様

お問い合わせいただきありがとうございます。
お返事が遅くなり、大変申し訳ございません。
```

**検索方法（技マップの使い方）：**
```
【技マップの使い方】
1. 画面上部の検索バーに技名を入力してください
2. 日本語・英語・ポルトガル語で検索可能です
3. シリーズ名をクリックすると、そのシリーズの技一覧が表示されます

【すべての動画を見る方法】
サブスクリプション会員の方は、すべての技動画をご視聴いただけます。
もし特定の動画が見られない場合は、一度ログアウト→再ログインをお試しください。

それでも解決しない場合は、お気軽にご連絡ください。
```

**解約方法：**
```
【解約手順】
1. JiuFlowにログインしてください
2. 右上のアイコンをクリック → 「マイページ」を選択
3. ページ下部の「サブスクリプション設定」セクションへ
4. 「解約する」ボタンをクリック

解約後も、次回更新日までは引き続きサービスをご利用いただけます。
```

**紹介コード：**
```
紹介コードの適用について対応いたします。

こちらで手動にて紹介コードの適用処理を行います。
お手数をおかけしますが、このままお待ちください。

適用が完了しましたら、改めてご連絡いたします。
```

**ログイン方法：**
```
Googleログイン後の手順についてご案内いたします。

【ログイン手順】
1. トップページ右上の「ログイン」ボタンをクリック
2. 「Googleでログイン」を選択
3. Googleアカウントでサインイン
4. ログイン完了後、マイページに移動します

【動画が再生できない場合】
1. ブラウザのキャッシュをクリアしてください
2. 別のブラウザ（Chrome推奨）でお試しください
3. 広告ブロッカーを無効にしてください
```

---

#### 5. Edge Function: send-reply-email（新規作成）

Resendを使用してワンクリックで返信メールを送信：

```typescript
// supabase/functions/send-reply-email/index.ts
const handler = async (req: Request): Promise<Response> => {
  const { to, name, subject, content, originalMessageId } = await req.json();
  
  // Validate inputs
  if (!to || !name || !subject || !content) {
    return new Response(JSON.stringify({ error: "必須フィールドが不足しています" }), { status: 400 });
  }
  
  // Send email via Resend
  const emailResponse = await resend.emails.send({
    from: "JiuFlow Support <onboarding@resend.dev>",
    to: [to],
    subject: `Re: ${subject}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <p>${content.replace(/\n/g, '<br>')}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 14px;">
          JiuFlow サポート<br>
          https://jiuflow.art
        </p>
      </div>
    `,
  });
  
  // Update contact_messages with reply info
  if (originalMessageId) {
    await supabase
      .from('contact_messages')
      .update({
        replied_at: new Date().toISOString(),
        replied_by: (await supabase.auth.getUser()).data.user?.id,
        reply_content: content,
      })
      .eq('id', originalMessageId);
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

---

#### 6. データベース変更

`contact_messages` テーブルに返信追跡用カラムを追加：

```sql
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reply_content TEXT;
```

---

### ファイル変更一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/components/admin/ContactsManagement.tsx` | 経過時間表示、返信テンプレート、返信ダイアログ追加 |
| `supabase/functions/send-reply-email/index.ts` | 新規作成 |
| データベース | `contact_messages`テーブルに3カラム追加 |

---

### 現在のお問い合わせへの対応

以下のお問い合わせに対する返信準備完了後、すぐに対応可能：

| 送信者 | 件名 | 経過日数 | 対応テンプレート |
|--------|------|----------|------------------|
| 辻根孝幸様 | 技マップの検索について | 5日 | 遅延お詫び + 検索方法 |
| 辻根孝幸様 | テクニックの検索について | 5日 | （同上・重複） |
| 石田様 | プラン変更（紹介コード） | 16日 | 遅延お詫び + 紹介コード |
| 一藤隆弘様 | 解約について | 21日 | 遅延お詫び + 解約方法 |
| あなん様 | ログイン方法 | 37日 | 遅延お詫び + ログイン方法 |
| 匿名ユーザー | Runtime Error | 32日 | 削除可（一時的なエラー） |

