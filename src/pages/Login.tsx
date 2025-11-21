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

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-light mb-4">
              {language === "ja" ? "ログイン" : language === "pt" ? "Entrar" : "Login"}
            </h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                {language === "ja" ? "ログイン" : "Login"}
              </TabsTrigger>
              <TabsTrigger value="signup">
                {language === "ja" ? "新規登録" : "Sign Up"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6 border border-border p-8">
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
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">
                      {language === "ja" ? "パスワード" : "Password"}
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => navigate("/reset-password")}
                    >
                      {language === "ja" ? "パスワードを忘れた？" : "Forgot password?"}
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading 
                    ? (language === "ja" ? "処理中..." : "Loading...") 
                    : (language === "ja" ? "ログイン" : "Login")}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "アカウントをお持ちでない方は、" 
                    : "Don't have an account? "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate("/join")}
                  >
                    {language === "ja" ? "料金プランを確認" : "View pricing"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-6 border border-border p-8">
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
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading 
                    ? (language === "ja" ? "処理中..." : "Loading...") 
                    : (language === "ja" ? "アカウント作成" : "Create Account")}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "※ 無料トライアル付きプランは" 
                    : "For trial plans, "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
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
      </main>
      <Footer />
    </div>
  );
};

export default Login;
