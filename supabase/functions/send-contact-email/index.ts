import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    console.log("Sending contact email from:", name, email);

    // Send notification to site owner
    const ownerEmail = await resend.emails.send({
      from: "BJJ Contact Form <onboarding@resend.dev>",
      to: ["ryozomurata@gmail.com"], // Site owner email
      subject: `【お問い合わせ】${subject}`,
      html: `
        <h2>新しいお問い合わせが届きました</h2>
        <p><strong>お名前:</strong> ${name}</p>
        <p><strong>メールアドレス:</strong> ${email}</p>
        <p><strong>件名:</strong> ${subject}</p>
        <p><strong>メッセージ:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
      reply_to: email,
    });

    // Send confirmation to user
    const userEmail = await resend.emails.send({
      from: "Ryozo Murata BJJ <onboarding@resend.dev>",
      to: [email],
      subject: "お問い合わせを受け付けました",
      html: `
        <h2>${name} 様</h2>
        <p>お問い合わせいただきありがとうございます。</p>
        <p>以下の内容でお問い合わせを受け付けました。</p>
        <hr />
        <p><strong>件名:</strong> ${subject}</p>
        <p><strong>メッセージ:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr />
        <p>できるだけ早くご返信させていただきます。</p>
        <p>今しばらくお待ちください。</p>
        <br />
        <p>Ryozo Murata</p>
      `,
    });

    console.log("Emails sent successfully:", { ownerEmail, userEmail });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
