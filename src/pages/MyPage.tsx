import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CreditCard, Calendar, Mail, Upload, Video, Eye } from "lucide-react";
import { toast } from "sonner";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { Badge } from "@/components/ui/badge";

interface SubscriptionStatus {
  subscribed: boolean;
  product_id?: string;
  price_id?: string;
  subscription_end?: string;
  is_trialing?: boolean;
}

interface UserVideo {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  video_url: string;
  thumbnail_url: string | null;
  view_count: number;
  created_at: string;
}

const MyPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>("");
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsLoading, setPointsLoading] = useState(true);

  const loadUserVideos = async () => {
    if (!user) return;
    
    setVideosLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
    await checkSubscription();
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      loadUserVideos();
      loadReferralCodeAndPoints();
    }
  }, [user]);

  const loadReferralCodeAndPoints = async () => {
    if (!user) return;
    
    setPointsLoading(true);
    try {
      // Load referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .single();

      if (codeError) throw codeError;
      if (codeData) {
        setReferralCode(codeData.code);
        
        // Create Stripe coupon for this referral code
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('create-referral-coupon', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        }
      }

      // Load points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') throw pointsError;
      setUserPoints(pointsData?.points || 0);
    } catch (error) {
      console.error('Error loading referral code and points:', error);
    } finally {
      setPointsLoading(false);
    }
  };

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

      // Award monthly points if subscribed
      if (data?.subscribed) {
        try {
          await supabase.functions.invoke("award-monthly-points", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          // Reload points after awarding
          loadReferralCodeAndPoints();
        } catch (pointsError) {
          console.error("Error awarding points:", pointsError);
        }
      }
    } catch (error: unknown) {
      console.error("Subscription check error:", error);
      toast.error(language === "ja" ? "サブスクリプション情報の取得に失敗しました" : "Failed to fetch subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanName = (priceId?: string) => {
    if (!priceId) return language === "ja" ? "未登録" : "No Plan";
    
    // Map Stripe price IDs to plan names
    const priceMapping: Record<string, string> = {
      "price_1SR3ZmDqLakc8NxkNdqL5BtO": "founder",
      "price_1SNQoeDqLakc8NxkEUVTTs3k": "monthly",
      "price_1SNQoqDqLakc8NxkOaQIL8wX": "annual",
      "price_1SY2D0DqLakc8NxkMKonyIi8": "muratabros"
    };

    const planType = priceMapping[priceId] || "unknown";
    
    const plans: Record<string, Record<string, string>> = {
      founder: {
        ja: "創設者アクセス (¥980/月)",
        en: "Founder Access (¥980/month)",
        pt: "Acesso Fundador (¥980/mês)"
      },
      monthly: {
        ja: "月額プラン (¥2,900/月)",
        en: "Monthly Plan (¥2,900/month)",
        pt: "Plano Mensal (¥2,900/mês)"
      },
      annual: {
        ja: "年額プラン (¥29,000/年)",
        en: "Annual Plan (¥29,000/year)",
        pt: "Plano Anual (¥29,000/ano)"
      },
      muratabros: {
        ja: "創設者アクセスPro (¥50,000)",
        en: "Founder Access Pro (¥50,000)",
        pt: "Acesso Fundador Pro (¥50,000)"
      }
    };

    return plans[planType]?.[language] || priceId;
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
              <div className="grid md:grid-cols-2 gap-6 mb-6 animate-fade-up">
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
                      {language === "ja" ? "ユーザーID" : language === "pt" ? "ID do usuário" : "User ID"}
                    </p>
                    <p className="font-light text-xs">{user?.id.slice(0, 8)}...</p>
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
                  <div className="flex items-center gap-2">
                    <p className="font-light text-lg">
                      {subscription?.subscribed ? getPlanName(subscription.price_id) : (language === "ja" ? "未登録" : "No Plan")}
                    </p>
                    {subscription?.is_trialing && (
                      <Badge variant="secondary" className="text-xs">
                        {language === "ja" ? "トライアル中" : "Trial"}
                      </Badge>
                    )}
                  </div>
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

          {/* Referral Code and Points Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-up">
            {/* Referral Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light">
                  <User className="h-5 w-5" />
                  {language === "ja" ? "紹介コード" : "Referral Code"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pointsLoading ? (
                  <div className="h-12 bg-muted/50 animate-pulse rounded" />
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "ja" ? "あなたの紹介コード" : "Your Referral Code"}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-muted rounded font-mono text-lg font-bold text-center">
                          {referralCode || "loading..."}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(referralCode);
                            toast.success(language === "ja" ? "コピーしました" : "Copied!");
                          }}
                        >
                          {language === "ja" ? "コピー" : "Copy"}
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        {language === "ja" 
                          ? "友達がこのコードで加入すると、初月無料になります" 
                          : "Friends get first month free with this code"}
                      </p>
                      <p className="text-primary font-medium">
                        {language === "ja" 
                          ? "あなたには毎月500円分のポイントが付与されます" 
                          : "You earn ¥500 points every month"}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Points Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light">
                  <CreditCard className="h-5 w-5" />
                  {language === "ja" ? "ポイント" : "Points"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pointsLoading ? (
                  <div className="h-12 bg-muted/50 animate-pulse rounded" />
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "ja" ? "現在のポイント" : "Current Points"}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-primary">
                          {userPoints.toLocaleString()}
                        </p>
                        <p className="text-lg text-muted-foreground">
                          {language === "ja" ? "円分" : "¥"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        {language === "ja" 
                          ? "ポイントは割引クーポンに交換できます（近日公開予定）" 
                          : "Points can be exchanged for discount coupons (coming soon)"}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Video Upload Section */}
          <div className="mt-12 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-light">
                {language === "ja" ? "あなたの動画" : language === "pt" ? "Seus vídeos" : "Your Videos"}
              </h2>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/video-upload-info")}>
                  {language === "ja" ? "詳細を見る" : language === "pt" ? "Ver detalhes" : "Learn More"}
                </Button>
                <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {language === "ja" ? "動画をアップロード" : language === "pt" ? "Enviar vídeo" : "Upload Video"}
                </Button>
              </div>
            </div>

            {videosLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="h-32 bg-muted/50 animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-muted/50 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-muted/50 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : userVideos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {language === "ja" 
                    ? "まだ動画をアップロードしていません" 
                    : language === "pt" 
                    ? "Você ainda não enviou nenhum vídeo" 
                    : "You haven't uploaded any videos yet"}
                </p>
                <Button onClick={() => setUploadDialogOpen(true)} variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  {language === "ja" ? "最初の動画をアップロード" : language === "pt" ? "Enviar primeiro vídeo" : "Upload First Video"}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {userVideos.map((video) => (
                  <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-medium mb-2 line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{video.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {video.video_type === "match" 
                            ? (language === "ja" ? "試合動画" : "Match") 
                            : video.video_type === "technique"
                            ? (language === "ja" ? "テクニック" : "Technique")
                            : (language === "ja" ? "その他" : "Other")}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{video.view_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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

      <VideoUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) {
            loadUserVideos();
          }
        }} 
      />

      <Footer />
    </div>
  );
};

export default MyPage;
