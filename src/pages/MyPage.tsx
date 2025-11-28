import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, CreditCard, Calendar, Mail, Upload, Video, Eye, Edit2, Check, X, Trash2, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { VideoEditDialog } from "@/components/VideoEditDialog";
import { UserVideoCard } from "@/components/UserVideoCard";
import { Badge } from "@/components/ui/badge";
import { UserProfileEditDialog } from "@/components/UserProfileEditDialog";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  price: number;
  is_public: boolean;
  created_at: string;
}

interface Profile {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  education: Array<{school: string; degree?: string; period?: string}> | null;
  work_experience: Array<{company: string; position: string; period?: string; description?: string}> | null;
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
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [editingVideo, setEditingVideo] = useState<UserVideo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

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
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, username, education, work_experience')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        ...data,
        education: (data.education as any) || [],
        work_experience: (data.work_experience as any) || []
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadReferralCodeAndPoints = async () => {
    if (!user) return;
    
    setPointsLoading(true);
    try {
      // Load referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (codeError) {
        console.error('Error loading referral code:', codeError);
      }

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
      } else {
        // Generate new referral code if none exists
        const newCode = generateReferralCode();
        const { error: insertError } = await supabase
          .from('referral_codes')
          .insert({
            user_id: user.id,
            code: newCode,
          });

        if (!insertError) {
          setReferralCode(newCode);
          
          // Create Stripe coupon for the new code
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('create-referral-coupon', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
          }
        }
      }

