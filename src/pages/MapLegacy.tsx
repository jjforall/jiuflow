import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead, getOGLocale } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteTechniques } from "@/hooks/useFavoriteTechniques";
import { prefetchVideo } from "@/hooks/useVideoPrefetch";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, Upload, X, ChevronDown, Eye, Check, Search, Star, Heart, Mic, Tag, ArrowRight } from "lucide-react";
import { hasTranslatedVideo } from "@/lib/videoLanguages";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MapLoadingState } from "@/components/MapLoadingState";
import mapBackground from "@/assets/jiuflow-map-background.png";
import { getSeriesPrefixColors, getSeriesPrefixColorsWatched, getSeriesPrefixColorsLight } from "@/components/ui/series-badge";

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
  series_prefix: string | null;
  video_metadata?: any;
}

interface SeriesTechniques {
  [seriesPrefix: string]: {
    seriesName: string;
    techniques: Technique[];
  };
}

// シリーズ名の多言語翻訳マッピング
const seriesNameTranslations: Record<string, { en: string; pt: string }> = {
  "クローズドガード": { en: "Closed Guard", pt: "Guarda Fechada" },
  "クローズドガードブレイク": { en: "Closed Guard Break", pt: "Passagem de Guarda Fechada" },
  "コンバットベース": { en: "Combat Base", pt: "Base de Combate" },
  "マウント": { en: "Mount", pt: "Montada" },
  "引き込み": { en: "Guard Pull", pt: "Puxada de Guarda" },
  "その他の技": { en: "Other Techniques", pt: "Outras Técnicas" },
};

const getTranslatedSeriesName = (seriesName: string, language: string): string => {
  if (language === "ja") return seriesName;
  const translation = seriesNameTranslations[seriesName];
  if (!translation) return seriesName;
  return language === "pt" ? translation.pt : translation.en;
};

// 選択言語の吹き替えがあるかチェック（Map用ラッパー）
const hasDubbingForLanguage = (tech: Technique, lang: string): boolean => {
  if (lang === "ja") return true; // オリジナル
  return hasTranslatedVideo(tech as any, lang);
};

// シリーズ内の技術をソート（吹き替え優先）
const sortTechniquesWithDubbingPriority = (techs: Technique[], lang: string) => {
  if (lang === "ja") {
    // 日本語選択時は従来通りseries_orderでソート
    return [...techs].sort((a, b) => (a.series_order || 0) - (b.series_order || 0));
  }
  
  return [...techs].sort((a, b) => {
    const aHasDub = hasDubbingForLanguage(a, lang);
    const bHasDub = hasDubbingForLanguage(b, lang);
    
    // 吹き替えありを優先
    if (aHasDub && !bHasDub) return -1;
    if (!aHasDub && bHasDub) return 1;
    
    // 同じ場合は series_order でソート
    return (a.series_order || 0) - (b.series_order || 0);
  });
};

