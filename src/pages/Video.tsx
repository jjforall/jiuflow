import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Eye, Target, Trophy, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { VideoRating } from "@/components/VideoRating";
import { VideoComments } from "@/components/VideoComments";
import { VideoTip } from "@/components/VideoTip";
import { Separator } from "@/components/ui/separator";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission";
  video_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
  thumbnail_url_ja: string | null;
  thumbnail_url_pt: string | null;
  video_metadata?: any;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;
  const navigate = useNavigate();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isStaff, user } = useAuth();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [seriesVideos, setSeriesVideos] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [seriesLetter, setSeriesLetter] = useState<string>("");
  const [viewCount, setViewCount] = useState<number>(0);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const hideUITimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle video playback and UI hiding
  const handleVideoPlay = useCallback(() => {
    setIsVideoPlaying(true);
    
    // Clear any existing timer
    if (hideUITimerRef.current) {
      clearTimeout(hideUITimerRef.current);
    }
    
    // Hide UI after 5 seconds
    hideUITimerRef.current = setTimeout(() => {
      setIsUIVisible(false);
    }, 5000);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (isVideoPlaying) {
      setIsUIVisible(true);
      
      // Clear existing timer
      if (hideUITimerRef.current) {
        clearTimeout(hideUITimerRef.current);
      }
      
      // Hide again after 3 seconds of inactivity
      hideUITimerRef.current = setTimeout(() => {
        setIsUIVisible(false);
      }, 3000);
    }
  }, [isVideoPlaying]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideUITimerRef.current) {
        clearTimeout(hideUITimerRef.current);
      }
    };
  }, []);

  // Check for tip success
  useEffect(() => {
    if (searchParams.get("tip") === "success") {
      toast.success(
        language === "ja" 
          ? "投げ銭ありがとうございます！" 
          : language === "pt" 
          ? "Obrigado pela gorjeta!" 
          : "Thank you for your tip!"
      );
      // Remove query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, language]);

  // Record video view
  const recordVideoView = async (videoId: string, userId: string) => {
    try {
      // Check if view record exists
      const { data: existingView } = await supabase
        .from('video_views')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingView) {
        // Update existing view
        const { error } = await supabase
          .from('video_views')
          .update({
            view_count: existingView.view_count + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', existingView.id);

        if (!error) {
          setViewCount(existingView.view_count + 1);
        }
      } else {
        // Insert new view record
        const { error } = await supabase
          .from('video_views')
          .insert({
            user_id: userId,
            video_id: videoId,
            view_count: 1,
            last_viewed_at: new Date().toISOString()
          });

        if (!error) {
          setViewCount(1);
        }
      }
    } catch (error) {
      console.error('Error recording video view:', error);
    }
  };

  // Load view count for current video
  const loadViewCount = async (videoId: string, userId: string) => {
    try {
      const { data } = await supabase
        .from('video_views')
        .select('view_count')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (data) {
        setViewCount(data.view_count);
      }
    } catch (error) {
      console.error('Error loading view count:', error);
    }
  };

  const loadTechnique = useCallback(async () => {
    if (!id || !user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast.error("Error loading technique", {
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    const techniqueData = data as Technique;
    setTechnique(techniqueData);

    // Load view count first, then record new view
    await loadViewCount(id, user.id);
    await recordVideoView(id, user.id);

    // Get all series to calculate letter index
    if (techniqueData?.series_name) {
      const { data: allSeries } = await supabase
        .from("techniques")
        .select("series_name")
        .not("series_name", "is", null)
        .order("series_name", { ascending: true });

      if (allSeries) {
        const uniqueSeries = [...new Set(allSeries.map(s => s.series_name))].filter(Boolean) as string[];
        const seriesIndex = uniqueSeries.indexOf(techniqueData.series_name);
        if (seriesIndex !== -1) {
          setSeriesLetter(String.fromCharCode(65 + seriesIndex));
        }
      }

      // Load other videos in the same series
      const { data: seriesData } = await supabase
        .from("techniques")
        .select("*")
        .eq("series_name", techniqueData.series_name)
        .neq("id", id)
        .order("series_order", { ascending: true });

      if (seriesData) {
        setSeriesVideos(seriesData as Technique[]);
      }
    }

    setIsLoading(false);
  }, [id, user]);

  useEffect(() => {
    const checkAuthAndLoadTechnique = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login", { 
          state: { from: { pathname: `/video/${id}` } },
          replace: true 
        });
        return;
      }

      setIsCheckingAuth(false);
      
      if (id) {
        loadTechnique();
      }
    };

    checkAuthAndLoadTechnique();
  }, [id, navigate, loadTechnique]);

  const getTechniqueName = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.name_ja;
      case "pt":
        return tech.name_pt;
      default:
        return tech.name;
    }
  };

  const getTechniqueDescription = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.description_ja;
      case "pt":
        return tech.description_pt;
      default:
        return tech.description;
    }
  };

  const getTechniqueVideoUrl = (tech: Technique) => {
    // まずvideo_metadataをチェック
    if (tech.video_metadata) {
      const metadata = tech.video_metadata[language];
      if (metadata?.video_url) {
        return metadata.video_url;
      }
    }
    
    // 従来のフィールドをチェック
    switch (language) {
      case "ja":
        return tech.video_url_ja || tech.video_url;
      case "pt":
        return tech.video_url_pt || tech.video_url;
      default:
        return tech.video_url;
    }
  };
  const getTechniqueThumbnailUrl = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.thumbnail_url_ja || tech.thumbnail_url;
      case "pt":
        return tech.thumbnail_url_pt || tech.thumbnail_url;
      default:
        return tech.thumbnail_url;
    }
  };

  if (isCheckingAuth || isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-32 pb-20 px-6 animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!subscribed && !isAdmin && !isStaff) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Navigation />
        <main className="pt-24 pb-20 px-4 md:px-6">
          <div className="max-w-2xl mx-auto animate-fade-up">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {/* Hero Section */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12 text-center border-b border-border">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  {language === "ja" 
                    ? "100回見て、100回スパーリング" 
                    : language === "pt" 
                    ? "Veja 100 vezes, treine 100 vezes" 
                    : "Watch 100 times, train 100 times"}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  {language === "ja" 
                    ? "このプレミアムコンテンツで技術を徹底的にマスターしましょう。何度も見返すことで、試合で自然に技が出るようになります。" 
                    : language === "pt" 
                    ? "Domine técnicas com conteúdo premium. Repetição leva à perfeição nas competições." 
                    : "Master techniques with premium content. Repetition leads to perfection in competition."}
                </p>
              </div>

              {/* Benefits Section */}
              <div className="p-8 md:p-12 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-medium mb-6 text-center">
                    {language === "ja" 
                      ? "メンバーシップ特典" 
                      : language === "pt" 
                      ? "Benefícios da Assinatura" 
                      : "Membership Benefits"}
                  </h2>
                  <div className="space-y-4">
                    {[
                      { 
                        ja: "全ての技術動画が見放題", 
                        pt: "Acesso ilimitado a todos os vídeos", 
                        en: "Unlimited access to all technique videos" 
                      },
                      { 
                        ja: "視聴回数を記録して進捗管理", 
                        pt: "Rastreie seu progresso com contadores", 
                        en: "Track your progress with view counters" 
                      },
                      { 
                        ja: "いつでもキャンセル可能", 
                        pt: "Cancele a qualquer momento", 
                        en: "Cancel anytime" 
                      },
                      { 
                        ja: "定期的な新コンテンツ追加", 
                        pt: "Novos conteúdos regularmente", 
                        en: "Regular new content updates" 
                      }
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <p className="text-muted-foreground">
                          {language === "ja" ? benefit.ja : language === "pt" ? benefit.pt : benefit.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={() => navigate("/join")}
                    size="lg"
                    className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
                  >
                    {language === "ja" 
                      ? "今すぐ始める" 
                      : language === "pt" 
                      ? "Começar Agora" 
                      : "Start Now"}
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => navigate("/map")}
                    className="w-full"
                  >
                    {t.video.backToMap}
                  </Button>
                </div>

                {/* Trust Badge */}
                <p className="text-center text-sm text-muted-foreground pt-4">
                  {language === "ja" 
                    ? "✓ 1ヶ月の無料トライアル付き" 
                    : language === "pt" 
                    ? "✓ Teste grátis de 1 mês incluído" 
                    : "✓ 1-month free trial included"}
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!technique) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-32 text-center">
          <h1 className="text-4xl font-light mb-4">{t.video.notFound}</h1>
          <Link to="/map">
            <Button variant="outline">{t.video.backToMap}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" onMouseMove={handleMouseMove} onTouchStart={handleMouseMove}>
      <div 
        className={`transition-all duration-500 ${
          isUIVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <Navigation />
      </div>
      
      <main className={`transition-all duration-300 ${isUIVisible ? 'pt-24' : 'pt-0'} pb-20`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Video Section */}
            <div className="flex-1">
              {/* Video Player */}
              <div className="w-full bg-muted rounded-lg overflow-hidden">
                {getTechniqueVideoUrl(technique) ? (
                  <VideoPlayer 
                    videoUrl={getTechniqueVideoUrl(technique)!} 
                    thumbnailUrl={getTechniqueThumbnailUrl(technique)}
                    autoPlay 
                    onPlay={handleVideoPlay}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-6xl mb-4">▶</div>
                      <div className="text-sm">
                        {language === "ja" ? "動画なし" : language === "pt" ? "Sem vídeo" : "No video"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Technique Info */}
              <div className="mt-6 animate-fade-up space-y-4">
                <div className="flex flex-col gap-3">
                  <h1 className="text-3xl md:text-4xl font-light">{getTechniqueName(technique)}</h1>
                  <span className="inline-block px-3 py-1 text-xs border border-border w-fit">
                    {technique.category}
                  </span>
                </div>

                {/* View Counter Card */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <div className="space-y-4">
                    {/* Main Counter Display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          {viewCount >= 100 ? (
                            <Trophy className="w-6 h-6 text-primary animate-pulse" />
                          ) : viewCount >= 10 ? (
                            <Flame className="w-6 h-6 text-primary" />
                          ) : (
                            <Target className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-3xl font-light text-primary">
                            {viewCount}
                            <span className="text-lg text-muted-foreground ml-2">
                              {language === "ja" ? "回" : language === "pt" ? "x" : "times"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {language === "ja" 
                              ? "繰り返し見て習得" 
                              : language === "pt" 
                              ? "Repetir para dominar" 
                              : "Repeat to master"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">
                          {language === "ja" ? "目標" : language === "pt" ? "Meta" : "Goal"}
                        </div>
                        <div className="text-2xl font-light">
                          100<span className="text-sm text-muted-foreground ml-1">
                            {language === "ja" ? "回" : language === "pt" ? "x" : "times"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={Math.min((viewCount / 100) * 100, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {language === "ja" 
                            ? `あと${Math.max(0, 100 - viewCount)}回` 
                            : language === "pt" 
                            ? `Faltam ${Math.max(0, 100 - viewCount)}` 
                            : `${Math.max(0, 100 - viewCount)} more`}
                        </span>
                        <span>{Math.min(Math.round((viewCount / 100) * 100), 100)}%</span>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="flex gap-2 flex-wrap">
                      {[10, 50, 100].map((milestone) => (
                        <Badge
                          key={milestone}
                          variant={viewCount >= milestone ? "default" : "outline"}
                          className={viewCount >= milestone ? "animate-scale-in" : ""}
                        >
                          {viewCount >= milestone && "✓ "}
                          {milestone}
                          {language === "ja" ? "回" : language === "pt" ? "x" : "x"}
                        </Badge>
                      ))}
                    </div>

                    {/* Motivational Message */}
                    {viewCount >= 100 && (
                      <div className="text-center p-3 bg-primary/10 rounded-lg animate-fade-in">
                        <p className="text-sm font-medium text-primary">
                          {language === "ja" 
                            ? "🎉 100回達成！マスターレベル！" 
                            : language === "pt" 
                            ? "🎉 100x alcançado! Nível Master!" 
                            : "🎉 100 views! Master level!"}
                        </p>
                      </div>
                    )}
                    {viewCount >= 10 && viewCount < 100 && (
                      <div className="text-center p-3 bg-accent/10 rounded-lg animate-fade-in">
                        <p className="text-sm text-muted-foreground">
                          {language === "ja" 
                            ? "🔥 いい調子！継続は力なり" 
                            : language === "pt" 
                            ? "🔥 Ótimo ritmo! Continue assim" 
                            : "🔥 Great pace! Keep it up"}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {getTechniqueDescription(technique) && (
                <div className="mt-6 animate-fade-up">
                  <p className="text-base font-light text-muted-foreground leading-relaxed">
                    {getTechniqueDescription(technique)}
                  </p>
                </div>
              )}

              {technique.hashtags && technique.hashtags.length > 0 && (
                <div className="mt-6 animate-fade-up flex flex-wrap gap-2">
                  {technique.hashtags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/map?hashtag=${encodeURIComponent(tag)}`}
                      className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Rating, Comments, and Tip Section */}
              <div className="mt-12 space-y-8">
                <Separator />
                
                {/* Rating and Tip */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">
                      {language === "ja" ? "この動画を評価" : language === "pt" ? "Avaliar vídeo" : "Rate this video"}
                    </h3>
                    {user && <VideoRating videoId={id!} userId={user.id} />}
                  </div>
                  {user && <VideoTip videoId={id!} />}
                </div>

                <Separator />

                {/* Comments */}
                {user && <VideoComments videoId={id!} userId={user.id} />}
              </div>

              <div className="mt-8">
                <Link to="/map">
                  <Button variant="outline" size="lg">
                    {t.video.backToMap}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Series Videos Sidebar */}
            {seriesVideos.length > 0 && (
              <div className="lg:w-[400px] xl:w-[420px]">
                <div className="sticky top-24">
                  <h2 className="text-lg font-medium mb-4 px-2">
                    {language === "ja" 
                      ? `${seriesLetter}. ${technique.series_name}シリーズ` 
                      : language === "pt" 
                      ? `${seriesLetter}. Série ${technique.series_name}` 
                      : `${seriesLetter}. ${technique.series_name} Series`}
                  </h2>
                  <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin">
                    {seriesVideos.map((video) => (
                      <Link
                        key={video.id}
                        to={`/video/${video.id}`}
                        className="block group"
                      >
                         <div className="flex gap-3 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                          <div className="flex-shrink-0 w-40 h-24 relative">
                            <VideoThumbnail
                              videoUrl={getTechniqueVideoUrl(video)}
                              className="w-full h-full object-cover rounded"
                              showPlayButton
                            />
                            {video.series_order && seriesLetter && (
                              <div className="absolute top-1 left-1 bg-background/90 text-foreground text-xs font-semibold px-2 py-0.5 rounded">
                                {seriesLetter}-{video.series_order}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {getTechniqueName(video)}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {video.category}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
       </main>
      
      <div 
        className={`transition-all duration-500 ${
          isUIVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <Footer />
      </div>
    </div>
  );
};

export default Video;
