import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

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

  return timeLeft;
};

// Stripe price IDs
const PRICE_IDS = {
  founder: "price_1SR3ZmDqLakc8NxkNdqL5BtO", // ¥980/month
  monthly: "price_1SNQoeDqLakc8NxkEUVTTs3k", // ¥2,900/month
  annual: "price_1SNQoqDqLakc8NxkOaQIL8wX",  // ¥29,000/year
};

// Sample video ID
const SAMPLE_VIDEO_ID = "6a70670c-e9f8-4a8b-adce-8e703ac56bee";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const countdown = useCountdown();
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  
  const { isLoading: authLoading } = useAuth();
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

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    setIsLoading(true);
    try {
      const functionName = isSubscription ? "create-checkout" : "create-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          priceId, 
          couponCode: couponCode.trim() || undefined 
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
              <div className="border border-border p-6 mb-8 animate-fade-up">
                <h3 className="text-lg font-light mb-3 text-center">
                  {language === "ja" ? "クーポンコードをお持ちの方" : "Have a coupon code?"}
                </h3>
                <div className="flex gap-3 max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder={language === "ja" ? "クーポンコードを入力" : "Enter coupon code"}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  {couponCode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCouponCode("")}
                    >
                      {language === "ja" ? "クリア" : "Clear"}
                    </Button>
                  )}
                </div>
                {couponCode && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {language === "ja" 
                      ? "決済時にクーポンコードが適用されます" 
                      : "Coupon will be applied at checkout"}
                  </p>
                )}
              </div>

              {/* Pricing */}
              <div className={`grid ${couponCode === "MURATABJJ" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-8 mb-16 animate-fade-up`}>
                {/* Founder Access - Only show if coupon is MURATABJJ */}
                {couponCode === "MURATABJJ" && (
                  <div className="border border-border p-8">
                  <h3 className="text-2xl font-light mb-4">
                    {language === "ja" ? "創設者アクセス" : language === "pt" ? "Acesso Fundador" : "Founder Access"}
                  </h3>
                  <div className="mb-6">
                    <div className="text-4xl font-light mb-2">¥980</div>
                    <div className="text-sm text-muted-foreground font-light">
                      {language === "ja" ? "月額（7日間無料・期間限定・永久価格）" : language === "pt" ? "Por mês (7 dias grátis・preço limitado e permanente)" : "per month (7 days free・limited time forever)"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {language === "ja" ? "残り" : language === "pt" ? "Restam" : "Remaining"} {countdown.days}
                        {language === "ja" ? "日" : language === "pt" ? " dias " : " days "}
                        {countdown.hours}:{countdown.minutes}:{countdown.seconds}
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

                {/* Monthly */}
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
                      {language === "ja" ? "月額（7日間無料・いつでもキャンセル可能）" : language === "pt" ? "Por mês (7 dias grátis・cancele a qualquer momento)" : "per month (7 days free・cancel anytime)"}
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

                {/* Annual */}
                <div className="border border-border p-8">
                  <h3 className="text-2xl font-light mb-4">
                    {language === "ja" ? "年額プラン" : language === "pt" ? "Plano Anual" : "Annual Plan"}
                  </h3>
                  <div className="mb-6">
                    <div className="text-4xl font-light mb-2">¥29,000</div>
                    <div className="text-sm text-muted-foreground font-light">
                      {language === "ja" ? "年額（7日間無料・約2ヶ月分お得）" : language === "pt" ? "Por ano (7 dias grátis・economize cerca de 2 meses)" : "per year (7 days free・save ~2 months)"}
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