const Map = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hashtagFilter = searchParams.get('hashtag');
  const categoryFilter = searchParams.get('category');
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, user, isLoading: authLoading } = useAuth();
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTechniques();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // Track if we've attempted to fetch
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [seriesTechniques, setSeriesTechniques] = useState<SeriesTechniques>({});
  const [videoViews, setVideoViews] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStartTime] = useState(() => Date.now()); // Track when loading started
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;

  // Get favorite techniques data
  const favoriteTechniques = techniques.filter(tech => favorites.includes(tech.id));

  const seoData = {
    ja: {
      title: "技術マップ | JiuFlow - ブラジリアン柔術テクニック",
      description: "体系化されたブラジリアン柔術の技術マップ。プル、コントロール、サブミッション、コンバットベースの技を学べます。200以上のテクニック動画。"
    },
    en: {
      title: "Technique Map | JiuFlow - Brazilian Jiu-Jitsu Techniques",
      description: "Systematic Brazilian Jiu-Jitsu technique map. Learn pulls, controls, submissions, and combat base techniques. 200+ technique videos."
    },
    pt: {
      title: "Mapa de Técnicas | JiuFlow - Técnicas de Jiu-Jitsu Brasileiro",
      description: "Mapa sistemático de técnicas de Jiu-Jitsu Brasileiro. Aprenda puxadas, controles, finalizações e base de combate. Mais de 200 vídeos."
    }
  };

  const currentSeo = seoData[language] || seoData.ja;


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
    sweep: { en: "Sweep", ja: "スイープ", pt: "Raspagem" },
    escape: { en: "Escape", ja: "エスケープ", pt: "Escape" },
    "guard-pass": { en: "Guard Pass", ja: "ガードパス", pt: "Passagem de Guarda" },
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
    sweep: "bg-purple-500/10 border-purple-500",
    escape: "bg-yellow-500/10 border-yellow-500",
    "guard-pass": "bg-pink-500/10 border-pink-500",
  };

  // Check authentication - wait for auth to be ready before redirecting
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch and group techniques with timeout
  const fetchTechniques = useCallback(async (pageNum: number) => {
    if (pageNum === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Add timeout to prevent hanging forever (longer timeout for slow networks)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const queryPromise = supabase
        .from("techniques")
        .select("*")
        .or("visibility.eq.public,visibility.is.null")
        .order("series_prefix", { ascending: true, nullsFirst: false })
        .order("series_order", { ascending: true, nullsFirst: false })
        .order("display_order", { ascending: true });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) throw error;

      if (data) {
        let filteredData = data as Technique[];
        
        // Filter by hashtag if specified
        if (hashtagFilter) {
          filteredData = filteredData.filter(tech => 
            tech.hashtags && tech.hashtags.includes(hashtagFilter)
          );
        }
        
        // Filter by category if specified
        if (categoryFilter) {
          filteredData = filteredData.filter(tech => 
            tech.category === categoryFilter
          );
        }
        
        // Group techniques by series_prefix
        const seriesGroups: SeriesTechniques = {};
        filteredData.forEach(tech => {
          const seriesPrefix = tech.series_prefix || "Z";
          const seriesName = tech.series_name || "その他の技";
          
          if (!seriesGroups[seriesPrefix]) {
            seriesGroups[seriesPrefix] = {
              seriesName,
              techniques: []
            };
          }
          seriesGroups[seriesPrefix].techniques.push(tech);
        });
        
        // Sort series by prefix (A, B, C...)
        const sortedSeriesGroups: SeriesTechniques = {};
        Object.keys(seriesGroups)
          .sort()
          .forEach(prefix => {
            sortedSeriesGroups[prefix] = seriesGroups[prefix];
          });
        
        setTechniques(filteredData);
        setSeriesTechniques(sortedSeriesGroups);
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
      setHasFetched(true);
    }
  }, [language, hashtagFilter, categoryFilter]);

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

  // Initial load - only fetch if not already fetched
  useEffect(() => {
    if (!authLoading && user && !hasFetched) {
      fetchTechniques(0);
      fetchVideoViews();
    }
  }, [authLoading, user, hasFetched, fetchTechniques, fetchVideoViews]);

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

  const langPath = language === 'ja' ? '' : `/${language}`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl={`${langPath}/map`}
        ogImage="https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
        locale={getOGLocale(language)}
        keywords={language === 'ja'
          ? ['BJJ', 'ブラジリアン柔術', 'テクニック', '技術マップ', 'サブミッション', '柔術技術', '格闘技テクニック']
          : language === 'pt'
          ? ['BJJ', 'jiu-jitsu brasileiro', 'técnicas', 'mapa de técnicas', 'finalizações', 'guarda']
          : ['BJJ', 'brazilian jiu-jitsu', 'techniques', 'technique map', 'submissions', 'guard']}
        alternateLanguages={seoData}
      />
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

          {authLoading || isLoading || (user && !hasFetched) ? (
            <MapLoadingState startTime={loadingStartTime} />
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
            <div className="animate-fade-up space-y-3 max-w-6xl mx-auto">
              {/* Search Input */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={language === "ja" ? "技名、説明、ハッシュタグで検索..." : language === "pt" ? "Pesquisar por nome, descrição, hashtag..." : "Search by name, description, hashtag..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
              </div>

              {/* Favorites Accordion */}
              {favoriteTechniques.length > 0 && (
                <Accordion type="multiple" defaultValue={["favorites"]} className="w-full space-y-2 mb-4">
                  <AccordionItem 
                    value="favorites"
                    className="border rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-transparent transition-all [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3 md:gap-4 text-left">
                          <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold text-base md:text-lg flex-shrink-0 shadow-sm border bg-amber-500/20 border-amber-500 text-amber-600">
                            <Star className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                          </div>
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-foreground">
                              {language === "ja" ? "お気に入り" : language === "pt" ? "Favoritos" : "Favorites"}
                            </h3>
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                              {language === "ja" 
                                ? `${favoriteTechniques.length}本の動画` 
                                : language === "pt" 
                                ? `${favoriteTechniques.length} vídeos` 
                                : `${favoriteTechniques.length} videos`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <div className="divide-y divide-border">
                        {favoriteTechniques.map((tech) => {
                          const viewCount = videoViews[tech.id];
                          const isWatched = viewCount && viewCount > 0;
                          const seriesPrefix = tech.series_prefix || "Z";
                          
                          return (
                            <div
                              key={tech.id}
                              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all group"
                            >
                              <Link
                                to={`/video/${tech.id}`}
                                className="flex items-center gap-3 md:gap-4 flex-1 min-w-0"
                                onMouseEnter={() => prefetchVideo(
                                  language === "ja" ? tech.video_url_ja : 
                                  language === "pt" ? tech.video_url_pt : 
                                  tech.video_url
                                )}
                              >
                                <div className={`flex items-center justify-center min-w-[2.5rem] h-8 md:h-10 px-2 rounded-lg font-semibold text-xs md:text-sm flex-shrink-0 transition-all shadow-sm ${
                                  isWatched 
                                    ? getSeriesPrefixColorsWatched(seriesPrefix) + " shadow-lg"
                                    : getSeriesPrefixColors(seriesPrefix) + " group-hover:shadow-lg"
                                }`}>
                                  {seriesPrefix}-{tech.series_order || 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2">
                                    <h4 className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                                      {getTechniqueName(tech)}
                                    </h4>
                                    {isWatched && (
                                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                                        <Check className="w-3 h-3 text-primary" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Link>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isWatched && (
                                  <Badge variant="secondary" className="flex items-center gap-1 text-xs shadow-sm">
                                    <Eye className="w-3 h-3" />
                                    {viewCount}
                                  </Badge>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleFavorite(tech.id);
                                  }}
                                  className="p-1.5 rounded-full hover:bg-amber-500/20 transition-colors"
                                >
                                  <Heart className="w-4 h-4 text-amber-500 fill-amber-500" />
                                </button>
                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Series-based Accordion (alphabetically ordered) */}
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(seriesTechniques)
                  .map(([seriesPrefix, { seriesName, techniques: seriesTechs }]) => {
                    // Filter techniques based on search query
                    const filteredTechs = seriesTechs.filter(tech => {
                      if (!searchQuery.trim()) return true;
                      
                      const query = searchQuery.toLowerCase();
                      const name = (language === "ja" ? tech.name_ja : language === "pt" ? tech.name_pt : tech.name).toLowerCase();
                      const description = (language === "ja" ? tech.description_ja : language === "pt" ? tech.description_pt : tech.description)?.toLowerCase() || "";
                      const hashtags = (tech.hashtags || []).join(" ").toLowerCase();
                      
                      return name.includes(query) || description.includes(query) || hashtags.includes(query);
                    });

                    // Don't show series if no techniques match the search
                    if (filteredTechs.length === 0) return null;

                    return { seriesPrefix, seriesName, techniques: filteredTechs };
                  })
                  .filter(Boolean)
                  .map(item => {
                    if (!item) return null;
                    const { seriesPrefix, seriesName, techniques: seriesTechs } = item;
                  const maxSeriesOrder = Math.max(...seriesTechs.map(t => t.series_order || 1));
                  return (
                    <AccordionItem 
                      key={seriesPrefix} 
                      value={seriesPrefix}
                      className="border rounded-xl bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent transition-all [&[data-state=open]>svg]:rotate-180">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3 md:gap-4 text-left">
                            <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold text-base md:text-lg flex-shrink-0 shadow-sm border ${getSeriesPrefixColorsLight(seriesPrefix)}`}>
                              {seriesPrefix}
                            </div>
                            <div>
                              <h3 className="text-base md:text-lg font-semibold text-foreground">
                                {getTranslatedSeriesName(seriesName, language)}
                              </h3>
                              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                {language === "ja" 
                                  ? `${maxSeriesOrder}本の動画` 
                                  : language === "pt" 
                                  ? `${maxSeriesOrder} vídeos` 
                                  : `${maxSeriesOrder} videos`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="divide-y divide-border">
                          {sortTechniquesWithDubbingPriority(seriesTechs, language)
                            .map((tech, index) => {
                            const viewCount = videoViews[tech.id];
                            const isWatched = viewCount && viewCount > 0;
                            const hasCurrentLangDub = language !== "ja" && hasDubbingForLanguage(tech, language);
                            
                            return (
                              <div
                                key={tech.id}
                                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all group"
                              >
                              <Link
                                  to={`/video/${tech.id}`}
                                  className="flex items-center gap-3 md:gap-4 flex-1 min-w-0"
                                  onMouseEnter={() => prefetchVideo(
                                    language === "ja" ? tech.video_url_ja : 
                                    language === "pt" ? tech.video_url_pt : 
                                    tech.video_url
                                  )}
                                >
                                  <div className={`flex items-center justify-center min-w-[2.5rem] h-8 md:h-10 px-2 rounded-lg font-semibold text-xs md:text-sm flex-shrink-0 transition-all shadow-sm ${
                                    isWatched 
                                      ? getSeriesPrefixColorsWatched(seriesPrefix) + " shadow-lg"
                                      : getSeriesPrefixColors(seriesPrefix) + " group-hover:shadow-lg"
                                  }`}>
                                    {seriesPrefix}-{tech.series_order || index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                      <h4 className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                                        {getTechniqueName(tech)}
                                      </h4>
                                      {/* 吹き替えバッジ */}
                                      {hasCurrentLangDub && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                          <Mic className="w-2.5 h-2.5" />
                                          {language.toUpperCase()}
                                        </span>
                                      )}
                                      {isWatched && (
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                                          <Check className="w-3 h-3 text-primary" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isWatched && (
                                    <Badge variant="secondary" className="flex items-center gap-1 text-xs shadow-sm">
                                      <Eye className="w-3 h-3" />
                                      {viewCount}
                                    </Badge>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleFavorite(tech.id);
                                    }}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      isFavorite(tech.id) 
                                        ? "hover:bg-amber-500/20" 
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <Heart className={`w-4 h-4 transition-colors ${
                                      isFavorite(tech.id) 
                                        ? "text-amber-500 fill-amber-500" 
                                        : "text-muted-foreground group-hover:text-foreground"
                                    }`} />
                                  </button>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
        
              {/* New map link */}
              <div className="mt-12 pt-8 border-t border-border">
                <Link
                  to={`${langPath}/map/new`}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Tag className="w-4 h-4" />
                  <span>{language === "ja" ? "新技マップ（タグ別表示）を見る" : language === "pt" ? "Ver novo mapa de técnicas (por tags)" : "View new technique map (by tags)"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
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
