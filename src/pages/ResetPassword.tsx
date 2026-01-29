import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "有効なメールアドレスを入力してください" }).max(255),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = emailSchema.parse({ email });
      
      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        language === "ja" 
          ? "パスワードリセット用のリンクをメールで送信しました" 
          : "Password reset link sent to your email",
        {
          description: language === "ja" 
            ? "メールを確認してパスワードをリセットしてください" 
            : "Check your email to reset your password",
        }
      );
      setEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(
          language === "ja" 
            ? "エラーが発生しました" 
            : "An error occurred"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img 
            src="https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/uploads/1765287547884-unnamed.jpg" 
            alt="JiuFlow" 
            className="w-16 h-16 mx-auto mb-6 rounded"
          />
          <h1 className="text-2xl font-light mb-2">
            {language === "ja" ? "パスワードをリセット" : language === "pt" ? "Redefinir senha" : "Reset Password"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === "ja" 
              ? "登録されているメールアドレスを入力してください" 
              : language === "pt"
              ? "Digite seu endereço de e-mail cadastrado"
              : "Enter your registered email address"}
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6 border border-border p-8 rounded-lg bg-card">
          <div className="space-y-2">
            <Label htmlFor="email">
              {language === "ja" ? "メールアドレス" : language === "pt" ? "E-mail" : "Email"}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading 
              ? (language === "ja" ? "送信中..." : language === "pt" ? "Enviando..." : "Sending...") 
              : (language === "ja" ? "リセットリンクを送信" : language === "pt" ? "Enviar link de redefinição" : "Send Reset Link")}
          </Button>
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {language === "ja" ? "ログインに戻る" : language === "pt" ? "Voltar ao login" : "Back to Login"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
