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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Sparkles, UserPlus, LogIn } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "有効なメールアドレスを入力してください" }).max(255),
});

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
      
      const { error } = await supabase.auth.signInWithPassword({
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
        return;
      }

      toast.success(
        language === "ja" 
          ? "ログインしました" 
          : "Logged in successfully"
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(
          language === "ja" 
            ? "ログインに失敗しました" 
            : "Login failed"
        );
      }
    } finally {
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
        options: {
          emailRedirectTo: redirectUrl
        }
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

      toast.success(
        language === "ja" 
          ? "アカウントを作成しました。ログインしてください。" 
          : "Account created. Please log in."
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(
          language === "ja" 
            ? "アカウント作成に失敗しました" 
            : "Sign up failed"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/map`,
        }
      });

      if (error) {
        toast.error(
          language === "ja" 
            ? "Googleログインに失敗しました" 
            : "Google login failed"
        );
      }
    } catch (error) {
      toast.error(
        language === "ja" 
          ? "Googleログインに失敗しました" 
          : "Google login failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-muted via-background to-muted/50">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 py-32">
        <div className="max-w-lg w-full animate-fade-up">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-light mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {language === "ja" ? "ようこそ" : language === "pt" ? "Bem-vindo" : "Welcome"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {language === "ja" 
                ? "柔術の世界へ" 
                : language === "pt" 
                ? "ao mundo do Jiu-Jitsu" 
                : "to the world of Jiu-Jitsu"}
            </p>
          </div>

          {/* Card with Tabs */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-none h-14">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-none h-full text-base"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {language === "ja" ? "ログイン" : "Login"}
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-none h-full text-base"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {language === "ja" ? "新規登録" : "Sign Up"}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="p-8 space-y-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
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
                      className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-base font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
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
                      className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm text-primary hover:text-secondary transition-colors"
                        onClick={() => navigate("/reset-password")}
                      >
                        {language === "ja" ? "パスワードを忘れた？" : "Forgot password?"}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? (language === "ja" ? "処理中..." : "Loading...") 
                      : (language === "ja" ? "ログイン" : "Login")}
                  </Button>

                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      {language === "ja" ? "または" : "or"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base border-2 hover:bg-accent/50 transition-all"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {language === "ja" ? "Googleでログイン" : "Login with Google"}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
                    {language === "ja" 
                      ? "アカウントをお持ちでない方は、" 
                      : "Don't have an account? "}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-secondary transition-colors"
                      onClick={() => navigate("/join")}
                    >
                      {language === "ja" ? "料金プランを確認" : "View pricing"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="p-8 space-y-6">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-center flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {language === "ja" 
                        ? "3ヶ月無料トライアル付き！" 
                        : "3 months free trial included!"}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-base font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
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
                      className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-base font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
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
                      className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base bg-gradient-to-r from-success to-accent hover:from-success/90 hover:to-accent/90 shadow-lg transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? (language === "ja" ? "処理中..." : "Loading...") 
                      : (language === "ja" ? "無料で始める" : "Start Free Trial")}
                  </Button>

                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      {language === "ja" ? "または" : "or"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base border-2 hover:bg-accent/50 transition-all"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {language === "ja" ? "Googleで始める" : "Start with Google"}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
                    {language === "ja" 
                      ? "※ 有料プランは" 
                      : "For paid plans, visit "}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-secondary transition-colors"
                      onClick={() => navigate("/join")}
                    >
                      {language === "ja" ? "料金プランページ" : "pricing page"}
                    </Button>
                    {language === "ja" ? "から" : ""}
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
