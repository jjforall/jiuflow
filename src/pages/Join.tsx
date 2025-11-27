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
import confetti from "canvas-confetti";
import { Check } from "lucide-react";

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
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const { timeLeft, founderCount, founderMaxCount, founderCurrentPrice, founderNextPrice } = useCountdown();
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponVerified, setCouponVerified] = useState(false);
  const [showCouponSuccess, setShowCouponSuccess] = useState(false);
  
  const { isLoading: authLoading, user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch sample video URL
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
    fetchSampleVideo();
  }, []);

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

  const handleVerifyCoupon = () => {
    const validCoupons = ["MURATABJJ", "MURATABROS"];
    const trimmedCode = couponCode.trim().toUpperCase();
    
    if (validCoupons.includes(trimmedCode)) {
      setCouponVerified(true);
      setShowCouponSuccess(true);
      
      // Confetti effect
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          setTimeout(() => setShowCouponSuccess(false), 500);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      const message = trimmedCode === "MURATABROS" 
        ? (language === "ja" ? "創始者アクセスProプランが適用されました！🎉" : "Founder Access Pro Plan applied! 🎉")
        : (language === "ja" ? "クーポンコードが適用されました！🎉" : "Coupon code applied! 🎉");

      toast.success(message, {
        description: language === "ja"
          ? "特別価格でご利用いただけます"
          : "You can now access special pricing",
      });
    } else {
      toast.error(
        language === "ja" 
          ? "無効なクーポンコードです" 
          : "Invalid coupon code"
      );
      setCouponVerified(false);
    }
  };

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    // Check if user is logged in
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
          couponCode: couponCode.trim() || undefined,
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

          {(
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
              <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{t.join.sampleVideo.title}</DialogTitle>
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


              {/* Coupon Code Section */}
              <div className="border border-border p-6 mb-8 animate-fade-up relative overflow-hidden">
                {showCouponSuccess && (
                  <div className="absolute inset-0 bg-gradient-to-r from-success/20 via-accent/20 to-success/20 animate-pulse pointer-events-none" />
                )}
                <h3 className="text-lg font-light mb-3 text-center">
                  {language === "ja" ? "クーポンコードをお持ちの方" : "Have a coupon code?"}
                </h3>
                <div className="flex gap-3 max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder={language === "ja" ? "クーポンコードを入力" : "Enter coupon code"}
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponVerified(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && couponCode.trim()) {
                        handleVerifyCoupon();
                      }
                    }}
                    className="flex-1"
                    disabled={couponVerified}
                  />
                  {couponVerified ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-success hover:bg-success/90"
                      disabled
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {language === "ja" ? "適用済み" : "Applied"}
                    </Button>
                  ) : couponCode ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleVerifyCoupon}
                      >
                        {language === "ja" ? "適用" : "Apply"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCouponCode("");
                          setCouponVerified(false);
                        }}
                      >
                        {language === "ja" ? "クリア" : "Clear"}
                      </Button>
                    </>
                  ) : null}
                </div>
                {couponVerified && (
                  <div className="mt-3 p-3 bg-success/10 border border-success/30 rounded-lg animate-fade-in">
                    <p className="text-sm text-center font-medium text-success flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {language === "ja" 
                        ? "クーポンが適用されました！下記の特別プランをご利用いただけます" 
                        : "Coupon applied! You can now access the special plan below"}
                    </p>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className={`grid ${couponVerified && couponCode === "MURATABROS" ? "md:grid-cols-2" : couponVerified ? "md:grid-cols-1" : "md:grid-cols-2"} gap-8 mb-16 animate-fade-up ${couponVerified && couponCode === "MURATABJJ" ? "max-w-lg mx-auto" : ""}`}>
                {/* MURATABROS Pro - Only show if coupon is MURATABROS */}
                {couponVerified && couponCode === "MURATABROS" && (
                  <div className="border-2 border-primary p-8 shadow-2xl relative bg-gradient-to-br from-primary/5 to-secondary/5">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-6 py-1 text-sm font-medium rounded-full shadow-lg">
                      {language === "ja" ? "🏆 創始者アクセスPro" : "🏆 Founder Access Pro"}
                    </div>
                    <h3 className="text-3xl font-light mb-4 mt-2 text-center">
                      {language === "ja" ? "創始者アクセスPro" : "Founder Access Pro"}
                    </h3>
                    <div className="mb-6 text-center">
                      <div className="text-5xl font-light mb-2">¥{founderCurrentPrice.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground font-light">
                        {language === "ja" ? "年額（審査制・毎年更新）" : "Annual (Application required・Yearly renewal)"}
                      </div>
                      <div className="mt-2 text-xs text-primary font-medium">
                        {language === "ja" ? "🔥 12月31日まで申請受付中" : "🔥 Applications accepted until December 31st"}
                      </div>
                      
                      {/* Remaining spots counter */}
                      <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {language === "ja" ? "残り枠数" : "Remaining Spots"}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {founderMaxCount - founderCount}{language === "ja" ? "名" : " spots"}
                          </span>
                        </div>
                        <Progress value={(founderCount / founderMaxCount) * 100} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          {language === "ja" 
                            ? `${founderCount}名加入済み / ${founderMaxCount}名で値上げ（¥${founderNextPrice.toLocaleString()}）` 
                            : `${founderCount} joined / Price increase at ${founderMaxCount} (¥${founderNextPrice.toLocaleString()})`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                      <h4 className="font-medium mb-3 text-center flex items-center justify-center gap-2">
                        <span className="text-2xl">🏆</span>
                        {language === "ja" ? "プレミアム特典" : "Premium Benefits"}
                      </h4>
                      <ul className="space-y-2 text-sm font-light">
                        <li className="flex items-start">
                          <span className="mr-2">🏠</span>
                          <span>{language === "ja" ? "関連施設への特別価格での招待" : "Special pricing for partner facilities & invitations"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">🏝️</span>
                          <span>{language === "ja" ? "優先イベント・合宿への参加権" : "Priority access to exclusive events & training camps"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">💎</span>
                          <span>{language === "ja" ? "プレミアムサポート＆特別サービス" : "Premium support & special services"}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <h4 className="font-medium mb-3 text-center text-sm text-primary">
                        {language === "ja" ? "⚠️ 審査制プラン" : "⚠️ Application Required"}
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{language === "ja" ? "申請後、運営による審査があります" : "Subject to review after application"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{language === "ja" ? "毎年更新時に再審査が行われます" : "Annual renewal review required"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{language === "ja" ? "審査で承認されなかった場合、1年間は再申請できません" : "If not approved, cannot reapply for 1 year"}</span>
                        </li>
                      </ul>
                    </div>

                    <ul className="space-y-3 mb-6 text-sm font-light">
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>{language === "ja" ? "全技術動画への年間アクセス" : "Annual access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎨</span>
                        <span>{language === "ja" ? "Pro会員限定NFTバッジ付与" : "Exclusive Pro member NFT badge"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎯</span>
                        <span>{language === "ja" ? "10,000ポイント即時付与" : "10,000 points instantly awarded"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">👥</span>
                        <span>{language === "ja" ? "専用紹介コード発行（1人紹介で1,000pt）" : "Dedicated referral code (1,000pts per referral)"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
                      onClick={() => handleCheckout(PRICE_IDS.muratabros, false)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "Proプランに申請" : "Apply for Pro"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      {language === "ja" 
                        ? "※ 決済後に審査が行われます" 
                        : "※ Review process starts after payment"}
                    </p>
                  </div>
                )}

                {/* Founder Access - Show with MURATABROS for comparison */}
                {couponVerified && couponCode === "MURATABROS" && (
                  <div className="border border-border p-8 shadow-sm relative opacity-80 hover:opacity-100 transition-opacity">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-muted text-muted-foreground px-4 py-1 text-xs font-light">
                    {language === "ja" ? "スタンダード" : "Standard"}
                  </div>
                  <h3 className="text-xl font-light mb-4 mt-2">
                    {language === "ja" ? "創設者アクセス" : language === "pt" ? "Acesso Fundador" : "Founder Access"}
                  </h3>
                  <div className="mb-6">
                    <div className="text-3xl font-light mb-2">¥980</div>
                    <div className="text-sm text-muted-foreground font-light">
                      {language === "ja" ? "月額（3ヶ月無料・永久価格）" : "per month (3 months free・forever)"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {language === "ja" ? "残り" : "Remaining"} {timeLeft.days}
                        {language === "ja" ? "日" : " days "}
                        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm font-light">
                      <li className="flex items-start">
                        <span className="mr-2 text-muted-foreground">✓</span>
                        <span className="text-muted-foreground">{language === "ja" ? "全技術動画へのアクセス" : "Access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-muted-foreground">✓</span>
                        <span className="text-muted-foreground">{language === "ja" ? "新規コンテンツの追加" : "New content additions"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-muted-foreground">🎨</span>
                        <span className="text-muted-foreground">{language === "ja" ? "創設者NFTバッジ" : "Founder NFT badge"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-muted-foreground">🎯</span>
                        <span className="text-muted-foreground">{language === "ja" ? "毎月500ポイント" : "500 points monthly"}</span>
                      </li>
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCheckout(PRICE_IDS.founder, true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "このプランを選択" : "Select Plan"}
                    </Button>
                  </div>
                )}

                {/* Founder Access - Only show if coupon is MURATABJJ */}
                {couponVerified && couponCode === "MURATABJJ" && (
                  <div className="border border-primary p-8 shadow-lg relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-light">
                    {language === "ja" ? "特別オファー" : language === "pt" ? "Oferta Especial" : "Special Offer"}
                  </div>
                  <h3 className="text-2xl font-light mb-4 mt-2">
                    {language === "ja" ? "創設者アクセス" : language === "pt" ? "Acesso Fundador" : "Founder Access"}
                  </h3>
                  <div className="mb-6">
                    <div className="text-4xl font-light mb-2">¥980</div>
                    <div className="text-sm text-muted-foreground font-light">
                      {language === "ja" ? "月額（3ヶ月無料・期間限定・永久価格）" : language === "pt" ? "Por mês (3 meses grátis・preço limitado e permanente)" : "per month (3 months free・limited time forever)"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {language === "ja" ? "残り" : language === "pt" ? "Restam" : "Remaining"} {timeLeft.days}
                        {language === "ja" ? "日" : language === "pt" ? " dias " : " days "}
                        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
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
                        <span>{language === "ja" ? "¥980/月を永久に維持" : language === "pt" ? "Manter ¥980/mês para sempre" : "Keep ¥980/month forever"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎨</span>
                        <span>{language === "ja" ? "創設者NFTバッジ" : language === "pt" ? "Badge NFT de Fundador" : "Founder NFT badge"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎯</span>
                        <span>{language === "ja" ? "毎月500ポイント付与" : language === "pt" ? "500 pontos por mês" : "500 points monthly"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(PRICE_IDS.founder, true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "今すぐ参加" : language === "pt" ? "Participar agora" : "Join Now"}
                    </Button>
                  </div>
                )}

                {/* Monthly - Only show if no verified coupon */}
                {!couponVerified && (
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
                      <li className="flex items-start">
                        <span className="mr-2">🎨</span>
                        <span>{language === "ja" ? "月額会員NFTバッジ" : language === "pt" ? "Badge NFT mensal" : "Monthly member NFT badge"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎯</span>
                        <span>{language === "ja" ? "毎月100ポイント付与" : language === "pt" ? "100 pontos por mês" : "100 points monthly"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">👥</span>
                        <span>{language === "ja" ? "紹介コード発行（1人紹介で500pt）" : language === "pt" ? "Código de referência (500pts por indicação)" : "Referral code (500pts per referral)"}</span>
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
                )}

                {/* Annual - Only show if no verified coupon */}
                {!couponVerified && (
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
                    <li className="flex items-start">
                      <span className="mr-2">🎨</span>
                      <span>{language === "ja" ? "年間会員NFTバッジ" : language === "pt" ? "Badge NFT anual" : "Annual member NFT badge"}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">🎯</span>
                      <span>{language === "ja" ? "一括で1,500ポイント付与" : language === "pt" ? "1.500 pontos de uma vez" : "1,500 points upfront"}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">👥</span>
                      <span>{language === "ja" ? "紹介コード発行（1人紹介で500pt）" : language === "pt" ? "Código de referência (500pts por indicação)" : "Referral code (500pts per referral)"}</span>
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
                )}
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
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Join;
