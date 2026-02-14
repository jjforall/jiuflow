import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead, getOGLocale } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteTechniques } from "@/hooks/useFavoriteTechniques";
import { prefetchVideo } from "@/hooks/useVideoPrefetch";
import { Button } from "@/components/ui/button";
import { Lock, Eye, Check, Search, Star, Heart, ChevronDown, Mic, Globe, Tag, ArrowRight } from "lucide-react";
import { hasTranslatedVideo, getAvailableVideoLanguages, type TechniqueVideoData } from "@/lib/videoLanguages";
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

import { NOTATION_CATEGORY_LABELS, type NotationCategory } from "@/types/notation";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  video_metadata: Record<string, { video_url?: string; created_at?: string }> | null;
  thumbnail_url: string | null;
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  series_prefix: string | null;
}

interface NotationWithTechniques {
  id: string;
  code: string;
  name_ja: string;
  name_en: string;
  category: NotationCategory;
  techniques: Technique[];
}

// Category display order
const CATEGORY_ORDER: NotationCategory[] = [
  'position',
  'takedown',
  'action',
  'submission',
  'grip',
  'movement',
  'outcome',
];

// Notation category colors for badges
const getNotationCategoryColor = (category: NotationCategory): string => {
  const colors: Record<NotationCategory, string> = {
    position: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    action: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
    submission: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
    grip: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    movement: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    takedown: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    outcome: 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30',
  };
  return colors[category] || 'bg-muted text-muted-foreground border-border';
};

