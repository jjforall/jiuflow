import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Resend import
const { Resend } = await import("https://esm.sh/resend@2.0.0");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ReplyRequest {
  to: string;
  name: string;
  subject: string;
  content: string;
  originalMessageId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "認証が必要です" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "認証に失敗しました" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "管理者権限が必要です" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, name, subject, content, originalMessageId }: ReplyRequest = await req.json();

    // Validate required fields
    if (!to || !name || !subject || !content) {
      return new Response(
        JSON.stringify({ error: "必須フィールドが不足しています" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "メールアドレスの形式が正しくありません" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "JiuFlow Support <support@jiuflow.art>",
      to: [to],
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="white-space: pre-wrap; font-size: 15px; color: #333;">
${content.split('\n').map(line => `            ${line}`).join('\n')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <div style="color: #666; font-size: 13px;">
            <p style="margin: 0 0 5px 0;"><strong>JiuFlow サポート</strong></p>
            <p style="margin: 0;">
              <a href="https://jiuflow.art" style="color: #0066cc; text-decoration: none;">https://jiuflow.art</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Reply email sent successfully:", emailResponse);

    // Update contact_messages with reply info if originalMessageId provided
    if (originalMessageId) {
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      const { error: updateError } = await adminSupabase
        .from('contact_messages')
        .update({
          replied_at: new Date().toISOString(),
          replied_by: userId,
          reply_content: content,
          status: 'read',
        })
        .eq('id', originalMessageId);

      if (updateError) {
        console.error("Error updating contact_messages:", updateError);
        // Don't fail the request, email was already sent
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "返信メールを送信しました" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-reply-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
    );
  }
};

serve(handler);
