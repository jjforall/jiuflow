import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface GrowthStats {
  watchHours: number;
  practiceCount: number;
  techniquesLearned: number;
  consecutiveDays: number;
}

const log = (message: string, data?: unknown) => {
  console.log(`[send-trial-reminder] ${message}`, data ? JSON.stringify(data) : "");
};

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

  // 継続日数
  const consecutiveDays = Math.floor(
    (Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    watchHours,
    practiceCount: practiceCount || 0,
    techniquesLearned: techniquesSet.size,
    consecutiveDays,
  };
}

function generateEmailHTML(
  displayName: string,
  email: string,
  daysLeft: number,
  stats: GrowthStats,
  trialEndDate: string
): string {
  const isUrgent = daysLeft === 1;
  const subject = isUrgent
    ? "【最終日】明日、jiuflow.art の無料トライアルが終了します"
    : "【jiuflow.art】あと2日で無料トライアル終了 - あなたの成長をご確認ください";

  const urgentBanner = isUrgent
    ? `
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
      <div style="font-size: 20px; margin-bottom: 10px;">⚠️ 最終日 ⚠️</div>
      <div>無料トライアル終了まで</div>
      <div style="font-size: 72px; font-weight: bold; margin: 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">24時間</div>
      <div style="font-size: 18px;">明日 ${trialEndDate} 23:59まで</div>
    </div>
    `
    : `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <div>無料トライアル終了まで</div>
      <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">${daysLeft}日</div>
      <div>${trialEndDate} 23:59まで</div>
    </div>
    `;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px;">jiuflow.art</div>
      <p style="color: #64748b;">柔術の成長を記録・共有するプラットフォーム</p>
    </div>

    ${urgentBanner}

    <h2 style="color: #1e293b; margin-top: 30px;">${displayName}さん、${isUrgent ? '最後のお知らせです' : 'こんにちは'}</h2>

    <p>jiuflow.art をご利用いただき、ありがとうございます。</p>

    <p>あなたのトライアル期間は<strong>${daysLeft}日後に終了</strong>します。これまでの成長を振り返ってみましょう。</p>

    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e293b;">あなたの成長記録</h3>
      <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-weight: 500;">視聴時間</span>
        <span style="font-size: 20px; font-weight: bold; color: #2563eb;">${stats.watchHours}時間</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-weight: 500;">練習記録</span>
        <span style="font-size: 20px; font-weight: bold; color: #2563eb;">${stats.practiceCount}回</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b; font-weight: 500;">習得技術</span>
        <span style="font-size: 20px; font-weight: bold; color: #2563eb;">${stats.techniquesLearned}個</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0;">
        <span style="color: #64748b; font-weight: 500;">継続日数</span>
        <span style="font-size: 20px; font-weight: bold; color: #2563eb;">${stats.consecutiveDays}日</span>
      </div>
    </div>

    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 8px; margin: 30px 0; border: 2px solid #f59e0b;">
      <h3 style="margin-top: 0; color: #92400e; text-align: center; font-size: 24px;">
        🎁 ${isUrgent ? '最後のチャンス：' : ''}年間プランなら月額より17%お得
      </h3>
      <div style="text-align: center; margin: 20px 0;">
        <div style="font-size: 18px; color: #92400e; margin-bottom: 10px;">月額プラン</div>
        <div style="text-decoration: line-through; color: #64748b; font-size: 24px;">¥2,900/月 (=¥34,800/年)</div>
        <div style="font-size: 14px; color: #92400e; margin: 20px 0;">↓</div>
        <div style="font-size: 18px; color: #92400e; margin-bottom: 10px;">年間プラン</div>
        <div style="color: #dc2626; font-size: 48px; font-weight: bold;">¥29,000/年</div>
        <div style="background-color: #dc2626; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-top: 15px; font-weight: bold; font-size: 18px;">
          年間 ¥5,800 お得！
        </div>
      </div>
      <p style="text-align: center; color: #92400e; font-weight: bold; font-size: 16px; margin-top: 20px;">
        1日あたり わずか ¥79
      </p>
    </div>

    <a href="https://jiuflow.art/join?upgrade=annual&email=${encodeURIComponent(email)}${isUrgent ? '&urgent=true' : ''}"
       style="display: inline-block; background: linear-gradient(135deg, ${isUrgent ? '#10b981 0%, #059669 100%' : '#667eea 0%, #764ba2 100%'}); color: white; padding: 20px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 20px; width: 100%; box-sizing: border-box; text-align: center; margin: 20px 0; box-shadow: 0 4px 6px rgba(${isUrgent ? '16, 185, 129' : '102, 126, 234'}, 0.3);">
      ${isUrgent ? '今すぐ' : ''}年間プランで継続する${isUrgent ? '' : '（¥5,800お得）'}
    </a>

    <div style="text-align: center; margin: 20px 0;">
      <a href="https://jiuflow.art/join?upgrade=monthly&email=${encodeURIComponent(email)}"
         style="color: #2563eb; text-decoration: none; font-weight: 500; font-size: 16px;">
        または月額プラン（¥2,900/月）で始める →
      </a>
    </div>

    <div style="border-top: 2px solid #e2e8f0; margin-top: 40px; padding-top: 20px; text-align: center;">
      <p style="color: #64748b; font-size: 14px;">
        ご不明な点がございましたら、お気軽にお問い合わせください。<br>
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

    // トライアル終了2日前（Day 28）と1日前（Day 29）のユーザーを取得
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // トライアル中のユーザーを取得（終了まで2日以内）
    const { data: trialingUsers, error: fetchError } = await supabase
      .from("subscriptions")
      .select(`
        user_id,
        trial_end,
        trial_start,
        stripe_subscription_id
      `)
      .eq("status", "trialing")
      .not("trial_end", "is", null)
      .lte("trial_end", twoDaysFromNow.toISOString())
      .gte("trial_end", tomorrow.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch trialing users: ${fetchError.message}`);
    }

    log("Trialing users found", { count: trialingUsers?.length || 0 });

    if (!trialingUsers || trialingUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No users to notify" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscription of trialingUsers) {
      try {
        // ユーザー情報を取得
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          subscription.user_id
        );

        if (userError || !userData?.user?.email) {
          log("User not found or no email", { userId: subscription.user_id });
          continue;
        }

        const user = userData.user;
        const trialEndDate = new Date(subscription.trial_end);
        const daysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // 2日前（Day 28）と1日前（Day 29）のみ送信
        if (daysLeft !== 2 && daysLeft !== 1) {
          continue;
        }

        const emailType = daysLeft === 2 ? "2_days_before" : "1_day_before";

        // 既に送信済みかチェック
        const { data: existingLog } = await supabase
          .from("trial_email_logs")
          .select("id")
          .eq("user_id", subscription.user_id)
          .eq("email_type", emailType)
          .single();

        if (existingLog) {
          log("Email already sent", { userId: subscription.user_id, emailType });
          continue;
        }

        // プロフィール取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", subscription.user_id)
          .single();

        const displayName = profile?.display_name || user.email?.split("@")[0] || "ユーザー";

        // 成長データ取得
        const stats = await getGrowthStats(supabase, subscription.user_id, subscription.trial_start);

        // メール送信
        const emailHTML = generateEmailHTML(
          displayName,
          user.email,
          daysLeft,
          stats,
          trialEndDate.toLocaleDateString("ja-JP")
        );

        const subject =
          daysLeft === 1
            ? "【最終日】明日、jiuflow.art の無料トライアルが終了します"
            : "【jiuflow.art】あと2日で無料トライアル終了 - あなたの成長をご確認ください";

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "jiuflow.art <noreply@jiuflow.art>",
            to: [user.email],
            subject,
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
          email_type: emailType,
          subscription_id: subscription.stripe_subscription_id,
        });

        log("Email sent successfully", { userId: subscription.user_id, emailType });
        sentCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log("Error sending email", { userId: subscription.user_id, error: errorMessage });
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
