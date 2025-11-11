import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CreditCard, Calendar, Mail } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionStatus {
  subscribed: boolean;
  plan_type?: string;
  subscription_end?: string;
  price_id?: string;
}

const MyPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);  

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
    await checkSubscription();
  }, [navigate]);

  const checkSubscription = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === "ja" ? "ログインが必要です" : "Login required");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      setSubscription(data);
    } catch (error: unknown) {
      console.error("Subscription check error:", error);
      toast.error(language === "ja" ? "サブスクリプション情報の取得に失敗しました" : "Failed to fetch subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanName = (planType?: string) => {
    if (!planType) return language === "ja" ? "未登録" : "No Plan";
    
    const plans: Record<string, Record<string, string>> = {
      founder: {
        ja: "ファウンダープラン",
        en: "Founder Plan",
        pt: "Plano Fundador"
      },
      monthly: {
        ja: "月額プラン",
        en: "Monthly Plan",
        pt: "Plano Mensal"
      },
      annual: {
        ja: "年額プラン",
        en: "Annual Plan",
        pt: "Plano Anual"
      }
    };

    return plans[planType]?.[language] || planType;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : language === "pt" ? "pt-BR" : "en-US");
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">
              {language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page"}
            </h1>
            <p className="text-xl text-muted-foreground font-light">
              {language === "ja" ? "アカウント情報とプラン" : language === "pt" ? "Informações da conta e plano" : "Account information and plan"}
            </p>
          </div>

          {isLoading ? (
            <div className="animate-fade-in space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-4 border border-border rounded-lg p-6">
                    <div className="h-6 w-1/3 bg-muted/50 animate-pulse rounded" />
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-muted/50 animate-pulse rounded" />
                      <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6 animate-fade-up">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light">
                  <User className="h-5 w-5" />
                  {language === "ja" ? "ユーザー情報" : language === "pt" ? "Informações do usuário" : "User Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "ja" ? "メールアドレス" : "Email"}
                    </p>
                    <p className="font-light">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "ja" ? "登録日" : language === "pt" ? "Data de registro" : "Registration Date"}
                    </p>
                    <p className="font-light">{formatDate(user?.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light">
                  <CreditCard className="h-5 w-5" />
                  {language === "ja" ? "プラン情報" : language === "pt" ? "Informações do plano" : "Plan Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === "ja" ? "現在のプラン" : language === "pt" ? "Plano atual" : "Current Plan"}
                  </p>
                  <p className="font-light text-lg">
                    {subscription?.subscribed ? getPlanName(subscription.plan_type) : (language === "ja" ? "未登録" : "No Plan")}
                  </p>
                </div>
                {subscription?.subscribed && subscription.subscription_end && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === "ja" ? "次回更新日" : language === "pt" ? "Próxima renovação" : "Next Renewal"}
                    </p>
                    <p className="font-light">{formatDate(subscription.subscription_end)}</p>
                  </div>
                )}
                <div className="pt-4">
                  {subscription?.subscribed ? (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ {language === "ja" ? "有効なプラン" : language === "pt" ? "Plano ativo" : "Active Plan"}
                    </p>
                  ) : (
                    <Button
                      onClick={() => navigate("/join")}
                      className="w-full"
                    >
                      {language === "ja" ? "プランに登録する" : language === "pt" ? "Assinar plano" : "Subscribe to Plan"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refresh Button */}
          <div className="mt-8 text-center animate-fade-up">
            <Button
              variant="outline"
              onClick={checkSubscription}
              disabled={isLoading}
            >
              {isLoading 
                ? (language === "ja" ? "更新中..." : "Refreshing...") 
                : (language === "ja" ? "サブスクリプション情報を更新" : language === "pt" ? "Atualizar informações" : "Refresh Subscription Info")}
            </Button>
          </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyPage;
