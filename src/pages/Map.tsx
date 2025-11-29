import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, Upload, X, ChevronDown, Eye, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import mapBackground from "@/assets/map-background.jpg";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission" | "combat-base";
  video_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  thumbnail_url: string | null;
  thumbnail_url_ja: string | null;
  thumbnail_url_pt: string | null;
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  video_metadata?: any;
}

interface CategoryTechniques {
  [category: string]: {
    [seriesName: string]: Technique[];
  };
}

const Map = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hashtagFilter = searchParams.get('hashtag');
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, user } = useAuth();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [categoryTechniques, setCategoryTechniques] = useState<CategoryTechniques>({});
  const [videoViews, setVideoViews] = useState<Record<string, number>>({});
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;


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

  // Generate series letter (A, B, C, ...) based on series position
  const getSeriesLetter = (seriesNames: string[], seriesName: string) => {
    const index = seriesNames.indexOf(seriesName);
    if (index === -1) return "";
    return String.fromCharCode(65 + index); // 65 is 'A' in ASCII
  };

  const categoryLabels: Record<string, { en: string; ja: string; pt: string }> = {
    pull: { en: "Pull", ja: "引き込み", pt: "Puxada" },
    "combat-base": { en: "Combat Base", ja: "コンバットベース", pt: "Base de Combate" },
    control: { en: "Control", ja: "コントロール", pt: "Controle" },
    submission: { en: "Submission", ja: "極め技", pt: "Finalização" },
  };

  const getCategoryLabel = (category: string) => {
    const labels = categoryLabels[category];
    if (!labels) return category;
    
    switch (language) {
      case "ja":
        return labels.ja;
      case "pt":
        return labels.pt;
      default:
        return labels.en;
    }
  };

  const categoryColors: Record<string, string> = {
    pull: "bg-blue-500/10 border-blue-500",
    "combat-base": "bg-orange-500/10 border-orange-500",
    control: "bg-green-500/10 border-green-500",
    submission: "bg-red-500/10 border-red-500",
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsCheckingAuth(false);
      
      if (!session && !isAdmin) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate, isAdmin]);

  // Fetch and group techniques
  const fetchTechniques = useCallback(async (pageNum: number) => {
    if (pageNum === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("*")
        .order("series_name", { ascending: true, nullsFirst: false })
        .order("series_order", { ascending: true, nullsFirst: false })
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data) {
        let filteredData = data as Technique[];
        
        // Filter by hashtag if specified
        if (hashtagFilter) {
          filteredData = filteredData.filter(tech => 
            tech.hashtags && tech.hashtags.includes(hashtagFilter)
          );
        }
        
        // Group techniques by category first, then by series
        const categoryGroups: CategoryTechniques = {};
        filteredData.forEach(tech => {
          const category = tech.category || "other";
          const seriesName = tech.series_name || "その他の技";
          
          if (!categoryGroups[category]) {
            categoryGroups[category] = {};
          }
          if (!categoryGroups[category][seriesName]) {
            categoryGroups[category][seriesName] = [];
          }
          categoryGroups[category][seriesName].push(tech);
        });
        
        setTechniques(filteredData);
        setCategoryTechniques(categoryGroups);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching techniques:", error);
      toast.error(
        language === "ja" 
          ? "技の読み込みに失敗しました" 
          : "Failed to load techniques"
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [language, hashtagFilter]);

  // Fetch video views for the logged-in user
  const fetchVideoViews = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("video_views")
        .select("video_id, view_count")
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      if (data) {
        const viewsMap: Record<string, number> = {};
        data.forEach(view => {
          viewsMap[view.video_id] = view.view_count;
        });
        setVideoViews(viewsMap);
      }
    } catch (error) {
      console.error("Error fetching video views:", error);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!isCheckingAuth && user) {
      fetchTechniques(0);
      fetchVideoViews();
    }
  }, [isCheckingAuth, user, fetchTechniques, fetchVideoViews]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchTechniques(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, fetchTechniques]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${mapBackground})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95" />
      </div>

      <Navigation />
      
      <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1800px] mx-auto">
          <div className="mb-8 md:mb-12 animate-fade-up">
            {hashtagFilter ? (
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-light tracking-tight">
                  #{hashtagFilter}
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-lg md:text-xl text-muted-foreground">
                    {language === "ja" 
                      ? `${techniques.length}本の動画` 
                      : language === "pt" 
                      ? `${techniques.length} vídeos` 
                      : `${techniques.length} videos`}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchParams({})}
                    className="gap-2 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                    {language === "ja" 
                      ? "フィルタをクリア" 
                      : language === "pt" 
                      ? "Limpar filtro" 
                      : "Clear filter"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{t.map.title}</h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  {t.map.subtitle}
                </p>
              </>
            )}
          </div>

          {isCheckingAuth || isLoading || subscriptionLoading ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-video w-full bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : !user ? (
            <div className="text-center py-12 animate-fade-up">
              <div className="max-w-2xl mx-auto space-y-8">
                {/* Main Lock Card */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 p-12 rounded-2xl shadow-xl">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="p-6 bg-primary/10 rounded-full">
                        <Lock className="w-16 h-16 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        {language === "ja" 
                          ? "プレミアム限定コンテンツ" 
                          : language === "pt" 
                          ? "Conteúdo Exclusivo Premium" 
                          : "Premium Exclusive Content"}
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        {language === "ja" 
                          ? "200以上の技術動画にアクセスして、あなたの柔術を次のレベルへ" 
                          : language === "pt" 
                          ? "Acesse mais de 200 vídeos técnicos e leve seu Jiu-Jitsu ao próximo nível" 
                          : "Access 200+ technique videos and take your Jiu-Jitsu to the next level"}
                      </p>
                    </div>

                    {/* Benefits List */}
                    <div className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border border-border">
                      <ul className="space-y-3 text-left">
                        {[
                          language === "ja" ? "200以上のテクニック動画" : language === "pt" ? "Mais de 200 vídeos de técnicas" : "200+ technique videos",
                          language === "ja" ? "初心者から上級者まで対応" : language === "pt" ? "Do iniciante ao avançado" : "From beginner to advanced",
                          language === "ja" ? "新しいコンテンツを毎週追加" : language === "pt" ? "Novos conteúdos toda semana" : "New content added weekly",
                          language === "ja" ? "カテゴリー別に整理された動画" : language === "pt" ? "Vídeos organizados por categoria" : "Videos organized by category",
                        ].map((benefit, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            <span className="text-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3 pt-4">
                      <Button 
                        onClick={() => navigate("/join")}
                        size="lg"
                        className="w-full text-lg py-6"
                      >
                        {language === "ja" 
                          ? "今すぐプランを見る" 
                          : language === "pt" 
                          ? "Ver Planos Agora" 
                          : "View Plans Now"}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        {language === "ja" 
                          ? "1ヶ月の無料トライアル付き" 
                          : language === "pt" 
                          ? "1 mês de teste grátis incluído" 
                          : "1-month free trial included"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  {[
                    {
                      title: language === "ja" ? "いつでもキャンセル可能" : language === "pt" ? "Cancele quando quiser" : "Cancel Anytime",
                      desc: language === "ja" ? "違約金なし" : language === "pt" ? "Sem multas" : "No penalties"
                    },
                    {
                      title: language === "ja" ? "全デバイス対応" : language === "pt" ? "Todos os dispositivos" : "All Devices",
                      desc: language === "ja" ? "PC・スマホ・タブレット" : language === "pt" ? "PC, celular, tablet" : "PC, mobile, tablet"
                    },
                    {
                      title: language === "ja" ? "安全な決済" : language === "pt" ? "Pagamento seguro" : "Secure Payment",
                      desc: language === "ja" ? "Stripe決済" : language === "pt" ? "Via Stripe" : "Via Stripe"
                    }
                  ].map((item, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground text-xs">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : techniques.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">{language === "ja" ? "テクニックがまだ追加されていません" : language === "pt" ? "Nenhuma técnica adicionada ainda" : "No techniques added yet"}</p>
            </div>
          ) : (
            <div className="animate-fade-up space-y-6 max-w-6xl mx-auto">
              {/* Category-based Accordion */}
              {Object.entries(categoryTechniques).map(([category, seriesGroups]) => (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className={`border-l-4 pl-6 py-4 rounded-r-xl bg-gradient-to-r from-card/80 to-transparent backdrop-blur-sm ${categoryColors[category] || "border-muted"}`}>
                    <h2 className="text-2xl md:text-3xl font-light">
                      {getCategoryLabel(category)}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Object.values(seriesGroups).reduce((acc, series) => acc + series.length, 0)} {language === "ja" ? "本の動画" : "videos"}
                    </p>
                  </div>

                  {/* Series Accordion within Category */}
                  <Accordion type="multiple" className="w-full space-y-2">
                    {Object.entries(seriesGroups).map(([seriesName, seriesTechs], seriesIndex) => {
                      const seriesLetter = String.fromCharCode(65 + seriesIndex);
                      return (
                        <AccordionItem 
                          key={seriesName} 
                          value={`${category}-${seriesName}`}
                          className="border rounded-xl bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent transition-all [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3 md:gap-4 text-left">
                                <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold text-base md:text-lg flex-shrink-0 shadow-sm ${categoryColors[category]}`}>
                                  {seriesTechs.length}
                                </div>
                                <div>
                                  <h3 className="text-base md:text-lg font-semibold text-foreground">
                                    {seriesLetter}. {seriesName}
                                  </h3>
                                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                    {language === "ja" 
                                      ? `${seriesTechs.length}本の動画` 
                                      : language === "pt" 
                                      ? `${seriesTechs.length} vídeos` 
                                      : `${seriesTechs.length} videos`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <div className="divide-y divide-border">
                              {seriesTechs.map((tech, index) => {
                                const viewCount = videoViews[tech.id];
                                const isWatched = viewCount && viewCount > 0;
                                
                                return (
                                  <Link
                                    key={tech.id}
                                    to={`/video/${tech.id}`}
                                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all group"
                                  >
                                    <div className={`flex items-center justify-center min-w-[2.5rem] h-8 md:h-10 px-2 rounded-lg font-semibold text-xs md:text-sm flex-shrink-0 transition-all shadow-sm ${
                                      isWatched 
                                        ? "bg-primary text-primary-foreground shadow-primary/20" 
                                        : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-primary/20"
                                    }`}>
                                      {seriesLetter}-{tech.series_order || index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                          {getTechniqueName(tech)}
                                        </h4>
                                        {isWatched && (
                                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 flex-shrink-0">
                                            <Check className="w-3 h-3 text-primary" />
                                          </div>
                                        )}
                                      </div>
                                      {getTechniqueDescription(tech) && (
                                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                          {getTechniqueDescription(tech)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isWatched && (
                                        <Badge variant="secondary" className="flex items-center gap-1 text-xs shadow-sm">
                                          <Eye className="w-3 h-3" />
                                          {viewCount}
                                        </Badge>
                                      )}
                                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll Observer */}
          {hasMore && (
            <div ref={observerTarget} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">
                    {language === "ja" ? "読み込み中..." : language === "pt" ? "Carregando..." : "Loading..."}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <VideoUploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
      />
    </div>
  );
};

export default Map;
