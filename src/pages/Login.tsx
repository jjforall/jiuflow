import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const from = (location.state as any)?.from?.pathname || "/map";
        navigate(from, { replace: true });
      }
    };
    checkAuth();
  }, [navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      loginSchema.parse({ email, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: language === "ja" ? "ログイン失敗" : language === "pt" ? "Falha no login" : "Login failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (data.session) {
        toast({
          title: language === "ja" ? "ログイン成功" : language === "pt" ? "Login bem-sucedido" : "Login successful",
          description: language === "ja" ? "ようこそ" : language === "pt" ? "Bem-vindo" : "Welcome",
        });

        // Redirect to the page they tried to access, or to map
        const from = (location.state as any)?.from?.pathname || "/map";
        navigate(from, { replace: true });
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast({
          title: language === "ja" ? "入力エラー" : language === "pt" ? "Erro de entrada" : "Input error",
          description: validationError.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-light mb-4">
              {language === "ja" ? "ログイン" : language === "pt" ? "Login" : "Login"}
            </h1>
            <p className="text-muted-foreground font-light">
              {language === "ja" 
                ? "動画コンテンツにアクセスするにはログインしてください" 
                : language === "pt" 
                ? "Faça login para acessar o conteúdo de vídeo" 
                : "Login to access video content"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="email"
                placeholder={language === "ja" ? "メールアドレス" : language === "pt" ? "Email" : "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder={language === "ja" ? "パスワード" : language === "pt" ? "Senha" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading 
                ? (language === "ja" ? "ログイン中..." : language === "pt" ? "Entrando..." : "Logging in...") 
                : (language === "ja" ? "ログイン" : language === "pt" ? "Entrar" : "Login")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
