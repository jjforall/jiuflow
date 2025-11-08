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
  founder: "price_1SR3ZmDqLakc8NxkNdqL5BtO",
  monthly: "price_1SNQoeDqLakc8NxkEUVTTs3k",
  annual: "price_1SNQoqDqLakc8NxkOaQIL8wX",
};

// Sample video ID
const SAMPLE_VIDEO_ID = "6a70670c-e9f8-4a8b-adce-8e703ac56bee";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const countdown = useCountdown();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [pendingIsSubscription, setPendingIsSubscription] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
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
      toast.success(t.join.payment?.success || "Payment successful!", {
        description: t.join.payment?.successDesc || "Thank you for your purchase.",
      });
    } else if (searchParams.get("canceled") === "true") {
      toast.error(t.join.payment?.canceled || "Payment canceled", {
        description: t.join.payment?.canceledDesc || "Your payment was canceled.",
      });
    }
  }, [searchParams, t.join.payment]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (!data.session) {
        toast.success(language === "ja" ? "確認メールを送信しました" : "Confirmation email sent", {
          description: language === "ja" 
            ? "メールアドレスに送信された確認リンクをクリックしてから、再度ログインしてください" 
            : "Please click the confirmation link sent to your email, then log in again",
        });
        setShowSignupModal(false);
        setIsLoading(false);
        return;
      }

      toast.success(language === "ja" ? "アカウントを作成しました" : "Account created", {
        description: language === "ja" ? "決済ページに移動します..." : "Redirecting to checkout...",
      });

      setShowSignupModal(false);
      
      // Wait a moment for the session to fully propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Proceed with checkout
      if (pendingPriceId) {
        await proceedToCheckout(pendingPriceId, pendingIsSubscription);
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(t.join.payment?.error || "Signup error", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToCheckout = async (priceId: string, isSubscription: boolean) => {
    setIsLoading(true);
    try {
      const functionName = isSubscription ? "create-checkout" : "create-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { priceId, couponCode: couponCode.trim() || undefined },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t.join.payment?.error || "Payment error", {
        description: t.join.payment?.errorDesc || "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Show signup modal instead of redirecting to auth page
      setPendingPriceId(priceId);
      setPendingIsSubscription(isSubscription);
      setShowSignupModal(true);
      return;
    }

    await proceedToCheckout(priceId, isSubscription);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
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

          {/* Signup Modal */}
          <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {language === "ja" ? "アカウント作成" : language === "pt" ? "Criar conta" : "Create Account"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder={language === "ja" ? "メールアドレス" : "Email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder={language === "ja" ? "パスワード" : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? (language === "ja" ? "作成中..." : "Creating...")
                    : (language === "ja" ? "アカウントを作成して決済へ" : "Create & Proceed to Checkout")}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {language === "ja"
                    ? "アカウント作成後、自動的に決済ページへ移動します"
                    : "After creating your account, you'll be redirected to checkout"}
                </p>
              </form>
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
          <div className="grid md:grid-cols-3 gap-8 mb-16 animate-fade-up">
            {/* Founder Plan */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">{t.join.founder?.title || "Founder Plan"}</h2>
              <div className="text-4xl font-light mb-6">
                ¥980<span className="text-lg text-muted-foreground">{t.join.founder?.period || "/month lifetime"}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t.join.founder?.limited || "Limited until end of November"}</p>
              <div className="bg-muted/50 p-4 mb-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{language === "ja" ? "終了まで" : "Ends in"}</p>
                <div className="flex justify-center gap-2 text-sm">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-lg">{countdown.days}</span>
                    <span className="text-xs text-muted-foreground">{language === "ja" ? "日" : "days"}</span>
                  </div>
                  <span className="text-lg">:</span>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-lg">{countdown.hours}</span>
                    <span className="text-xs text-muted-foreground">{language === "ja" ? "時間" : "hrs"}</span>
                  </div>
                  <span className="text-lg">:</span>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-lg">{countdown.minutes}</span>
                    <span className="text-xs text-muted-foreground">{language === "ja" ? "分" : "min"}</span>
                  </div>
                  <span className="text-lg">:</span>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-lg">{countdown.seconds}</span>
                    <span className="text-xs text-muted-foreground">{language === "ja" ? "秒" : "sec"}</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {(t.join.founder?.features || [
                  "Unlimited access",
                  "Lifetime ¥500/month",
                  "Better than one-time"
                ]).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.founder, true)}
                disabled={isLoading}
              >
                {t.join.founder?.cta || "Get Founder Access"}
              </Button>
            </div>

            {/* Monthly */}
            <div className="border border-foreground p-8 relative">
              <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-xs">
                {t.join.monthly.recommended}
              </div>
              <h2 className="text-2xl font-light mb-4">{t.join.monthly.title}</h2>
              <div className="text-4xl font-light mb-6">
                {t.join.monthly.price}<span className="text-lg text-muted-foreground">{t.join.monthly.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {t.join.monthly.features.map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="default" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.monthly, true)}
                disabled={isLoading}
              >
                {t.join.monthly.cta}
              </Button>
            </div>

            {/* Annual */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">{t.join.annual?.title || "Annual Plan"}</h2>
              <div className="text-4xl font-light mb-6">
                ¥29,000<span className="text-lg text-muted-foreground">{t.join.annual?.period || "/year"}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t.join.annual?.savings || "Save 17% vs monthly"}</p>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {(t.join.annual?.features || [
                  "All monthly features",
                  "Annual billing",
                  "Best value"
                ]).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.annual, true)}
                disabled={isLoading}
              >
                {t.join.annual?.cta || "Subscribe Annually"}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Join;
