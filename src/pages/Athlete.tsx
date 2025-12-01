import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Star, MapPin, Trophy, Edit, Instagram, Twitter, Youtube, Globe, Languages, User, UserMinus, UserPlus, Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { UserVideoCard } from "@/components/UserVideoCard";
import { LineageTree } from "@/components/LineageTree";
import { CelebrityEditRequestDialog } from "@/components/CelebrityEditRequestDialog";
import { CelebrityAvatarUploadDialog } from "@/components/CelebrityAvatarUploadDialog";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import hero6 from "@/assets/hero-6.jpg";
import hero7 from "@/assets/hero-7.jpg";
import hero8 from "@/assets/hero-8.jpg";
import hero9 from "@/assets/hero-9.jpg";
import hero10 from "@/assets/hero-10.jpg";

const DEFAULT_COVER_IMAGES = [
  hero1, hero2, hero3, hero4, hero5, 
  hero6, hero7, hero8, hero9, hero10
];

const getCoverImageUrl = (coverUrl: string | null, userId: string | null): string => {
  if (coverUrl && coverUrl.startsWith("default-")) {
    const index = parseInt(coverUrl.replace("default-", ""));
    if (!isNaN(index) && index >= 0 && index < DEFAULT_COVER_IMAGES.length) {
      return DEFAULT_COVER_IMAGES[index];
    }
  }
  
  if (coverUrl && !coverUrl.startsWith("default-")) {
    return coverUrl;
  }
  
  if (!userId) return DEFAULT_COVER_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % DEFAULT_COVER_IMAGES.length;
  return DEFAULT_COVER_IMAGES[index];
};

interface Celebrity {
  id: string;
  user_id: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  belt_history: any;
  titles: any;
  home_dojo: string | null;
  featured: boolean;
  sort_order: number;
  slug: string | null;
  organization: {
    name: string;
    name_ja: string;
    name_pt: string;
  } | null;
  social_links: any;
  stats: any;
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
  user_id: string;
}

