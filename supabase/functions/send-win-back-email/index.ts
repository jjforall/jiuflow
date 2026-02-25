import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (message: string, data?: unknown) => {
  console.log(`[send-win-back-email] ${message}`, data ? JSON.stringify(data) : "");
};

interface GrowthStats {
  watchHours: number;
  practiceCount: number;
  techniquesLearned: number;
  consecutiveDays: number;
}

async function getGrowthStats(supabase: any, userId: string, trialStart: string): Promise<GrowthStats> {
  // 視聴時間
  const { data: watchHistory } = await supabase
    .from("watch_history")
    .select("watch_duration")
    .eq("user_id", userId);

  const watchHours = Math.round(
    (watchHistory?.reduce((sum: number, record: any) => sum + (record.watch_duration || 0), 0) || 0) / 3600
  );

  // 練習記録
  const { count: practiceCount } = await supabase
    .from("practice_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // 習得技術
  const { data: practices } = await supabase
    .from("practice_records")
    .select("techniques")
    .eq("user_id", userId);

  const techniquesSet = new Set<string>();
  practices?.forEach((p: any) => {
    (p.techniques || []).forEach((t: string) => techniquesSet.add(t));
  });

  // 継続日数（トライアル期間）
  const trialStartDate = new Date(trialStart).getTime();
  const consecutiveDays = Math.floor((Date.now() - trialStartDate) / (1000 * 60 * 60 * 24));

  return {
    watchHours,
    practiceCount: practiceCount || 0,
    techniquesLearned: techniquesSet.size,
    consecutiveDays: Math.min(14, consecutiveDays), // トライアル期間上限14日
  };
}

function generateWinBackEmail(
  displayName: string,
  email: string,
  stats: GrowthStats,
  offerExpiryDate: string
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>特別な再開オファー</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 28px; font-weight: bold; color: #2563eb;">jiuflow.art</div>
    </div>

    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 40px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <div style="font-size: 24px; margin-bottom: 15px;">👋</div>
      <h2 style="margin: 0; font-size: 28px;">${displayName}さん、お久しぶりです</h2>
      <p style="font-size: 16px; margin-top: 15px; opacity: 0.9;">
        あなたをまた迎えられることを<br>チーム一同、心待ちにしています
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.8;">
      jiuflow.art で${stats.consecutiveDays}日間継続してきた成長の記録。<br>
      せっかく積み上げてきたデータ、このままにしておくのはもったいないと思いませんか？
    </p>

    <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
      <h3 style="margin-top: 0; color: #991b1b; font-size: 24px;">
        🎁 あなただけの特別オファー
      </h3>
      <div style="width: 150px; height: 150px; background-color: #ef4444; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 20px auto; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.4);">
        <div style="font-size: 48px; font-weight: bold; color: white;">50%</div>
        <div style="font-size: 18px; color: white; font-weight: bold;">OFF</div>
      </div>
      <p style="font-size: 20px; color: #991b1b; font-weight: bold; margin: 20px 0;">
        30日間限定：月額プラン 半額
      </p>
      <div style="margin: 20px 0;">
        <span style="text-decoration: line-through; color: #64748b; font-size: 24px;">¥2,900/月</span>
        <span style="color: #dc2626; font-size: 36px; font-weight: bold; margin-left: 15px;">¥1,450/月</span>
      </div>
      <p style="color: #475569; font-size: 14px; margin-top: 20px;">
        ※ 初月のみの特別価格。2ヶ月目から通常価格¥2,900/月
      </p>
    </div>

    <a href="https://jiuflow.art/join?winback=true&discount=50&email=${encodeURIComponent(email)}"
       style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 20px; width: 100%; box-sizing: border-box; text-align: center; margin: 20px 0;">
      今すぐ50% OFFで再開する
    </a>

    <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h4 style="margin-top: 0; color: #1e293b;">あなたが残した記録</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
        <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
          <div style="color: #2563eb; font-size: 32px; font-weight: bold;">${stats.watchHours}</div>
          <div style="color: #64748b; font-size: 14px;">視聴時間</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
          <div style="color: #2563eb; font-size: 32px; font-weight: bold;">${stats.practiceCount}</div>
          <div style="color: #64748b; font-size: 14px;">練習記録</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
          <div style="color: #2563eb; font-size: 32px; font-weight: bold;">${stats.techniquesLearned}</div>
          <div style="color: #64748b; font-size: 14px;">習得技術</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
          <div style="color: #2563eb; font-size: 32px; font-weight: bold;">${stats.consecutiveDays}</div>
          <div style="color: #64748b; font-size: 14px;">継続日数</div>
        </div>
      </div>
      <p style="text-align: center; color: #475569; margin-top: 20px; font-style: italic;">
        これらのデータはすべて保存されています。<br>
        いつでも続きから始められます。
      </p>
    </div>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0;">
      <h4 style="margin-top: 0; color: #065f46;">✨ 最近追加された新機能</h4>
      <ul style="color: #475569; line-height: 1.8;">
        <li><strong>AI技術分析</strong>: 動画をアップロードすると、AIが技術の改善点を提案</li>
        <li><strong>パーソナライズ学習</strong>: あなたのレベルに合わせた技術を自動推奨</li>
        <li><strong>オンライン質問会</strong>: 月1回、プロ選手に直接質問できるセッション</li>
      </ul>
    </div>

    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h4 style="margin-top: 0; color: #1e293b;">💬 最近のユーザーの声</h4>
      <div style="margin: 15px 0; padding: 15px; background-color: white; border-radius: 8px; border-left: 3px solid #2563eb;">
        <p style="font-style: italic; color: #475569; margin: 0;">
          「一度やめましたが、Win-Backオファーで戻ってきました。今では毎日の日課です！」
        </p>
        <p style="text-align: right; color: #64748b; font-size: 14px; margin: 10px 0 0;">- 紫帯 Kさん（大阪）</p>
      </div>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
        このオファーは<strong style="color: #dc2626;">${offerExpiryDate}まで</strong>有効です
      </p>
      <p style="color: #475569; font-size: 14px;">
        期限を過ぎると、通常価格でのご案内となります
      </p>
    </div>

    <div style="border-top: 2px solid #e2e8f0; margin-top: 40px; padding-top: 20px; text-align: center;">
      <p style="color: #64748b; font-size: 14px;">
        ご質問がございましたら、お気軽にお問い合わせください。<br>
        <a href="mailto:support@jiuflow.art" style="color: #2563eb; text-decoration: none;">support@jiuflow.art</a>
      </p>
      <p style="margin-top: 20px; color: #94a3b8; font-size: 12px;">
        © 2026 jiuflow.art All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  try {
    log("Function invoked");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // トライアル失効5日後（Day 35）のユーザーを取得
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    fiveDaysAgo.setHours(0, 0, 0, 0);

    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    sixDaysAgo.setHours(23, 59, 59, 999);

    // トライアル失効（canceled/incomplete）のユーザーを取得
    const { data: expiredUsers, error: fetchError } = await supabase
      .from("subscriptions")
      .select(`
        user_id,
        trial_end,
        trial_start,
        stripe_subscription_id,
        status
      `)
      .in("status", ["canceled", "incomplete", "past_due"])
      .not("trial_end", "is", null)
      .lte("trial_end", fiveDaysAgo.toISOString())
      .gte("trial_end", sixDaysAgo.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch expired users: ${fetchError.message}`);
    }

    log("Expired users found", { count: expiredUsers?.length || 0 });

    if (!expiredUsers || expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No users to notify" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscription of expiredUsers) {
      try {
        // 既にWin-Backメール送信済みかチェック
        const { data: existingLog } = await supabase
          .from("trial_email_logs")
          .select("id")
          .eq("user_id", subscription.user_id)
          .eq("email_type", "win_back")
          .single();

        if (existingLog) {
          log("Win-back email already sent", { userId: subscription.user_id });
          continue;
        }

        // ユーザー情報を取得
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          subscription.user_id
        );

        if (userError || !userData?.user?.email) {
          log("User not found or no email", { userId: subscription.user_id });
          continue;
        }

        const user = userData.user;

        // プロフィール取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", subscription.user_id)
          .single();

        const displayName = profile?.display_name || user.email?.split("@")[0] || "ユーザー";

        // 成長データ取得
        const stats = await getGrowthStats(supabase, subscription.user_id, subscription.trial_start);

        // オファー有効期限（今から14日後）
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);
        const offerExpiryDate = expiryDate.toLocaleDateString("ja-JP");

        // メール送信
        const emailHTML = generateWinBackEmail(displayName, user.email, stats, offerExpiryDate);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "jiuflow.art <noreply@jiuflow.art>",
            to: [user.email],
            subject: "【jiuflow.art】戻ってきてください - 特別な再開オファー",
            html: emailHTML,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        // 送信ログ記録
        await supabase.from("trial_email_logs").insert({
          user_id: subscription.user_id,
          email_type: "win_back",
          subscription_id: subscription.stripe_subscription_id,
        });

        log("Win-back email sent successfully", { userId: subscription.user_id });
        sentCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log("Error sending win-back email", { userId: subscription.user_id, error: errorMessage });
        errors.push(`User ${subscription.user_id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("Function error", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
