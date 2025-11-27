import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";

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
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const navigate = useNavigate();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isStaff } = useAuth();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [seriesVideos, setSeriesVideos] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [seriesLetter, setSeriesLetter] = useState<string>("");

  useEffect(() => {
    const checkAuthAndLoadTechnique = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login page if not authenticated
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
  }, [id, navigate]);

  const loadTechnique = useCallback(async () => {
    if (!id) return;
    
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
          setSeriesLetter(String.fromCharCode(65 + seriesIndex)); // A, B, C, ...
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
  }, [id]);

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
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-32 pb-20 px-6">
          <div className="max-w-md mx-auto text-center animate-fade-up">
            <div className="bg-muted/50 border border-border p-8 rounded-lg">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-light mb-4">
                {language === "ja" 
                  ? "プレミアムコンテンツ" 
                  : language === "pt" 
                  ? "Conteúdo Premium" 
                  : "Premium Content"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {language === "ja" 
                  ? "この動画を視聴するには、サブスクリプションへの登録が必要です。" 
                  : language === "pt" 
                  ? "Para assistir este vídeo, você precisa de uma assinatura ativa." 
                  : "To watch this video, you need an active subscription."}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/join")}
                  size="lg"
                  className="w-full"
                >
                  {language === "ja" 
                    ? "プランを見る" 
                    : language === "pt" 
                    ? "Ver Planos" 
                    : "View Plans"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/map")}
                  className="w-full"
                >
                  {t.video.backToMap}
                </Button>
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
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Video Section */}
            <div className="flex-1">
              {/* Video Player */}
              <div className="w-full bg-muted rounded-lg overflow-hidden">
                {technique.video_url ? (
                  <VideoPlayer videoUrl={technique.video_url} autoPlay />
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
              <div className="mt-6 animate-fade-up">
                <h1 className="text-3xl md:text-4xl font-light mb-2">{getTechniqueName(technique)}</h1>
                <span className="inline-block px-3 py-1 text-xs border border-border">
                  {technique.category}
                </span>
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
                              videoUrl={video.video_url || ""}
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
      <Footer />
    </div>
  );
};

export default Video;