const Athlete = () => {
  const { slugOrUsername } = useParams<{ slugOrUsername: string }>();
  const { language } = useLanguage();
  const { translateText } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [purchasedVideos, setPurchasedVideos] = useState<Set<string>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = useState(false);

  useEffect(() => {
    loadCelebrity();
  }, [slugOrUsername]);

  useEffect(() => {
    if (celebrity && user?.id) {
      loadFollowStatus();
    }
    if (celebrity) {
      loadFollowCounts();
      if (celebrity.user_id) {
        loadUserVideos(celebrity.user_id);
      }
    }
  }, [celebrity, user?.id]);

  useEffect(() => {
    const loadPurchases = async () => {
      if (user?.id) {
        const { data: purchases } = await supabase
          .from('video_purchases')
          .select('video_id')
          .eq('buyer_id', user.id);
        
        if (purchases) {
          setPurchasedVideos(new Set(purchases.map(p => p.video_id)));
        }
      }
    };
    loadPurchases();
  }, [user?.id]);

  const loadCelebrity = async () => {
    if (!slugOrUsername) return;
    
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from('celebrities')
        .select('*, organization:organizations(name, name_ja, name_pt)')
        .eq('slug', slugOrUsername)
        .maybeSingle();

      if (!data && !error) {
        const result = await supabase
          .from('celebrities')
          .select('*, organization:organizations(name, name_ja, name_pt)')
          .eq('user_id', slugOrUsername)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (!data && !error) {
        const result = await supabase
          .from('celebrities')
          .select('*, organization:organizations(name, name_ja, name_pt)')
          .eq('id', slugOrUsername)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      if (data) {
        setCelebrity(data);
        setIsOwner(user?.id === data.user_id);
      }
    } catch (error) {
      console.error('Error loading celebrity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserVideos = async (userId: string) => {
    if (!userId) return;

    try {
      let query = supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', userId);

      if (user?.id !== userId) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const loadFollowStatus = async () => {
    if (!user?.id) return;

    try {
      // Check if this is a celebrity (has celebrity.id)
      if (celebrity?.id && !celebrity?.user_id) {
        // Celebrity-specific follow check
        const { data } = await supabase
          .from('celebrity_follows')
          .select('id')
          .eq('user_id', user.id)
          .eq('celebrity_id', celebrity.id)
          .maybeSingle();

        setIsFollowing(!!data);
      } else if (celebrity?.user_id) {
        // Regular user follow check
        const { data } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', celebrity.user_id)
          .maybeSingle();

        setIsFollowing(!!data);
      }
    } catch (error) {
      console.error('Error loading follow status:', error);
    }
  };

  const loadFollowCounts = async () => {
    try {
      // Check if this is a celebrity
      if (celebrity?.id && !celebrity?.user_id) {
        // Celebrity followers count
        const { count: followers } = await supabase
          .from('celebrity_follows')
          .select('*', { count: 'exact', head: true })
          .eq('celebrity_id', celebrity.id);

        setFollowersCount(followers || 0);
        setFollowingCount(0); // Celebrities don't have "following" count
      } else if (celebrity?.user_id) {
        // Regular user follow counts
        const { count: followers } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', celebrity.user_id);

        const { count: following } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', celebrity.user_id);

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);
      }
    } catch (error) {
      console.error('Error loading follow counts:', error);
    }
  };

  const handleFollow = async () => {
    if (!user?.id) {
      toast.error(language === "ja" ? "フォローするにはログインが必要です" : language === "pt" ? "Faça login para seguir" : "Login required to follow");
      return;
    }

    try {
      // Check if this is a celebrity
      if (celebrity?.id && !celebrity?.user_id) {
        // Follow celebrity
        const { error } = await supabase
          .from('celebrity_follows')
          .insert({
            user_id: user.id,
            celebrity_id: celebrity.id
          });

        if (error) throw error;
      } else if (celebrity?.user_id) {
        // Follow regular user
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: celebrity.user_id
          });

        if (error) throw error;
      }

      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success(language === "ja" ? "フォローしました" : language === "pt" ? "Seguindo" : "Following");
    } catch (error: any) {
      console.error('Follow error:', error);
      if (error?.code === '23505') {
        toast.error(language === "ja" ? "既にフォロー済みです" : language === "pt" ? "Já seguindo" : "Already following");
      } else {
        toast.error(language === "ja" ? "フォローに失敗しました" : language === "pt" ? "Falha ao seguir" : "Failed to follow");
      }
    }
  };

  const handleUnfollow = async () => {
    if (!user?.id) return;

    try {
      // Check if this is a celebrity
      if (celebrity?.id && !celebrity?.user_id) {
        // Unfollow celebrity
        const { error } = await supabase
          .from('celebrity_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('celebrity_id', celebrity.id);

        if (error) throw error;
      } else if (celebrity?.user_id) {
        // Unfollow regular user
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', celebrity.user_id);

        if (error) throw error;
      }

      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      toast.success(language === "ja" ? "フォロー解除しました" : language === "pt" ? "Deixou de seguir" : "Unfollowed");
    } catch (error) {
      console.error('Unfollow error:', error);
      toast.error(language === "ja" ? "フォロー解除に失敗しました" : language === "pt" ? "Falha ao deixar de seguir" : "Failed to unfollow");
    }
  };

  const handleTranslateBio = async () => {
    if (!celebrity?.bio || isTranslating) return;
    
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(celebrity.bio, 'en');
      setTranslatedBio(translated);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePurchase = async (videoId: string) => {
    if (!user) {
      toast.error(language === "ja" ? "動画を購入するにはログインが必要です" : language === "pt" ? "Faça login para comprar" : "Login required to purchase");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-video-purchase', {
        body: { videoId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(language === "ja" ? "購入処理に失敗しました" : language === "pt" ? "Falha na compra" : "Purchase failed");
    }
  };

  const getBeltName = (beltHistory: any[]) => {
    if (!beltHistory || beltHistory.length === 0) return null;
    const latestBelt = beltHistory[beltHistory.length - 1];
    return latestBelt?.belt;
  };

  const getOrganizationName = (org: Celebrity['organization']) => {
    if (!org) return null;
    switch (language) {
      case 'ja': return org.name_ja;
      case 'pt': return org.name_pt;
      default: return org.name;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">
              {language === "ja" ? "選手が見つかりません" : language === "pt" ? "Atleta não encontrado" : "Athlete not found"}
            </h2>
            <Button asChild>
              <Link to="/athletes">
                {language === "ja" ? "選手一覧に戻る" : language === "pt" ? "Voltar para atletas" : "Back to Athletes"}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentBelt = getBeltName(celebrity.belt_history);
  const orgName = getOrganizationName(celebrity.organization);
  const coverImageUrl = getCoverImageUrl(null, celebrity.id);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-16 md:pt-20 pb-16">
        {/* Cover Image */}
        <div className="relative h-40 sm:h-56 md:h-72 lg:h-80 w-full overflow-hidden">
          <img 
            src={coverImageUrl}
            alt="Cover" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 -mt-12 sm:-mt-16 md:-mt-20 relative z-10">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex flex-col items-center justify-center sm:justify-start gap-2">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
                  <AvatarImage src={celebrity.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl sm:text-4xl md:text-5xl bg-primary/10">
                    {celebrity.display_name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAvatarUploadOpen(true)}
                  className="gap-2 text-xs"
                >
                  <Camera className="h-3 w-3" />
                  画像変更
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3 sm:space-y-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight">
                      {celebrity.display_name}
                    </h1>
                    {celebrity.featured && (
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
                    {currentBelt && <BeltBadge belt={currentBelt} />}
                    {orgName && (
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {orgName}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{followersCount} {language === "ja" ? "フォロワー" : language === "pt" ? "Seguidores" : "Followers"}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{followingCount} {language === "ja" ? "フォロー中" : language === "pt" ? "Seguindo" : "Following"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center sm:justify-start gap-2">
                  {isOwner ? (
                    <>
                      {celebrity.user_id ? (
                        <Button onClick={() => navigate('/mypage')} className="gap-2">
                          <Edit className="h-4 w-4" />
                          {language === "ja" ? "編集" : language === "pt" ? "Editar" : "Edit"}
                        </Button>
                      ) : (
                        <Button onClick={() => setIsEditDialogOpen(true)} className="gap-2">
                          <Edit className="h-4 w-4" />
                          {language === "ja" ? "編集リクエスト" : language === "pt" ? "Solicitar Edição" : "Request Edit"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className="gap-2"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          {language === "ja" ? "フォロー解除" : language === "pt" ? "Deixar de seguir" : "Unfollow"}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          {language === "ja" ? "フォロー" : language === "pt" ? "Seguir" : "Follow"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {celebrity.bio && (
                <Card className="mt-4">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-sm sm:text-base text-muted-foreground">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl sm:text-2xl font-bold mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg sm:text-xl font-bold mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base sm:text-lg font-semibold mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="ml-2" {...props} />,
                          a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-3" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline 
                              ? <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props} />
                              : <code className="block bg-muted p-3 rounded my-2 overflow-x-auto text-sm" {...props} />
                        }}
                      >
                        {translatedBio || celebrity.bio}
                      </ReactMarkdown>
                    </div>
                    {language !== 'en' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTranslateBio}
                        disabled={isTranslating}
                        className="mt-3"
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {isTranslating 
                          ? (language === 'ja' ? '翻訳中...' : 'Traduzindo...') 
                          : translatedBio
                          ? (language === 'ja' ? '原文を表示' : 'Mostrar original')
                          : (language === 'ja' ? '英語に翻訳' : 'Traduzir para inglês')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {/* Left Column - Info Cards */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              {celebrity.home_dojo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                      {language === "ja" ? "所属道場" : language === "pt" ? "Academia" : "Home Gym"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base">{celebrity.home_dojo}</p>
                  </CardContent>
                </Card>
              )}

              {celebrity.titles && celebrity.titles.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                      {language === "ja" ? "タイトル" : language === "pt" ? "Títulos" : "Titles"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {celebrity.titles.map((title: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span className="text-xs sm:text-sm leading-relaxed">{title.title || title}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {celebrity.belt_history && celebrity.belt_history.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {language === "ja" ? "帯の履歴" : language === "pt" ? "Histórico de Faixas" : "Belt History"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {celebrity.belt_history.map((item: any, index: number) => (
                        <div key={index} className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <BeltBadge belt={item.belt} />
                          {item.date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.date).getFullYear()}
                            </span>
                          )}
                          {item.instructor && (
                            <span className="text-xs text-muted-foreground break-words">
                              {item.instructor}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {celebrity.social_links && Object.keys(celebrity.social_links).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {language === "ja" ? "ソーシャルメディア" : language === "pt" ? "Redes Sociais" : "Social Media"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
...
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lineage Tree */}
              <LineageTree celebrityId={celebrity.id} />
            </div>

            {/* Right Column - Videos */}
            <div className="lg:col-span-2">
              {videos.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {language === "ja" ? "投稿動画" : language === "pt" ? "Vídeos" : "Videos"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                      {videos.map((video) => (
                        <UserVideoCard
                          key={video.id}
                          video={video}
                          onPurchase={handlePurchase}
                          isPurchased={purchasedVideos.has(video.id)}
                          isOwner={isOwner}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {celebrity && (
        <>
          <CelebrityEditRequestDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            celebrity={celebrity}
          />
          <CelebrityAvatarUploadDialog
            open={isAvatarUploadOpen}
            onOpenChange={setIsAvatarUploadOpen}
            celebrityId={celebrity.id}
            isAdmin={isAdmin}
            onUploadComplete={() => {
              loadCelebrity();
            }}
          />
        </>
      )}

      <Footer />
    </div>
  );
};

export default Athlete;
