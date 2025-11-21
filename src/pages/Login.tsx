import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const Login = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/map", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          <div className="animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-light mb-6">
              {language === "ja" ? "ログインが必要です" : language === "pt" ? "Login Necessário" : "Login Required"}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {language === "ja" 
                ? "アカウントをお持ちでない方は、まず料金プランから決済を完了してください。決済後、自動的にアカウントが作成されます。" 
                : language === "pt" 
                ? "Se você não tem uma conta, complete o pagamento na página de preços primeiro. Sua conta será criada automaticamente após o pagamento."
                : "If you don't have an account, please complete payment on the pricing page first. Your account will be created automatically after payment."}
            </p>
            <div className="space-y-4">
              <Button 
                onClick={() => navigate("/join")} 
                className="w-full"
                size="lg"
              >
                {language === "ja" ? "料金プランを見る" : language === "pt" ? "Ver Planos" : "View Pricing Plans"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {language === "ja" 
                  ? "決済完了後、メールでパスワード設定のリンクが届きます" 
                  : language === "pt" 
                  ? "Após o pagamento, você receberá um link por e-mail para definir sua senha"
                  : "After payment, you'll receive an email link to set your password"}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