const Map = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTechniques();
  const [notationsWithTechniques, setNotationsWithTechniques] = useState<NotationWithTechniques[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [videoViews, setVideoViews] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStartTime] = useState(() => Date.now());

  // All techniques for favorites lookup - deduplicate
  const allTechniques = notationsWithTechniques.flatMap(n => n.techniques);
  const seenIds = new Set<string>();
  const uniqueTechniques: Technique[] = [];
  allTechniques.forEach(t => {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      uniqueTechniques.push(t);
    }
  });
  const favoriteTechniques = uniqueTechniques.filter(tech => favorites.includes(tech.id));

  const seoData = {
    ja: {
      title: "技術マップ | JiuFlow - ブラジリアン柔術テクニック",
      description: "技術タグで整理されたブラジリアン柔術の技術マップ。ポジション、サブミッション、アクション別に200以上のテクニック動画。"
    },
    en: {
      title: "Technique Map | JiuFlow - Brazilian Jiu-Jitsu Techniques",
      description: "BJJ technique map organized by technique tags. 200+ technique videos by position, submission, and action."
    },
    pt: {
      title: "Mapa de Técnicas | JiuFlow - Técnicas de Jiu-Jitsu Brasileiro",
      description: "Mapa de técnicas de BJJ organizado por tags. Mais de 200 vídeos por posição, finalização e ação."
    }
  };

  const currentSeo = seoData[language] || seoData.ja;

  const getTechniqueName = (tech: Technique) => {
    switch (language) {
      case "ja": return tech.name_ja;
      case "pt": return tech.name_pt;
      default: return tech.name;
    }
  };

  const getNotationLabel = (notation: NotationWithTechniques) => {
    return language === "ja" ? notation.name_ja : notation.name_en;
  };

  const getCategoryLabel = (category: NotationCategory) => {
    const labels = NOTATION_CATEGORY_LABELS[category];
    if (!labels) return category;
    return language === "ja" ? labels.ja : labels.en;
  };

  // Check auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch all notations with linked techniques
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all active notations
      const { data: notations, error: nError } = await supabase
        .from('bjj_notations')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order');

      if (nError) throw nError;

      // Fetch all technique_notations with technique data
      const { data: links, error: lError } = await supabase
        .from('technique_notations')
        .select('notation_id, technique_id');

      if (lError) throw lError;

      // Fetch all public techniques
      const { data: techniques, error: tError } = await supabase
        .from('techniques')
        .select('*')
        .or('visibility.eq.public,visibility.is.null')
        .order('series_prefix', { ascending: true })
        .order('series_order', { ascending: true });

      if (tError) throw tError;

      // Build technique lookup
      const techMap: Record<string, Technique> = {};
      (techniques || []).forEach(t => { techMap[t.id] = t as Technique; });

      // Build notation → technique_ids lookup
      const notationTechMap: Record<string, string[]> = {};
      (links || []).forEach(l => {
        if (!notationTechMap[l.notation_id]) notationTechMap[l.notation_id] = [];
        notationTechMap[l.notation_id].push(l.technique_id);
      });

      // Assemble notations with techniques (only those that have techniques)
      const result: NotationWithTechniques[] = [];
      (notations || []).forEach(n => {
        const techIds = notationTechMap[n.id] || [];
        const techs = techIds
          .map(id => techMap[id])
          .filter((t): t is Technique => !!t);

        if (techs.length > 0) {
          result.push({
            id: n.id,
            code: n.code,
            name_ja: n.name_ja,
            name_en: n.name_en,
            category: n.category as NotationCategory,
            techniques: techs.sort((a, b) => (a.series_prefix || '').localeCompare(b.series_prefix || '') || (a.series_order || 0) - (b.series_order || 0)),
          });
        }
      });

      // Sort by category order, then by technique count desc
      result.sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        return b.techniques.length - a.techniques.length;
      });

      setNotationsWithTechniques(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(language === "ja" ? "技の読み込みに失敗しました" : "Failed to load techniques");
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [language]);

  // Fetch video views
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
        data.forEach(view => { viewsMap[view.video_id] = view.view_count; });
        setVideoViews(viewsMap);
      }
    } catch (error) {
      console.error("Error fetching video views:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && !hasFetched) {
      fetchData();
      fetchVideoViews();
    }
  }, [authLoading, user, hasFetched, fetchData, fetchVideoViews]);

  const langPath = language === 'ja' ? '' : `/${language}`;

  // Group notations by category for display
  const groupedByCategory = CATEGORY_ORDER
    .map(cat => {
      const notations = notationsWithTechniques.filter(n => n.category === cat);
      if (notations.length === 0) return null;
      return { category: cat, notations };
    })
    .filter(Boolean) as { category: NotationCategory; notations: NotationWithTechniques[] }[];

  // Filter by search query
  const getFilteredNotations = (notations: NotationWithTechniques[]) => {
    if (!searchQuery.trim()) return notations;
    const query = searchQuery.toLowerCase();
    return notations
      .map(n => {
        // Check if notation name matches
        const notationMatches = n.name_ja.toLowerCase().includes(query) ||
          n.name_en.toLowerCase().includes(query) ||
          n.code.toLowerCase().includes(query);
        
        if (notationMatches) return n;

        // Filter techniques within notation
        const filteredTechs = n.techniques.filter(tech => {
          const name = (language === "ja" ? tech.name_ja : language === "pt" ? tech.name_pt : tech.name).toLowerCase();
          return name.includes(query);
        });

        if (filteredTechs.length > 0) {
          return { ...n, techniques: filteredTechs };
        }
        return null;
      })
      .filter((n): n is NotationWithTechniques => n !== null);
  };

  // Render a technique row
  const renderTechniqueRow = (tech: Technique, notationCode?: string) => {
    const viewCount = videoViews[tech.id];
    const isWatched = viewCount && viewCount > 0;
    const hasCurrentLangDub = language !== "ja" && hasTranslatedVideo(tech as TechniqueVideoData, language);

    // Get all translated languages (excluding ja which is original)
    const translatedLangs = getAvailableVideoLanguages(tech as TechniqueVideoData)
      .filter(l => !l.isOriginal)
      .map(l => l.code);

    // Build notation-based ID like "SW-1", "CG-3"
    const notationId = notationCode && tech.series_order
      ? `${notationCode}-${tech.series_order}`
      : notationCode
      ? notationCode
      : null;

    // Old series badge like "A-1"
    const oldSeriesLabel = tech.series_prefix && tech.series_order
      ? `${tech.series_prefix}-${tech.series_order}`
      : tech.series_prefix || null;

    return (
      <div
        key={tech.id}
        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all group"
      >
        <Link
          to={`/video/${tech.id}`}
          className="flex items-center gap-3 md:gap-4 flex-1 min-w-0"
          onMouseEnter={() => prefetchVideo(
            language === "ja" ? (tech as any).video_url_ja :
            language === "pt" ? (tech as any).video_url_pt :
            tech.video_url
          )}
        >
          {/* Notation ID badge (prominent) + Old series badge (dimmed) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {notationId && (
              <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-primary/15 text-primary font-mono font-bold text-xs md:text-sm border border-primary/30">
                {notationId}
              </span>
            )}
            {oldSeriesLabel && (
              <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/50 bg-muted/30">
                {oldSeriesLabel}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h4 className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                {getTechniqueName(tech)}
              </h4>
              {/* Translation language badges */}
              {translatedLangs.length > 0 && (
                <div className="inline-flex items-center gap-0.5 flex-shrink-0">
                  <Globe className="w-3 h-3 text-emerald-500" />
                  {translatedLangs.map(lang => (
                    <span
                      key={lang}
                      className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                        lang === language
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
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
            onClick={(e) => { e.preventDefault(); toggleFavorite(tech.id); }}
            className={`p-1.5 rounded-full transition-colors ${
              isFavorite(tech.id) ? "hover:bg-amber-500/20" : "hover:bg-muted"
            }`}
          >
            <Heart className={`w-4 h-4 transition-colors ${
              isFavorite(tech.id) ? "text-amber-500 fill-amber-500" : "text-muted-foreground group-hover:text-foreground"
            }`} />
          </button>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl={`${langPath}/map`}
        ogImage="https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
        locale={getOGLocale(language)}
        keywords={language === 'ja'
          ? ['BJJ', 'ブラジリアン柔術', 'テクニック', '技術マップ', '技術タグ', '柔術技術']
          : language === 'pt'
          ? ['BJJ', 'jiu-jitsu brasileiro', 'técnicas', 'mapa de técnicas', 'tags']
          : ['BJJ', 'brazilian jiu-jitsu', 'techniques', 'technique map', 'tags']}
        alternateLanguages={seoData}
      />
      {/* Background */}
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
          {/* Header */}
          <div className="mb-8 md:mb-12 animate-fade-up">
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{t.map.title}</h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              {language === "ja"
                ? "技術タグで体系的に整理された技の一覧"
                : language === "pt"
                ? "Técnicas organizadas por tags de técnica"
                : "Techniques organized by technique tags"}
            </p>
          </div>

          {authLoading || isLoading || (user && !hasFetched) ? (
            <MapLoadingState startTime={loadingStartTime} />
          ) : !user ? (
            /* Login prompt - kept minimal */
            <div className="text-center py-12 animate-fade-up">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 p-12 rounded-2xl shadow-xl">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="p-6 bg-primary/10 rounded-full">
                        <Lock className="w-16 h-16 text-primary" />
                      </div>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      {language === "ja" ? "プレミアム限定コンテンツ" : language === "pt" ? "Conteúdo Exclusivo Premium" : "Premium Exclusive Content"}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {language === "ja"
                        ? "200以上の技術動画にアクセスして、あなたの柔術を次のレベルへ"
                        : "Access 200+ technique videos and take your Jiu-Jitsu to the next level"}
                    </p>
                    <Button onClick={() => navigate("/join")} size="lg" className="w-full text-lg py-6">
                      {language === "ja" ? "今すぐプランを見る" : "View Plans Now"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : notationsWithTechniques.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                {language === "ja" ? "テクニックがまだ追加されていません" : "No techniques added yet"}
              </p>
            </div>
          ) : (
            <div className="animate-fade-up space-y-6 max-w-6xl mx-auto">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={language === "ja" ? "タグ名・技名で検索..." : language === "pt" ? "Pesquisar por tag ou técnica..." : "Search by tag or technique name..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
              </div>

              {/* Favorites section */}
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
                              {favoriteTechniques.length}{language === "ja" ? "本の動画" : " videos"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <div className="divide-y divide-border">
                        {favoriteTechniques.map(tech => renderTechniqueRow(tech))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Tag-based sections grouped by category */}
              {groupedByCategory.map(({ category, notations }) => {
                const filteredNotations = getFilteredNotations(notations);
                if (filteredNotations.length === 0) return null;

                const catLabel = getCategoryLabel(category);
                const catColor = NOTATION_CATEGORY_LABELS[category]?.color || 'bg-muted';

                return (
                  <div key={category} className="space-y-3">
                    {/* Category header */}
                    <div className="flex items-center gap-3 pt-4 pb-1">
                      <div className={`w-3 h-3 rounded-full ${catColor}`} />
                      <h2 className="text-lg md:text-xl font-semibold text-foreground">
                        {catLabel}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        ({filteredNotations.length})
                      </span>
                    </div>

                    <Accordion type="multiple" className="w-full space-y-2">
                      {filteredNotations.map(notation => (
                        <AccordionItem
                          key={notation.id}
                          value={notation.id}
                          className="border rounded-xl bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 md:px-6 py-4 hover:no-underline hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent transition-all [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3 md:gap-4 text-left">
                                <div className={`flex items-center justify-center px-3 py-2 rounded-xl font-bold text-sm flex-shrink-0 shadow-sm border ${getNotationCategoryColor(notation.category)}`}>
                                  <span className="font-mono">{notation.code}</span>
                                </div>
                                <div>
                                  <h3 className="text-base md:text-lg font-semibold text-foreground">
                                    {getNotationLabel(notation)}
                                  </h3>
                                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                    {notation.techniques.length}{language === "ja" ? "本の動画" : " videos"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <div className="divide-y divide-border">
                              {notation.techniques.map(tech => renderTechniqueRow(tech, notation.code))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}

              {/* Legacy map link */}
              <div className="mt-12 pt-8 border-t border-border">
                <Link
                  to={`${langPath}/map/legacy`}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Tag className="w-4 h-4" />
                  <span>{language === "ja" ? "旧技マップ（シリーズ別表示）を見る" : language === "pt" ? "Ver mapa de técnicas antigo" : "View legacy technique map (by series)"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Map;
