import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Mail, AlertCircle, RefreshCw } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  email: z.string().trim().email("有効なメールアドレスを入力してください").max(255),
  subject: z.string().trim().min(1, "件名を入力してください").max(200),
  message: z.string().trim().min(1, "メッセージを入力してください").max(2000),
});

export const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    try {
      const validatedData = contactSchema.parse(formData);
      setIsSubmitting(true);

      // Save to database with timeout for Safari
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('接続がタイムアウトしました')), 15000)
      );

      const insertPromise = supabase
        .from('contact_messages')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          subject: validatedData.subject,
          message: validatedData.message,
        }]);

      const { error: dbError } = await Promise.race([insertPromise, timeoutPromise]) as { error: Error | null };

      if (dbError) throw dbError;

      // Try to send email notification (non-blocking)
      try {
        await supabase.functions.invoke("send-contact-email", {
          body: validatedData,
        });
      } catch (emailError) {
        console.error("Email sending error (non-critical):", emailError);
        // Continue - message is saved in database
      }

      toast.success("お問い合わせありがとうございます。できるだけ早くご返信いたします。");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Contact form error:", error);
        const errorMessage = error instanceof Error ? error.message : "送信に失敗しました";
        setSubmitError(errorMessage);
        toast.error("送信に失敗しました。下記の代替連絡先をご利用ください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="text"
            placeholder="お名前"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            maxLength={100}
            className="w-full"
          />
        </div>
        <div>
          <Input
            type="email"
            placeholder="メールアドレス"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            maxLength={255}
            className="w-full"
          />
        </div>
        <div>
          <Input
            type="text"
            placeholder="件名（例：新しい技の提案、お問い合わせ）"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            maxLength={200}
            className="w-full"
          />
        </div>
        <div>
          <Textarea
            placeholder="メッセージ"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
            maxLength={2000}
            rows={6}
            className="w-full resize-none"
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              送信中...
            </>
          ) : (
            "送信する"
          )}
        </Button>
      </form>

      {/* Error fallback with direct contact */}
      {submitError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-destructive font-medium">
                送信に問題が発生しました
              </p>
              <p className="text-sm text-muted-foreground">
                お手数ですが、以下のメールアドレスに直接ご連絡ください：
              </p>
              <a 
                href="mailto:ryozomurata@gmail.com" 
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="w-4 h-4" />
                ryozomurata@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Always show alternative contact */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          フォームが利用できない場合は{" "}
          <a 
            href="mailto:ryozomurata@gmail.com" 
            className="text-primary hover:underline"
          >
            ryozomurata@gmail.com
          </a>
          {" "}までご連絡ください
        </p>
      </div>
    </div>
  );
};
