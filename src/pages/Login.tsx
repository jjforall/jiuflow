import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { z } from "zod";
import { loginFormSchema, signupFormSchema, getPasswordStrength } from "@/lib/validators";
import { Progress } from "@/components/ui/progress";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] });
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      if (isSignUp) {
        signupFormSchema.parse({ email, password, confirmPassword });
      } else {
        loginFormSchema.parse({ email, password });
      }

      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          toast.error(language === "ja" ? "登録失敗" : language === "pt" ? "Falha no registro" : "Sign up failed", {
            description: error.message,
          });
          setIsLoading(false);
          return;
        }

        if (data.user && !data.session) {
          // Email confirmation required
          toast.success(language === "ja" ? "確認メールを送信しました" : language === "pt" ? "E-mail de confirmação enviado" : "Confirmation email sent", {
            description: language === "ja" 
              ? "メールアドレスに送信された確認リンクをクリックしてください" 
              : language === "pt" 
              ? "Clique no link de confirmação enviado para seu e-mail" 
              : "Please click the confirmation link sent to your email",
          });
          setIsLoading(false);
          return;
        }

        if (data.user) {
          toast.success(language === "ja" ? "登録成功" : language === "pt" ? "Registro bem-sucedido" : "Sign up successful", {
            description: language === "ja" ? "アカウントが作成されました" : language === "pt" ? "Conta criada" : "Account created",
          });

          // Redirect to map after successful signup
          navigate("/map", { replace: true });
        }
      } else {
        // Login flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(language === "ja" ? "ログイン失敗" : language === "pt" ? "Falha no login" : "Login failed", {
            description: error.message,
          });
          setIsLoading(false);
          return;
        }

        if (data.session) {
          toast.success(language === "ja" ? "ログイン成功" : language === "pt" ? "Login bem-sucedido" : "Login successful", {
            description: language === "ja" ? "ようこそ" : language === "pt" ? "Bem-vindo" : "Welcome",
          });

          // Redirect to the page they tried to access, or to map
          const from = (location.state as any)?.from?.pathname || "/map";
          navigate(from, { replace: true });
        }
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast.error(language === "ja" ? "入力エラー" : language === "pt" ? "Erro de entrada" : "Input error", {
          description: validationError.errors[0].message,
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
              {isSignUp 
                ? (language === "ja" ? "新規登録" : language === "pt" ? "Registrar" : "Sign Up")
                : (language === "ja" ? "ログイン" : language === "pt" ? "Login" : "Login")}
            </h1>
            <p className="text-muted-foreground font-light">
              {isSignUp
                ? (language === "ja" 
                  ? "アカウントを作成して始めましょう" 
                  : language === "pt" 
                  ? "Crie sua conta para começar" 
                  : "Create your account to get started")
                : (language === "ja" 
                  ? "動画コンテンツにアクセスするにはログインしてください" 
                  : language === "pt" 
                  ? "Faça login para acessar o conteúdo de vídeo" 
                  : "Login to access video content")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                ? (isSignUp
                  ? (language === "ja" ? "登録中..." : language === "pt" ? "Registrando..." : "Signing up...")
                  : (language === "ja" ? "ログイン中..." : language === "pt" ? "Entrando..." : "Logging in..."))
                : (isSignUp
                  ? (language === "ja" ? "登録" : language === "pt" ? "Registrar" : "Sign Up")
                  : (language === "ja" ? "ログイン" : language === "pt" ? "Entrar" : "Login"))}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
                setConfirmPassword("");
                setPasswordStrength({ score: 0, feedback: [] });
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              {isSignUp
                ? (language === "ja" 
                  ? "既にアカウントをお持ちですか？ログイン" 
                  : language === "pt" 
                  ? "Já tem uma conta? Entrar" 
                  : "Already have an account? Login")
                : (language === "ja" 
                  ? "アカウントをお持ちでないですか？新規登録" 
                  : language === "pt" 
                  ? "Não tem uma conta? Registrar" 
                  : "Don't have an account? Sign up")}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
