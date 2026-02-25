import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";

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
  const [isLoading, setIsLoading] = useState(true);

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
      try {
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
      } finally {
        setIsLoading(false);
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
    founderNextPrice,
    isLoading
  };
};

// Stripe price IDs
const PRICE_IDS = {
  founder: "price_1SR3ZmDqLakc8NxkNdqL5BtO", // ¥980/month
  campaign: "price_1SZ5O2DqLakc8Nxk0e6QYg6D", // ¥1,900/month (Campaign price - 12月限定)
  monthly: "price_1SNQoeDqLakc8NxkEUVTTs3k", // ¥2,900/month (Regular price)
  annual: "price_1SNQoqDqLakc8NxkOaQIL8wX",  // ¥29,000/year
  muratabros: "price_1SY2D0DqLakc8NxkMKonyIi8", // ¥50,000 one-time
};

// Sample video ID
const SAMPLE_VIDEO_ID = "6a70670c-e9f8-4a8b-adce-8e703ac56bee";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;
  const { timeLeft, founderCount, founderMaxCount, founderCurrentPrice, founderNextPrice, isLoading: founderDataLoading } = useCountdown();
  const [isLoading, setIsLoading] = useState(false);
  const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [isValidReferralCode, setIsValidReferralCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [referralPlanType, setReferralPlanType] = useState<'founder' | 'muratabros' | 'referral' | 'teammurata'>('referral');
  const [teamSignupDialogOpen, setTeamSignupDialogOpen] = useState(false);
  const [teamSignupEmail, setTeamSignupEmail] = useState("");
  const [teamSignupPassword, setTeamSignupPassword] = useState("");
  const [teamSignupDisplayName, setTeamSignupDisplayName] = useState("");
  const [isTeamSigningUp, setIsTeamSigningUp] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{priceId: string; isSubscription: boolean} | null>(null);
  
  const { isLoading: authLoading, user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Validate referral code
  useEffect(() => {
    const validateReferralCode = async () => {
      const trimmedCode = referralCode.trim().toUpperCase();
      
      if (!trimmedCode) {
        setIsValidReferralCode(false);
        setReferralPlanType('referral');
        return;
      }
      
      // Check for special codes
      if (trimmedCode === 'MURATABJJ') {
        setIsValidReferralCode(true);
        setReferralPlanType('founder');
        return;
      }
      
      if (trimmedCode === 'MURATABROS') {
        setIsValidReferralCode(true);
        setReferralPlanType('muratabros');
        return;
      }
      
      if (trimmedCode === 'TEAMRYOZO') {
        setIsValidReferralCode(true);
        setReferralPlanType('teammurata');
        return;
      }
      
      setIsCheckingCode(true);
      try {
        const { data, error } = await supabase
          .from("referral_codes")
          .select("code")
          .eq("code", trimmedCode)
          .maybeSingle();
        
        if (!error && data) {
          setIsValidReferralCode(true);
          setReferralPlanType('referral');
        } else {
          setIsValidReferralCode(false);
          setReferralPlanType('referral');
        }
      } catch (error) {
        console.error("Error validating referral code:", error);
        setIsValidReferralCode(false);
        setReferralPlanType('referral');
      } finally {
        setIsCheckingCode(false);
      }
    };
    
    const debounceTimer = setTimeout(validateReferralCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [referralCode]);

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

  // GA4: Track plan listing view on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item_list', {
        item_list_id: 'pricing_plans',
        item_list_name: 'Pricing Plans',
        items: [
          { item_id: 'founder', item_name: 'Founder Plan', price: 980, currency: 'JPY' },
          { item_id: 'monthly', item_name: 'Monthly Plan', price: 2900, currency: 'JPY' },
          { item_id: 'annual', item_name: 'Annual Plan', price: 29000, currency: 'JPY' },
          { item_id: 'muratabros', item_name: 'Founder Plan Pro', price: 50000, currency: 'JPY' },
        ],
      });
    }
  }, []);

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    // GA4: Track begin_checkout
    const priceMap: Record<string, { name: string; price: number }> = {
      [PRICE_IDS.founder]: { name: 'Founder Plan', price: 980 },
      [PRICE_IDS.monthly]: { name: 'Monthly Plan', price: 2900 },
      [PRICE_IDS.annual]: { name: 'Annual Plan', price: 29000 },
      [PRICE_IDS.muratabros]: { name: 'Founder Plan Pro', price: 50000 },
    };
    const planInfo = priceMap[priceId];
    if (typeof window !== 'undefined' && window.gtag && planInfo) {
      window.gtag('event', 'begin_checkout', {
        currency: 'JPY',
        value: planInfo.price,
        items: [{ item_id: priceId, item_name: planInfo.name, price: planInfo.price, quantity: 1 }],
      });
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Show signup dialog instead of error
      setPendingCheckout({ priceId, isSubscription });
      setSignupDialogOpen(true);
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

  const handleSignUp = async () => {
    if (!signupEmail || !signupPassword) {
      toast.error(
        language === "ja" ? "入力エラー" : "Input Error",
        {
          description: language === "ja" 
            ? "メールアドレスとパスワードを入力してください" 
            : "Please enter email and password"
        }
      );
      return;
    }

    if (signupPassword.length < 6) {
      toast.error(
        language === "ja" ? "パスワードエラー" : "Password Error",
        {
          description: language === "ja" 
            ? "パスワードは6文字以上で入力してください" 
            : "Password must be at least 6 characters"
        }
      );
      return;
    }

    setIsSigningUp(true);
    try {
      const redirectUrl = `${window.location.origin}/join`;
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      // Wait for session to be established
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && pendingCheckout) {
        toast.success(
          language === "ja" ? "登録完了" : "Registration Complete",
          {
            description: language === "ja" 
              ? "決済画面に移動します..." 
              : "Redirecting to payment..."
          }
        );
        
        setSignupDialogOpen(false);
        
        // Proceed with checkout
        setTimeout(() => {
          handleCheckout(pendingCheckout.priceId, pendingCheckout.isSubscription);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(
        language === "ja" ? "登録エラー" : "Registration Error",
        {
          description: error.message || (language === "ja" 
            ? "登録に失敗しました" 
            : "Registration failed")
        }
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleTeamSignUp = async () => {
    if (!teamSignupEmail || !teamSignupPassword) {
      toast.error(
        language === "ja" ? "入力エラー" : "Input Error",
        {
          description: language === "ja" 
            ? "メールアドレスとパスワードを入力してください" 
            : "Please enter email and password"
        }
      );
      return;
    }

    if (teamSignupPassword.length < 6) {
      toast.error(
        language === "ja" ? "パスワードエラー" : "Password Error",
        {
          description: language === "ja" 
            ? "パスワードは6文字以上で入力してください" 
            : "Password must be at least 6 characters"
        }
      );
      return;
    }

    setIsTeamSigningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: teamSignupEmail,
          password: teamSignupPassword,
          displayName: teamSignupDisplayName || teamSignupEmail.split("@")[0],
          referralCode: referralCode.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const isUpgraded = data?.upgraded;
      
      toast.success(
        language === "ja" 
          ? (isUpgraded ? "スタッフ権限を付与しました！" : "スタッフ登録完了！")
          : (isUpgraded ? "Staff privileges granted!" : "Staff registration complete!"),
        {
          description: language === "ja" 
            ? "ログインページに移動します..." 
            : "Redirecting to login..."
        }
      );
      
      setTeamSignupDialogOpen(false);
      
      // Redirect to login page
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      console.error("Team signup error:", error);
      toast.error(
        language === "ja" ? "登録エラー" : "Registration Error",
        {
          description: error.message || (language === "ja" 
            ? "登録に失敗しました" 
            : "Registration failed")
        }
      );
    } finally {
      setIsTeamSigningUp(false);
    }
  };

  if (authLoading || subscriptionLoading || founderDataLoading) {
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

  const seoData = {
    ja: {
      title: "料金プラン | JiuFlow - ブラジリアン柔術学習プラットフォーム",
      description: "JiuFlowの料金プラン。月額プラン、年間プラン、ファウンダープランをご用意。200以上のテクニック動画で柔術を学べます。1ヶ月無料トライアル付き。"
    },
    en: {
      title: "Pricing Plans | JiuFlow - BJJ Learning Platform",
      description: "JiuFlow pricing plans. Monthly, annual, and founder plans available. Learn Jiu-Jitsu with 200+ technique videos. 1-month free trial included."
    },
    pt: {
      title: "Planos de Preços | JiuFlow - Plataforma de Aprendizado de BJJ",
      description: "Planos de preços JiuFlow. Planos mensais, anuais e de fundador disponíveis. Aprenda Jiu-Jitsu com mais de 200 vídeos. Teste grátis de 1 mês."
    }
  };

  const currentSeo = seoData[language] || seoData.ja;

  return (
    <div className="min-h-screen">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl="https://jitsuflow.app/join"
        keywords={["BJJ", "柔術", "料金", "プラン", "サブスクリプション"]}
      />
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Banner for logged-in users without subscription */}
          {user && !subscribed && !subscriptionLoading && (
            <div className="mb-12 relative overflow-hidden rounded-2xl animate-fade-up">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 backdrop-blur-sm" />
              <div className="relative p-10 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-2 shadow-lg">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-4xl font-light bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {language === "ja" 
                    ? "ようこそ！" 
                    : language === "pt" 
                    ? "Bem-vindo!" 
                    : "Welcome!"}
                </h2>
                <p className="text-lg text-foreground/80 max-w-2xl mx-auto font-light">
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
            {/* First Month Free Campaign Banner */}
            <div className="mb-12 relative overflow-hidden rounded-2xl animate-fade-up">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-90" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
              <div className="relative p-8 md:p-10 text-center text-white">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
                  <span className="animate-pulse">🎉</span>
                  <span>{language === "ja" ? "期間限定キャンペーン" : "Limited Time Offer"}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  {language === "ja" ? "初月無料" : "First Month FREE"}
                </h2>
                <p className="text-lg md:text-xl opacity-90 max-w-xl mx-auto">
                  {language === "ja" 
                    ? "今なら登録から1ヶ月間、すべてのコンテンツを無料でお試しいただけます" 
                    : "Try all content free for 1 month from registration"}
                </p>
              </div>
            </div>

            <div className="text-center mb-16 animate-fade-up">
              <h1 className="text-5xl md:text-6xl font-light mb-6">{t.join.title}</h1>
              <p className="text-xl text-muted-foreground font-light">
                {t.join.subtitle}
              </p>
            </div>

            {/* Sample Video Section */}
            <div className="relative overflow-hidden rounded-2xl mb-16 animate-fade-up">
              <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-background" />
              <div className="relative p-8 border border-border/50 rounded-2xl backdrop-blur-sm space-y-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-2">
                    <Eye className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-light">{t.join.sampleVideo.title}</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {language === "ja" 
                      ? "まずは「見る」から始めよう。" 
                      : "Start by watching."}
                  </p>
                  {user && viewCount > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1.5 mx-auto w-fit">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === "ja" ? "視聴" : "Watched"} {viewCount}{language === "ja" ? "回" : "x"}</span>
                    </Badge>
                  )}
                </div>
                
                <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-muted">
                  {sampleVideoUrl ? (
                    <video
                      src={sampleVideoUrl}
                      className="w-full h-full"
                      controls
                      onPlay={async () => {
                        // Record view when video starts playing
                        if (user) {
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
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-muted-foreground">{language === "ja" ? "動画を読み込み中..." : "Loading video..."}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Code Section */}
            <div className="relative overflow-hidden rounded-xl mb-12 animate-fade-up">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-secondary/10 to-muted/40" />
              <div className="relative p-8 border border-border rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-light mb-4 text-center">
                  {language === "ja" ? "紹介コードをお持ちの方" : "Have a referral code?"}
                </h3>
                <div className="flex flex-col gap-3 max-w-md mx-auto">
                  <Input
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={language === "ja" ? "紹介コードを入力" : "Enter referral code"}
                    value={referralCode}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                      setIsComposing(false);
                      const target = e.target as HTMLInputElement;
                      setReferralCode(target.value.toUpperCase());
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReferralCode(isComposing ? value : value.toUpperCase());
                    }}
                    className="h-12 text-base bg-background/80 backdrop-blur-sm border border-border focus:border-primary transition-all"
                  />
                  {referralCode.trim() && !isCheckingCode && (
                    <p className={`text-sm text-center font-medium ${isValidReferralCode ? 'text-green-600' : 'text-red-600'}`}>
                      {isValidReferralCode 
                        ? (language === "ja" ? "✓ 有効な紹介コード" : "✓ Valid referral code")
                        : (language === "ja" ? "✗ 無効な紹介コード" : "✗ Invalid referral code")}
                    </p>
                  )}
                  {isCheckingCode && (
                    <p className="text-sm text-center text-muted-foreground">
                      {language === "ja" ? "確認中..." : "Checking..."}
                    </p>
                  )}
                </div>
              </div>
            </div>


            {/* Pricing */}
            <div className={`grid ${isValidReferralCode ? 'md:grid-cols-1 max-w-xl mx-auto' : 'md:grid-cols-2'} gap-8 mb-16 animate-fade-up`}>
              {/* Referral Plans - shown when valid referral code is entered */}
              
              {/* MURATABJJ - Ryozo Association Plan */}
              {isValidReferralCode && referralPlanType === 'founder' && (
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 rounded-2xl" />
                  <div className="relative border-2 border-primary p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 text-sm font-medium rounded-full shadow-lg z-10">
                      {language === "ja" ? "🎁 紹介者限定プラン" : "🎁 Referral Plan"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      Ryozo Association Plan
                    </h3>
                    <div className="mb-8">
                      <div className="text-5xl font-light mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">¥1,480</div>
                      <div className="text-base text-muted-foreground font-light">
                        {language === "ja" ? "月額（初月無料・いつでもキャンセル可能）" : "per month (1 month free・cancel anytime)"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span className="font-medium text-primary">{language === "ja" ? "月額1,480円（通常の約49%OFF）" : "¥1,480/month (about 49% off)"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span className="font-medium text-primary">{language === "ja" ? "初月無料トライアル" : "1 month free trial"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "全技術動画へのアクセス" : "Access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "新規コンテンツの追加" : "New content additions"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg transition-all"
                      onClick={() => handleCheckout(PRICE_IDS.founder, true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "初月無料で始める" : "Start with 1 month free"}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* MURATABROS - Pro Plan */}
              {isValidReferralCode && referralPlanType === 'muratabros' && (
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/10 rounded-2xl" />
                  <div className="relative border-2 border-accent p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-primary-foreground px-6 py-2 text-sm font-medium rounded-full shadow-lg z-10">
                      {language === "ja" ? "🎁 VIPプラン" : "🎁 VIP Plan"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      Founder Plan Pro
                    </h3>
                    <div className="mb-8">
                      <div className="text-5xl font-light mb-3 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">¥50,000</div>
                      <div className="text-base text-muted-foreground font-light">
                        {language === "ja" ? "一回払い" : "One-time payment"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-accent text-xl">✓</span>
                        <span className="font-medium text-accent">{language === "ja" ? "Hawaii合宿参加権" : "Hawaii camp access"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-accent text-xl">✓</span>
                        <span className="font-medium text-accent">{language === "ja" ? "熱海合宿参加権" : "Atami retreat access"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-accent text-xl">✓</span>
                        <span className="font-medium text-accent">{language === "ja" ? "Not A Hotel利用権" : "Not A Hotel access"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-accent text-xl">✓</span>
                        <span className="font-medium text-accent">{language === "ja" ? "Enablerアクセス" : "Enabler access"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-accent text-xl">✓</span>
                        <span className="font-medium text-accent">{language === "ja" ? "Honda Jet利用権" : "Honda Jet usage rights"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "全技術動画への永久アクセス" : "Lifetime access to all videos"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 shadow-lg transition-all"
                      onClick={() => handleCheckout(PRICE_IDS.muratabros, false)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "Founder Plan Proで始める" : "Start with Founder Plan Pro"}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* TeamRyozo - Staff Plan (Free Forever) */}
              {isValidReferralCode && referralPlanType === 'teammurata' && (
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/10 rounded-2xl" />
                  <div className="relative border-2 border-emerald-500 p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 text-sm font-medium rounded-full shadow-lg z-10">
                      {language === "ja" ? "🌟 スタッフ" : "🌟 Staff"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      Team Ryozo
                    </h3>
                    <div className="mb-8">
                      <div className="text-5xl font-light mb-3 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                        {language === "ja" ? "永年無料" : "Free Forever"}
                      </div>
                      <div className="text-base text-muted-foreground font-light">
                        {language === "ja" ? "クレジットカード不要" : "No credit card required"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-emerald-500 text-xl">✓</span>
                        <span className="font-medium text-emerald-500">{language === "ja" ? "永久無料アクセス" : "Lifetime free access"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-emerald-500 text-xl">✓</span>
                        <span className="font-medium text-emerald-500">{language === "ja" ? "スタッフ権限付与" : "Staff permissions granted"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "全技術動画へのアクセス" : "Access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "管理画面の閲覧" : "Admin dashboard view access"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500/90 hover:to-teal-500/90 shadow-lg transition-all text-white"
                      onClick={() => setTeamSignupDialogOpen(true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "スタッフとして登録" : "Register as Staff"}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Regular Referral Plan - 1900 yen */}
              {isValidReferralCode && referralPlanType === 'referral' && (
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-primary/10 to-background rounded-2xl" />
                  <div className="relative border-2 border-secondary p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-secondary text-primary-foreground px-6 py-2 text-sm font-medium rounded-full shadow-lg z-10">
                      {language === "ja" ? "🎁 紹介特典" : "🎁 Referral Special"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      {language === "ja" ? "紹介プラン" : language === "pt" ? "Plano de Referência" : "Referral Plan"}
                    </h3>
                    <div className="mb-8">
                      <div className="flex items-baseline gap-3 mb-3">
                        <div className="text-5xl font-light bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">¥1,900</div>
                        <div className="text-2xl line-through text-muted-foreground">¥2,900</div>
                      </div>
                      <div className="text-base text-muted-foreground font-light">
                        {language === "ja" ? "月額（初月無料・いつでもキャンセル可能）" : "per month (first month free・cancel anytime)"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-secondary text-xl">✓</span>
                        <span className="font-medium text-secondary">{language === "ja" ? "初月完全無料（100%オフ）" : "First month completely free (100% off)"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-secondary text-xl">✓</span>
                        <span className="font-medium text-secondary">{language === "ja" ? "2ヶ月目以降：月額1,900円" : "From month 2: ¥1,900/month"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "全技術動画へのアクセス" : language === "pt" ? "Acesso a todos os vídeos técnicos" : "Access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "新規コンテンツの追加" : language === "pt" ? "Novos conteúdos adicionados" : "New content additions"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-xl">✓</span>
                        <span>{language === "ja" ? "紹介者に毎月500ポイント付与" : "Referrer gets 500 points monthly"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 shadow-lg transition-all"
                      onClick={() => handleCheckout(PRICE_IDS.monthly, true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "紹介プランで始める" : language === "pt" ? "Começar com plano de referência" : "Start with Referral Plan"}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Monthly Plan - Only shown when no valid referral code */}
              {!isValidReferralCode && (
                <div className="relative overflow-hidden rounded-2xl group hover:shadow-xl transition-all ring-2 ring-primary/50">
                  {/* First Month Free Badge */}
                  <div className="absolute -top-1 -right-1 z-10">
                    <div className="bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-3 py-1.5 rounded-bl-lg rounded-tr-xl shadow-lg">
                      {language === "ja" ? "🎁 初月無料" : "🎁 1st Month FREE"}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
                  <div className="relative border border-primary/30 p-10 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-3xl font-light mb-6">
                      {language === "ja" ? "月額プラン" : "Monthly Plan"}
                    </h3>
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <div className="text-5xl font-light">¥2,900</div>
                        <div className="text-sm text-muted-foreground">
                          {language === "ja" ? "/月" : "/mo"}
                        </div>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                        <span>✨</span>
                        <span>{language === "ja" ? "初月0円でお試し" : "Try free for 1 month"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground font-light mt-2">
                        {language === "ja" ? "いつでもキャンセル可能" : "Cancel anytime"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span>{language === "ja" ? "全技術動画へのアクセス" : "Access to all technique videos"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span>{language === "ja" ? "新規コンテンツの追加" : "New content additions"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span>{language === "ja" ? "柔軟な支払い" : "Flexible payment"}</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg transition-all"
                      onClick={() => handleCheckout(PRICE_IDS.monthly, true)}
                      disabled={isLoading}
                    >
                      {language === "ja" ? "初月無料で始める" : "Start Free Trial"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      {language === "ja" 
                        ? "※ 無料期間終了前にマイページからいつでも解約可能" 
                        : "* Cancel anytime before trial ends from My Page"}
                    </p>
                  </div>
                </div>
              )}

              {/* Annual Plan - Only shown when no valid referral code */}
              {!isValidReferralCode && (
              <div className="relative overflow-hidden rounded-2xl group hover:shadow-xl transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-background" />
                <div className="relative border border-border/50 p-10 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-3xl font-light mb-6">
                    {language === "ja" ? "年額プラン" : language === "pt" ? "Plano Anual" : "Annual Plan"}
                  </h3>
                  <div className="mb-8">
                    <div className="text-5xl font-light mb-3">¥29,000</div>
                    <div className="text-base text-muted-foreground font-light">
                      {language === "ja" ? "年額（1ヶ月無料・約2ヶ月分お得）" : language === "pt" ? "Por ano (1 mês grátis・economize cerca de 2 meses)" : "per year (1 month free・save ~2 months)"}
                    </div>
                  </div>
                  <ul className="space-y-4 mb-8 text-base font-light">
                    <li className="flex items-start">
                      <span className="mr-3 text-xl">✓</span>
                      <span>{language === "ja" ? "全技術動画へのアクセス" : language === "pt" ? "Acesso a todos os vídeos técnicos" : "Access to all technique videos"}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-xl">✓</span>
                      <span>{language === "ja" ? "新規コンテンツの追加" : language === "pt" ? "Novos conteúdos adicionados" : "New content additions"}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-xl">✓</span>
                      <span>{language === "ja" ? "最大の節約" : language === "pt" ? "Melhor economia" : "Best value"}</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full h-14 text-lg hover:bg-primary/90 transition-all"
                    onClick={() => handleCheckout(PRICE_IDS.annual, true)}
                    disabled={isLoading}
                  >
                    {language === "ja" ? "年額で始める" : language === "pt" ? "Começar anualmente" : "Start Annually"}
                  </Button>
                </div>
              </div>
              )}
            </div>

            {/* Rewards System Explanation */}
            <div className="mt-20 relative overflow-hidden rounded-2xl animate-fade-up">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30" />
              <div className="relative p-12 border border-border/50 rounded-2xl backdrop-blur-sm">
                <h3 className="text-3xl font-light mb-10 text-center">
                  {language === "ja" ? "🎁 リワードシステム" : "🎁 Rewards System"}
                </h3>
                <div className="grid md:grid-cols-1 gap-8">
                  <div className="text-center p-6 rounded-xl bg-background/50 hover:bg-background/80 transition-all group">
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👥</div>
                    <h4 className="font-medium mb-3 text-lg">
                      {language === "ja" ? "紹介制度" : "Referral Program"}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {language === "ja" 
                        ? "専用紹介コードで友達を招待すると、特別コンテンツや講習会などに参加できます"
                        : "Invite friends with your unique code to access exclusive content and workshops"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-16 animate-fade-up">
              <h3 className="text-2xl font-light mb-8 text-center border-b border-border pb-4">
                {language === "ja" ? "よくあるご質問" : "FAQ"}
              </h3>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="faq-1" className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-light hover:no-underline">
                    {language === "ja" 
                      ? "初心者でも内容は理解できますか？" 
                      : "Can beginners understand the content?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm font-light leading-relaxed">
                    {language === "ja" 
                      ? "はい。白帯の初心者でも身につけられ、かつ黒帯まで使い続けられる本質的なテクニックを厳選しています。実際にYAWARAやSWEEPでは、運動未経験からこのメソッドを学び、白帯で優勝された方も多数いらっしゃいます。"
                      : "Yes. We carefully select essential techniques that beginners can learn and continue using up to black belt. At YAWARA and SWEEP, many people with no athletic background have learned this method and won championships at white belt."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2" className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-light hover:no-underline">
                    {language === "ja" 
                      ? "他のサービスに比べてテクニックの種類が少ないのはなぜですか？" 
                      : "Why are there fewer techniques compared to other services?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm font-light leading-relaxed">
                    {language === "ja" 
                      ? "辞書のような網羅性を目指しているのではなく、黒帯までの最短ルートを迷わず進めるよう、あえて「回り道をしないための技」に絞って掲載しているためです。"
                      : "Rather than aiming for dictionary-like comprehensiveness, we deliberately focus on 'techniques to avoid detours' so you can take the shortest path to black belt without getting lost."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3" className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-light hover:no-underline">
                    {language === "ja" 
                      ? "動画を見ただけで強くなれますか？おすすめの学習方法は？" 
                      : "Can I get stronger just by watching videos? What's the recommended learning method?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm font-light leading-relaxed">
                    {language === "ja" 
                      ? "動画で論理を理解し、道場での練習で実践するのが最短の道です。練習直前にスマホでテーマを確認してからマットに上がるスタイルをおすすめしています。"
                      : "The fastest path is to understand the logic through videos and practice at the dojo. We recommend checking the topic on your phone just before practice and then stepping onto the mat."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4" className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-light hover:no-underline">
                    {language === "ja" 
                      ? "トライアル期間中に解約した場合、料金はかかりますか？" 
                      : "Will I be charged if I cancel during the trial period?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm font-light leading-relaxed">
                    {language === "ja" 
                      ? "期間終了前に解約手続きを完了すれば、料金は一切発生しません。マイページからいつでも即座にお手続きいただけます。"
                      : "If you complete the cancellation process before the trial ends, no charges will be made. You can cancel anytime instantly from My Page."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-5" className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="text-left text-sm md:text-base font-light hover:no-underline">
                    {language === "ja" 
                      ? "練習記録機能はどのように使えますか？" 
                      : "How can I use the practice record feature?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm font-light leading-relaxed">
                    {language === "ja" 
                      ? "視聴した動画の感想や、スパーリングの気づきをメモとして残せます。言語化することで技術の定着率が高まり、自分だけの「デジタル柔術ノート」として活用いただけます。"
                      : "You can save notes about your thoughts on watched videos and insights from sparring. Verbalizing helps techniques stick better, and you can use it as your own 'digital Jiu-Jitsu notebook'."}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-6 text-center">
                <Link 
                  to="/faq" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {language === "ja" ? "その他、詳細なFAQはこちら →" : "For more detailed FAQ →"}
                </Link>
              </div>
            </div>
          </>
        </div>
      </main>

      {/* Signup Dialog */}
      <Dialog open={signupDialogOpen} onOpenChange={setSignupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {language === "ja" ? "新規登録" : "Sign Up"}
            </DialogTitle>
            <DialogDescription>
              {language === "ja" 
                ? "アカウントを作成して、決済を完了させましょう" 
                : "Create an account to complete your payment"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">
                {language === "ja" ? "メールアドレス" : "Email"}
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                disabled={isSigningUp}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-password">
                {language === "ja" ? "パスワード（6文字以上）" : "Password (6+ characters)"}
              </Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                disabled={isSigningUp}
              />
            </div>

            {referralCode && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm">
                  {language === "ja" ? "紹介コード: " : "Referral Code: "}
                  <span className="font-medium">{referralCode}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSignupDialogOpen(false)}
              disabled={isSigningUp}
              className="flex-1"
            >
              {language === "ja" ? "キャンセル" : "Cancel"}
            </Button>
            <Button
              onClick={handleSignUp}
              disabled={isSigningUp}
              className="flex-1"
            >
              {isSigningUp 
                ? (language === "ja" ? "登録中..." : "Signing up...") 
                : (language === "ja" ? "登録して決済へ" : "Sign Up & Checkout")}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-2">
            {language === "ja" 
              ? "既にアカウントをお持ちの方は " 
              : "Already have an account? "}
            <button
              onClick={() => {
                setSignupDialogOpen(false);
                navigate("/login");
              }}
              className="text-primary hover:underline"
            >
              {language === "ja" ? "ログイン" : "Log in"}
            </button>
          </p>
        </DialogContent>
      </Dialog>

      {/* Team Signup Dialog */}
      <Dialog open={teamSignupDialogOpen} onOpenChange={setTeamSignupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {language === "ja" ? "🌟 スタッフ登録" : "🌟 Staff Registration"}
            </DialogTitle>
            <DialogDescription>
              {language === "ja" 
                ? "TeamRyozoコードで永年無料・スタッフ権限が付与されます" 
                : "Register with TeamRyozo code for lifetime free access with staff permissions"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-signup-displayname">
                {language === "ja" ? "表示名（任意）" : "Display Name (optional)"}
              </Label>
              <Input
                id="team-signup-displayname"
                type="text"
                placeholder={language === "ja" ? "村田太郎" : "Your Name"}
                value={teamSignupDisplayName}
                onChange={(e) => setTeamSignupDisplayName(e.target.value)}
                disabled={isTeamSigningUp}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-signup-email">
                {language === "ja" ? "メールアドレス" : "Email"} *
              </Label>
              <Input
                id="team-signup-email"
                type="email"
                placeholder="you@example.com"
                value={teamSignupEmail}
                onChange={(e) => setTeamSignupEmail(e.target.value)}
                disabled={isTeamSigningUp}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-signup-password">
                {language === "ja" ? "パスワード" : "Password"} *
              </Label>
              <Input
                id="team-signup-password"
                type="password"
                placeholder={language === "ja" ? "6文字以上" : "At least 6 characters"}
                value={teamSignupPassword}
                onChange={(e) => setTeamSignupPassword(e.target.value)}
                disabled={isTeamSigningUp}
              />
            </div>
            
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {language === "ja" 
                  ? "✓ 永年無料・クレジットカード不要・スタッフ権限付与" 
                  : "✓ Free forever • No credit card • Staff permissions"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setTeamSignupDialogOpen(false)}
              disabled={isTeamSigningUp}
              className="flex-1"
            >
              {language === "ja" ? "キャンセル" : "Cancel"}
            </Button>
            <Button
              onClick={handleTeamSignUp}
              disabled={isTeamSigningUp}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500/90 hover:to-teal-500/90 text-white"
            >
              {isTeamSigningUp 
                ? (language === "ja" ? "登録中..." : "Registering...") 
                : (language === "ja" ? "登録する" : "Register")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Join;
