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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
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

  return (
    <div className="min-h-screen">
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
            {/* Campaign Banner - 12月限定 */}
            {!subscribed && (
              <div className="mb-12 relative overflow-hidden rounded-2xl animate-fade-up">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-primary/20 to-orange-500/20" />
                <div className="relative p-10 border-2 border-red-500/50 rounded-2xl backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 mb-2 shadow-2xl animate-pulse">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                      {language === "ja" 
                        ? "12月限定キャンペーン！" 
                        : "December Campaign!"}
                    </h2>
                    <div className="space-y-3">
                      <p className="text-2xl md:text-3xl font-bold text-foreground">
                        {language === "ja" 
                          ? "1ヶ月無料 + 一生1,900円/月" 
                          : "1 Month Free + ¥1,900/month Forever"}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {language === "ja" 
                          ? "通常2,900円 → 永久に1,900円！" 
                          : "Regular ¥2,900 → Forever ¥1,900!"}
                      </p>
                      {timeLeft.days > 0 && (
                        <div className="flex justify-center gap-4 pt-4">
                          <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-red-500">{timeLeft.days}</div>
                            <div className="text-sm text-muted-foreground">{language === "ja" ? "日" : "Days"}</div>
                          </div>
                          <div className="text-3xl md:text-4xl font-bold text-muted-foreground">:</div>
                          <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-orange-500">{timeLeft.hours}</div>
                            <div className="text-sm text-muted-foreground">{language === "ja" ? "時間" : "Hours"}</div>
                          </div>
                          <div className="text-3xl md:text-4xl font-bold text-muted-foreground">:</div>
                          <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-yellow-500">{timeLeft.minutes}</div>
                            <div className="text-sm text-muted-foreground">{language === "ja" ? "分" : "Mins"}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              
              {/* MURATABJJ - Founder Plan */}
              {isValidReferralCode && referralPlanType === 'founder' && (
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 rounded-2xl" />
                  <div className="relative border-2 border-primary p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 text-sm font-medium rounded-full shadow-lg z-10">
                      {language === "ja" ? "🎁 特別プラン" : "🎁 Special Plan"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      Founder Plan
                    </h3>
                    <div className="mb-8">
                      <div className="text-5xl font-light mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">¥980</div>
                      <div className="text-base text-muted-foreground font-light">
                        {language === "ja" ? "月額（3ヶ月無料・いつでもキャンセル可能）" : "per month (3 months free・cancel anytime)"}
                      </div>
                    </div>
                    <ul className="space-y-4 mb-8 text-base font-light">
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span className="font-medium text-primary">{language === "ja" ? "永久に月額980円" : "¥980/month forever"}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-3 text-primary text-xl">✓</span>
                        <span className="font-medium text-primary">{language === "ja" ? "3ヶ月無料トライアル" : "3 months free trial"}</span>
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
                      {language === "ja" ? "Founder Planで始める" : "Start with Founder Plan"}
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
                <div className="relative rounded-2xl group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-2xl" />
                  <div className="relative border-2 border-red-500/50 p-10 rounded-2xl backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg z-10 animate-pulse">
                      {language === "ja" ? "🔥 12月限定" : "🔥 December Only"}
                    </div>
                    <h3 className="text-3xl font-light mb-6 mt-2">
                      {language === "ja" ? "キャンペーンプラン" : "Campaign Plan"}
                    </h3>
                    <div className="mb-8">
                      <div className="flex items-baseline gap-3 mb-3">
                        <div className="text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">¥1,900</div>
                        <div className="text-2xl line-through text-muted-foreground">¥2,900</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-medium text-red-500">
                          {language === "ja" ? "月額（永久価格・いつでもキャンセル可能）" : "per month (forever price・cancel anytime)"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {language === "ja" ? "※12月中の登録で一生この価格" : "※Register in December for lifetime price"}
                        </div>
                      </div>
                    </div>
                   <ul className="space-y-4 mb-8 text-base font-light">
                    <li className="flex items-start">
                      <span className="mr-3 text-red-500 text-xl font-bold">✓</span>
                      <span className="font-bold text-red-500">{language === "ja" ? "1ヶ月完全無料（100%オフ）" : "1 month completely free (100% off)"}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500 text-xl font-bold">✓</span>
                      <span className="font-bold text-orange-500">{language === "ja" ? "永久に月額1,900円（値上げなし）" : "Forever ¥1,900/month (no price increase)"}</span>
                    </li>
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
                    className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg transition-all font-bold"
                    onClick={() => handleCheckout(PRICE_IDS.campaign, true)}
                    disabled={isLoading}
                  >
                    {language === "ja" ? "今すぐ始める（1ヶ月無料）" : "Start Now (1 Month Free)"}
                  </Button>
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
