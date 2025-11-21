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

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = emailSchema.parse({ email });
      
      // Check payment and send magic link
      const { data, error } = await supabase.functions.invoke(
        "check-payment-and-send-magic-link",
        {
          body: { email: validated.email },
        }
      );

      if (error) {
        console.error("Magic link error:", error);
        toast.error(
          language === "ja" 
            ? "エラーが発生しました" 
            : "An error occurred"
        );
        return;
      }

      if (data?.error) {
        if (data.error === "payment_not_found") {
          toast.error(
            language === "ja" 
              ? "決済が見つかりませんでした。先に決済を完了してください。" 
              : "Payment not found. Please complete payment first.",
            {
              description: language === "ja" 
                ? "「参加する」ページから決済を完了してください" 
                : "Please complete payment from the Join page",
            }
          );
        } else if (data.error === "payment_not_completed") {
          toast.error(
            language === "ja" 
              ? "決済がまだ完了していません" 
              : "Payment not completed yet",
            {
              description: language === "ja" 
                ? "決済を完了してから再度お試しください" 
                : "Please complete payment and try again",
            }
          );
        } else {
          toast.error(data.message || data.error);
        }
        return;
      }

      toast.success(
        language === "ja" 
          ? "ログインリンクをメールで送信しました" 
          : "Login link sent to your email",
        {
          description: language === "ja" 
            ? "メールを確認してログインしてください" 
            : "Check your email to log in",
        }
      );
      setEmail("");
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
              <form onSubmit={handleMagicLinkLogin} className="space-y-6 border border-border p-8">
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

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {language === "ja" 
                      ? "決済済みのメールアドレスを入力してください。ログインリンクをメールで送信します。" 
                      : "Enter your email address with completed payment. We'll send you a login link."}
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading 
                    ? (language === "ja" ? "処理中..." : "Loading...") 
                    : (language === "ja" ? "ログインリンクを送信" : "Send Login Link")}
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
