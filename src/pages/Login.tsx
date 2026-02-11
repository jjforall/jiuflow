import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackConversion, trackEvent } from "@/hooks/useGoogleAnalytics";

const authSchema = z.object({
  email: z.string().trim().email({ message: "有効なメールアドレスを入力してください" }).max(255),
  password: z.string().min(6, { message: "パスワードは6文字以上である必要があります" }).max(100),
});

const Login = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/map");
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/map");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = authSchema.parse({ email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(
            language === "ja" 
              ? "メールアドレスまたはパスワードが正しくありません" 
              : "Invalid email or password"
          );
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        
        if (verifiedSession) {
          toast.success(language === "ja" ? "ログインしました" : "Logged in successfully");
          window.location.href = "/map";
        } else {
          toast.error(
            language === "ja" 
              ? "セッションの保存に失敗しました。もう一度お試しください。" 
              : "Failed to save session. Please try again."
          );
          setIsLoading(false);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(language === "ja" ? "ログインに失敗しました" : "Login failed");
      }
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = authSchema.parse({ email, password });
      const redirectUrl = `${window.location.origin}/map`;
      
      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: { emailRedirectTo: redirectUrl }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error(
            language === "ja" 
              ? "このメールアドレスは既に登録されています" 
              : "This email is already registered"
          );
        } else {
          toast.error(error.message);
        }
        return;
      }

      trackConversion('sign_up', { method: 'email' });
      toast.success(
        language === "ja" 
          ? "アカウントを作成しました。ログインしてください。" 
          : "Account created. Please log in."
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(language === "ja" ? "アカウント作成に失敗しました" : "Sign up failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      trackEvent('login_attempt', { method: 'google' });
      const redirectUrl = `${window.location.origin}/map`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch {
      toast.error(language === "ja" ? "Googleログインに失敗しました" : "Google login failed");
    }
  };

  const seoTitle = language === 'ja' ? 'ログイン | JiuFlow' : 'Login | JiuFlow';
  const seoDescription = language === 'ja' 
    ? 'JiuFlowにログインして、ブラジリアン柔術のテクニック動画にアクセスしましょう。'
    : 'Login to JiuFlow to access Brazilian Jiu-Jitsu technique videos.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl="https://jiuflow.art/login"
        noindex={true}
      />
      
      {/* Logo */}
      <Link to="/" className="mb-8">
        <h1 className="text-3xl font-light">
          jiuF<span className="text-red-500">l</span>ow
        </h1>
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-sm">
        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">
              {language === "ja" ? "ログイン" : "Login"}
            </TabsTrigger>
            <TabsTrigger value="signup">
              {language === "ja" ? "新規登録" : "Sign Up"}
            </TabsTrigger>
          </TabsList>
          
          {/* Login Tab */}
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">
                  {language === "ja" ? "メールアドレス" : "Email"}
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">
                  {language === "ja" ? "パスワード" : "Password"}
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (language === "ja" ? "処理中..." : "Loading...") 
                  : (language === "ja" ? "ログイン" : "Login")}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {language === "ja" ? "または" : "or"}
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {language === "ja" ? "Googleでログイン" : "Continue with Google"}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <Button
                variant="link"
                className="p-0 h-auto text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/reset-password")}
              >
                {language === "ja" ? "パスワードを忘れた方" : "Forgot password?"}
              </Button>
            </div>
          </TabsContent>
          
          {/* Sign Up Tab */}
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">
                  {language === "ja" ? "メールアドレス" : "Email"}
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">
                  {language === "ja" ? "パスワード（6文字以上）" : "Password (6+ characters)"}
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (language === "ja" ? "処理中..." : "Loading...") 
                  : (language === "ja" ? "無料で始める" : "Start Free")}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {language === "ja" ? "または" : "or"}
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {language === "ja" ? "Googleで登録" : "Sign up with Google"}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-4">
              {language === "ja" 
                ? "登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。" 
                : "By signing up, you agree to our Terms and Privacy Policy."}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;