      // Load points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pointsError) {
        console.error('Error loading points:', pointsError);
      }
      
      setUserPoints(pointsData?.points || 0);
      
      // Initialize points if not exists
      if (!pointsData) {
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: 0,
          });
      }
    } catch (error) {
      console.error('Error loading referral code and points:', error);
    } finally {
      setPointsLoading(false);
    }
  };

  const generateReferralCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleEditVideo = (video: UserVideo) => {
    setEditingVideo(video);
    setEditDialogOpen(true);
  };

  const handleDeleteVideo = (videoId: string) => {
    setDeletingVideoId(videoId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVideo = async () => {
    if (!deletingVideoId) return;

    try {
      const { error } = await supabase
        .from('user_videos')
        .delete()
        .eq('id', deletingVideoId);

      if (error) throw error;

      toast.success(language === "ja" ? "動画を削除しました" : "Video deleted");
      loadUserVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingVideoId(null);
    }
  };

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/user/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success(language === "ja" ? "プロフィールURLをコピーしました" : "Profile URL copied");
  };

  const updateReferralCode = async (newCode: string) => {
    if (!user) return;
    
    const trimmedCode = newCode.trim().toUpperCase();
    if (trimmedCode.length < 4 || trimmedCode.length > 12) {
      toast.error(language === "ja" ? "コードは4〜12文字で入力してください" : "Code must be 4-12 characters");
      return;
    }

    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      toast.error(language === "ja" ? "英数字のみ使用できます" : "Only alphanumeric characters allowed");
      return;
    }

    try {
      // Check if code is already taken
      const { data: existingCode } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', trimmedCode)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingCode) {
        toast.error(language === "ja" ? "このコードは既に使用されています" : "This code is already taken");
        return;
      }

      // Update the code
      const { error } = await supabase
        .from('referral_codes')
        .update({ code: trimmedCode })
        .eq('user_id', user.id);

      if (error) throw error;

      setReferralCode(trimmedCode);
      toast.success(language === "ja" ? "紹介コードを更新しました" : "Referral code updated");

      // Create Stripe coupon for the new code
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('create-referral-coupon', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error updating referral code:', error);
      toast.error(language === "ja" ? "コードの更新に失敗しました" : "Failed to update code");
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
    // サブスク中だが price_id が取れていないケースでは「未登録」ではなく「有効なプラン」と表示
    if (!priceId) {
      return language === "ja"
        ? "有効なプラン"
        : language === "pt"
          ? "Plano ativo"
          : "Active Plan";
    }
    
    // Map Stripe price IDs to plan names
    const priceMapping: Record<string, string> = {
      "price_1SR3ZmDqLakc8NxkNdqL5BtO": "founder",
      "price_1SNQoeDqLakc8NxkEUVTTs3k": "monthly",
      "price_1SNQoqDqLakc8NxkOaQIL8wX": "annual",
      "price_1SY2D0DqLakc8NxkMKonyIi8": "muratabros",
      "price_1SYK2lDqLakc8Nxkp6TBKYhT": "referral"
    };

    const planType = priceMapping[priceId] || "unknown";
    
    const plans: Record<string, Record<string, string>> = {
      founder: {
        ja: "Founder Plan (¥980/月)",
        en: "Founder Plan (¥980/month)",
        pt: "Founder Plan (¥980/mês)"
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
        ja: "Founder Plan Pro (¥50,000)",
        en: "Founder Plan Pro (¥50,000)",
        pt: "Founder Plan Pro (¥50,000)"
      },
      referral: {
        ja: "紹介プラン (¥1,900/月)",
        en: "Referral Plan (¥1,900/month)",
        pt: "Plano de Referência (¥1,900/mês)"
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
              {/* Profile Preview Card - Public */}
              <Card className="mb-6 animate-fade-up">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-light">
                      <Globe className="h-5 w-5 text-green-600" />
                      {language === "ja" ? "公開プロフィール" : "Public Profile"}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="w-3 h-3" />
                        {language === "ja" ? "公開" : "Public"}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/user/${user?.id}`)}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {language === "ja" ? "公開ページを見る" : "View Public Page"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setProfileDialogOpen(true)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile?.display_name?.[0] || profile?.username?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-light mb-2">
                        {profile?.display_name || profile?.username || user?.email?.split('@')[0] || "ユーザー"}
                      </h2>
                      {profile?.bio && (
                        <p className="text-muted-foreground mb-4">{profile.bio}</p>
                      )}
                      
                      {/* Education Section */}
                      {profile?.education && profile.education.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold mb-2">学歴</h3>
                          <ul className="space-y-1">
                            {profile.education.map((edu, index) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {edu.school}
                                {edu.degree && ` - ${edu.degree}`}
                                {edu.period && ` (${edu.period})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Work Experience Section */}
                      {profile?.work_experience && profile.work_experience.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold mb-2">職歴</h3>
                          <ul className="space-y-2">
                            {profile.work_experience.map((work, index) => (
                              <li key={index} className="text-sm">
                                <div className="font-medium">{work.company} - {work.position}</div>
                                {work.period && (
                                  <div className="text-muted-foreground text-xs">{work.period}</div>
                                )}
                                {work.description && (
                                  <div className="text-muted-foreground mt-1">{work.description}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">
                        <Video className="inline h-4 w-4 mr-1" />
                        動画 {userVideos.length}件
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 mb-6 animate-fade-up">
            {/* Private Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-600" />
                    {language === "ja" ? "非公開情報" : "Private Information"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
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
                      {language === "ja" ? "ユーザーID" : "User ID"}
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
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {language === "ja" ? "紹介コード" : "Referral Code"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
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
                      {isEditingCode ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedCode}
                            onChange={(e) => setEditedCode(e.target.value.toUpperCase())}
                            placeholder={language === "ja" ? "新しいコード" : "New code"}
                            maxLength={12}
                            className="flex-1 font-mono text-lg font-bold text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateReferralCode(editedCode);
                              setIsEditingCode(false);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingCode(false);
                              setEditedCode(referralCode);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 bg-muted rounded font-mono text-lg font-bold text-center">
                            {referralCode || "loading..."}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditedCode(referralCode);
                              setIsEditingCode(true);
                            }}
                            disabled={!referralCode}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(referralCode);
                              toast.success(language === "ja" ? "コピーしました" : "Copied!");
                            }}
                            disabled={!referralCode}
                          >
                            {language === "ja" ? "コピー" : "Copy"}
                          </Button>
                        </div>
                      )}
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
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {language === "ja" ? "ポイント" : "Points"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
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
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-light">
                    {language === "ja" ? "あなたの動画" : language === "pt" ? "Seus vídeos" : "Your Videos"}
                  </h2>
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="w-3 h-3" />
                    {language === "ja" ? "公開/非公開設定可能" : "Public/Private"}
                  </Badge>
                </div>
                <Button variant="link" onClick={copyProfileUrl} className="px-0 h-auto">
                  {language === "ja" ? "プロフィールページを共有" : "Share your profile"}
                </Button>
              </div>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4 border border-border rounded-lg p-6 animate-pulse">
                    <div className="aspect-video bg-muted rounded" />
                    <div className="h-6 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userVideos.map((video) => (
                  <UserVideoCard
                    key={video.id}
                    video={video}
                    onEdit={handleEditVideo}
                    onDelete={handleDeleteVideo}
                    isOwner={true}
                  />
                ))}
              </div>
            )}
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

      <VideoEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        video={editingVideo}
        onSuccess={loadUserVideos}
      />

      {user && (
        <UserProfileEditDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          userId={user.id}
          onSuccess={() => {
            loadProfile();
            toast.success(language === "ja" ? "プロフィールを更新しました" : "Profile updated");
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ja" ? "動画を削除しますか？" : "Delete video?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ja" 
                ? "この操作は取り消せません。本当に削除しますか？" 
                : "This action cannot be undone. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "ja" ? "キャンセル" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVideo}>
              {language === "ja" ? "削除" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default MyPage;
