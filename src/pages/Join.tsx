import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [founderCount, setFounderCount] = useState(0);
  const [founderMaxCount, setFounderMaxCount] = useState(10);
  const [founderCurrentPrice, setFounderCurrentPrice] = useState(50000);
  const [founderNextPrice, setFounderNextPrice] = useState(80000);

  useEffect(() => {
    const endDateStr = import.meta.env.VITE_FOUNDER_PLAN_END_DATE || "2025-11-30T23:59:59+09:00";
    const targetDate = new Date(endDateStr).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch founder plan count
  useEffect(() => {
    const fetchFounderCount = async () => {
      const { data, error } = await supabase
        .from('founder_plan_count')
        .select('*')
        .single();

      if (data && !error) {
        setFounderCount(data.count);
        setFounderMaxCount(data.max_count);
        setFounderCurrentPrice(data.current_price);
        setFounderNextPrice(data.next_price);
      }
    };

    fetchFounderCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('founder-plan-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'founder_plan_count'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'count' in payload.new) {
            setFounderCount(payload.new.count as number);
            setFounderMaxCount(payload.new.max_count as number);
            setFounderCurrentPrice(payload.new.current_price as number);
            setFounderNextPrice(payload.new.next_price as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    timeLeft, 
    founderCount, 
    founderMaxCount, 
    founderCurrentPrice, 
    founderNextPrice 
  };
};

// Stripe price IDs
const PRICE_IDS = {
  founder: "price_1SR3ZmDqLakc8NxkNdqL5BtO", // ¥980/month
  monthly: "price_1SNQoeDqLakc8NxkEUVTTs3k", // ¥2,900/month
  annual: "price_1SNQoqDqLakc8NxkOaQIL8wX",  // ¥29,000/year
  muratabros: "price_1SY2D0DqLakc8NxkMKonyIi8", // ¥50,000 one-time
};

// Sample video ID
const SAMPLE_VIDEO_ID = "6a70670c-e9f8-4a8b-adce-8e703ac56bee";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;
  const { timeLeft, founderCount, founderMaxCount, founderCurrentPrice, founderNextPrice } = useCountdown();
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [viewCount, setViewCount] = useState(0);
  
  const { isLoading: authLoading, user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch sample video URL and view count
  useEffect(() => {
    const fetchSampleVideo = async () => {
      const { data } = await supabase
        .from("techniques")
        .select("video_url")
        .eq("id", SAMPLE_VIDEO_ID)
        .maybeSingle();
      
      if (data?.video_url) {
        setSampleVideoUrl(data.video_url);
      }
    };
    
    const loadViewCount = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("video_views")
        .select("view_count")
        .eq("user_id", user.id)
        .eq("video_id", SAMPLE_VIDEO_ID)
        .maybeSingle();
      
      setViewCount(data?.view_count || 0);
    };
    
    fetchSampleVideo();
    loadViewCount();
  }, [user]);

  // Check for payment status in URL
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(
        language === "ja" 
          ? "決済完了！メールを確認してください" 
          : "Payment complete! Check your email",
        {
          description: language === "ja"
            ? "ログイン用のマジックリンクをメールで送信しました"
            : "We sent you a magic link to log in",
        }
      );
    } else if (searchParams.get("canceled") === "true") {
      toast.error(t.join.payment?.canceled || "Payment canceled", {
        description: t.join.payment?.canceledDesc || "Your payment was canceled.",
      });
    }
  }, [searchParams, t.join.payment, language]);

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error(
        language === "ja" 
          ? "ログインが必要です" 
          : "Please log in first",
        {
          description: language === "ja"
            ? "決済を行うにはログインしてください"
            : "You need to log in to complete payment",
        }
      );
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const functionName = isSubscription ? "create-checkout" : "create-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          priceId, 
          referralCode: referralCode.trim() || undefined,
          email: session.user.email,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      toast.error(t.join.payment?.error || "Payment error", {
        description: t.join.payment?.errorDesc || "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-32 pb-20 px-6 animate-fade-in">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-2/3 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            <div className="border border-border p-8 space-y-4">
              <Skeleton className="h-8 w-1/3 mx-auto" />
              <Skeleton className="h-10 w-1/2 mx-auto" />
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-border p-8 space-y-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-12 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Banner for logged-in users without subscription */}
          {user && !subscribed && !subscriptionLoading && (
            <div className="mb-8 p-6 bg-primary/10 border border-primary rounded-lg animate-fade-up">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-primary">
                  {language === "ja" 
                    ? "ようこそ！" 
                    : language === "pt" 
                    ? "Bem-vindo!" 
                    : "Welcome!"}
                </h2>
                <p className="text-foreground">
                  {language === "ja" 
                    ? "アカウント登録が完了しました。下記のプランから選んで、今すぐコンテンツへのアクセスを開始しましょう！" 
                    : language === "pt" 
                    ? "Registro concluído! Escolha um plano abaixo para começar a acessar o conteúdo!" 
                    : "Registration complete! Choose a plan below to start accessing content!"}
                </p>
              </div>
            </div>
          )}

          <>
            <div className="text-center mb-16 animate-fade-up">
              <h1 className="text-5xl md:text-6xl font-light mb-6">{t.join.title}</h1>
              <p className="text-xl text-muted-foreground font-light">
                {t.join.subtitle}
              </p>
            </div>

            {/* Sample Video Section */}
            <div className="border border-border p-8 mb-16 animate-fade-up text-center">
              <h2 className="text-2xl font-light mb-4">{t.join.sampleVideo.title}</h2>
              <Button variant="outline" size="lg" onClick={() => setShowVideoModal(true)}>
                {t.join.sampleVideo.cta}
              </Button>
            </div>

            {/* Video Modal */}
            <Dialog open={showVideoModal} onOpenChange={async (open) => {
              setShowVideoModal(open);
              
              // Record view when modal is opened
              if (open && user) {
                const { data: existingView } = await supabase
                  .from("video_views")
                  .select("*")
                  .eq("user_id", user.id)
                  .eq("video_id", SAMPLE_VIDEO_ID)
                  .maybeSingle();

                if (existingView) {
                  const { data } = await supabase
                    .from("video_views")
                    .update({
                      view_count: existingView.view_count + 1,
                      last_viewed_at: new Date().toISOString(),
                    })
                    .eq("id", existingView.id)
                    .select("view_count")
                    .single();
                  
                  if (data) {
                    setViewCount(data.view_count);
                  }
                } else {
                  const { data } = await supabase
                    .from("video_views")
                    .insert({
                      user_id: user.id,
                      video_id: SAMPLE_VIDEO_ID,
                      view_count: 1,
                    })
                    .select("view_count")
                    .single();
                  
                  if (data) {
                    setViewCount(data.view_count);
                  }
                }
              }
            }}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>{t.join.sampleVideo.title}</DialogTitle>
                    {user && viewCount > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{language === "ja" ? "視聴" : "Watched"} {viewCount}{language === "ja" ? "回" : "x"}</span>
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
                <div className="aspect-video">
                  {sampleVideoUrl ? (
                    <video
                      src={sampleVideoUrl}
                      className="w-full h-full"
                      controls
                      autoPlay
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <p className="text-muted-foreground">Loading video...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Referral Code Section */}
            <div className="border border-border p-6 mb-8 animate-fade-up">
              <h3 className="text-lg font-light mb-3 text-center">
                {language === "ja" ? "紹介コードをお持ちの方" : "Have a referral code?"}
              </h3>
              <div className="flex gap-3 max-w-md mx-auto">
                <Input
                  type="text"
                  placeholder={language === "ja" ? "紹介コードを入力" : "Enter referral code"}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-3">
                {language === "ja" 
                  ? "紹介コードで加入すると初月無料 + 紹介者に毎月500ポイント付与されます" 
                  : "Join with a referral code: first month free + 500 points monthly for referrer"}
              </p>
            </div>

            {/* Pricing */}
            <div className="grid md:grid-cols-2 gap-8 mb-16 animate-fade-up">
              {/* Monthly Plan */}
              <div className="border border-foreground p-8 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-4 py-1 text-xs font-light">
                  {language === "ja" ? "人気" : language === "pt" ? "Popular" : "Most Popular"}
                </div>
                <h3 className="text-2xl font-light mb-4">
                  {language === "ja" ? "月額プラン" : language === "pt" ? "Plano Mensal" : "Monthly Plan"}
                </h3>
                <div className="mb-6">
                  <div className="text-4xl font-light mb-2">¥2,900</div>
                  <div className="text-sm text-muted-foreground font-light">
                    {language === "ja" ? "月額（3ヶ月無料・いつでもキャンセル可能）" : language === "pt" ? "Por mês (3 meses grátis・cancele a qualquer momento)" : "per month (3 months free・cancel anytime)"}
                  </div>
                </div>
                <ul className="space-y-3 mb-6 text-sm font-light">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "全技術動画へのアクセス" : language === "pt" ? "Acesso a todos os vídeos técnicos" : "Access to all technique videos"}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "新規コンテンツの追加" : language === "pt" ? "Novos conteúdos adicionados" : "New content additions"}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "柔軟な支払い" : language === "pt" ? "Pagamento flexível" : "Flexible payment"}</span>
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(PRICE_IDS.monthly, true)}
                  disabled={isLoading}
                >
                  {language === "ja" ? "月額で始める" : language === "pt" ? "Começar mensalmente" : "Start Monthly"}
                </Button>
              </div>

              {/* Annual Plan */}
              <div className="border border-border p-8">
                <h3 className="text-2xl font-light mb-4">
                  {language === "ja" ? "年額プラン" : language === "pt" ? "Plano Anual" : "Annual Plan"}
                </h3>
                <div className="mb-6">
                  <div className="text-4xl font-light mb-2">¥29,000</div>
                  <div className="text-sm text-muted-foreground font-light">
                    {language === "ja" ? "年額（3ヶ月無料・約2ヶ月分お得）" : language === "pt" ? "Por ano (3 meses grátis・economize cerca de 2 meses)" : "per year (3 months free・save ~2 months)"}
                  </div>
                </div>
                <ul className="space-y-3 mb-6 text-sm font-light">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "全技術動画へのアクセス" : language === "pt" ? "Acesso a todos os vídeos técnicos" : "Access to all technique videos"}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "新規コンテンツの追加" : language === "pt" ? "Novos conteúdos adicionados" : "New content additions"}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{language === "ja" ? "最大の節約" : language === "pt" ? "Melhor economia" : "Best value"}</span>
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(PRICE_IDS.annual, true)}
                  disabled={isLoading}
                >
                  {language === "ja" ? "年額で始める" : language === "pt" ? "Começar anualmente" : "Start Annually"}
                </Button>
              </div>
            </div>

            {/* Rewards System Explanation */}
            <div className="mt-16 p-8 border border-border rounded-lg bg-muted/30 animate-fade-up">
              <h3 className="text-2xl font-light mb-6 text-center">
                {language === "ja" ? "🎁 リワードシステム" : "🎁 Rewards System"}
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="text-4xl mb-3">🎨</div>
                  <h4 className="font-medium mb-2">
                    {language === "ja" ? "NFTバッジ" : "NFT Badges"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === "ja" 
                      ? "プラン購入時に限定NFTを自動付与。コレクションとして保有可能"
                      : "Exclusive NFTs automatically awarded with plan purchase"}
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl mb-3">🎯</div>
                  <h4 className="font-medium mb-2">
                    {language === "ja" ? "ポイント" : "Points"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === "ja" 
                      ? "毎月・毎年ポイント獲得。限定コンテンツやグッズ交換に使用可能"
                      : "Earn points monthly/yearly. Use for exclusive content and merchandise"}
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl mb-3">👥</div>
                  <h4 className="font-medium mb-2">
                    {language === "ja" ? "紹介制度" : "Referral Program"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === "ja" 
                      ? "専用紹介コードで友達を招待。1人紹介ごとにポイント獲得"
                      : "Invite friends with your unique code and earn points per referral"}
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-16 animate-fade-up">
              <h3 className="text-2xl font-light mb-8 text-center border-b border-border pb-4">
                {t.join.faq.title}
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-light mb-2">{t.join.faq.q1.q}</h4>
                  <p className="text-muted-foreground font-light text-sm">
                    {t.join.faq.q1.a}
                  </p>
                </div>
                <div>
                  <h4 className="font-light mb-2">{t.join.faq.q2.q}</h4>
                  <p className="text-muted-foreground font-light text-sm">
                    {t.join.faq.q2.a}
                  </p>
                </div>
                <div>
                  <h4 className="font-light mb-2">{t.join.faq.q3.q}</h4>
                  <p className="text-muted-foreground font-light text-sm">
                    {t.join.faq.q3.a}
                  </p>
                </div>
              </div>
            </div>
          </>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Join;
