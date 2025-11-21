import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "パスワードは6文字以上である必要があります" }).max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Check if user came from password reset email
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(
          language === "ja" 
            ? "セッションが無効です。もう一度リセットリンクをリクエストしてください。" 
            : "Invalid session. Please request a new reset link."
        );
        navigate("/reset-password");
      }
    };
    checkSession();
  }, [navigate, language]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });
      
      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        language === "ja" 
          ? "パスワードを更新しました" 
          : "Password updated successfully"
      );
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(
          language === "ja" 
            ? "パスワードの更新に失敗しました" 
            : "Failed to update password"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-light mb-4">
              {language === "ja" ? "新しいパスワードを設定" : language === "pt" ? "Definir nova senha" : "Set New Password"}
            </h1>
            <p className="text-muted-foreground">
              {language === "ja" 
                ? "新しいパスワードを入力してください" 
                : language === "pt"
                ? "Digite sua nova senha"
                : "Enter your new password"}
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6 border border-border p-8">
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === "ja" ? "新しいパスワード（6文字以上）" : language === "pt" ? "Nova senha (6+ caracteres)" : "New Password (6+ characters)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === "ja" ? "パスワードを再入力" : language === "pt" ? "Confirmar senha" : "Confirm Password"}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (language === "ja" ? "更新中..." : language === "pt" ? "Atualizando..." : "Updating...") 
                : (language === "ja" ? "パスワードを更新" : language === "pt" ? "Atualizar senha" : "Update Password")}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UpdatePassword;
