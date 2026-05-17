import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { prefetchVideo } from "@/hooks/useVideoPrefetch";
import { useFavoriteTechniques } from "@/hooks/useFavoriteTechniques";
import { hasTranslatedVideo, getAvailableVideoLanguages, type TechniqueVideoData } from "@/lib/videoLanguages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Eye,
  Check,
  Heart,
  Globe,
  ArrowLeft,
  Swords,
  Shield,
  GitBranch,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NOTATION_CATEGORY_LABELS, type NotationCategory } from "@/types/notation";
import { cn } from "@/lib/utils";

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

// Entry point definitions
type EntryPoint = "hikikomi" | "tachiwaza";

interface EntryPointDef {
  id: EntryPoint;
  label_ja: string;
  label_en: string;
  label_pt: string;
  icon: typeof Swords;
  description_ja: string;
  description_en: string;
  // Which notation categories belong here
  categories: NotationCategory[];
  // Specific action codes that belong here (overrides category grouping)
  actionCodes?: string[];
}

const ENTRY_POINTS: EntryPointDef[] = [
  {
    id: "hikikomi",
    label_ja: "引き込み・寝技",
    label_en: "Guard Pull / Ground",
    label_pt: "Guarda / Solo",
    icon: Shield,
    description_ja: "ガードポジションからの技術体系",
    description_en: "Technique system from guard positions",
    categories: ["position", "action", "submission", "grip", "movement", "outcome"],
    // Exclude takedown-specific action codes
  },
  {
    id: "tachiwaza",
    label_ja: "立ち技",
    label_en: "Standing / Takedowns",
    label_pt: "Em Pé / Quedas",
    icon: Swords,
    description_ja: "スタンドからの技術体系",
    description_en: "Technique system from standing",
    categories: ["takedown"],
  },
];

// Standing-related action codes that should appear under tachiwaza
const STANDING_ACTION_CODES = ["TD", "Pull"];

interface BreadcrumbItem {
  label: string;
  level: "root" | "entry" | "category" | "notation";
  value?: string;
}

interface TechniqueFlowTreeProps {
  notationsWithTechniques: NotationWithTechniques[];
  videoViews: Record<string, number>;
}

export default function TechniqueFlowTree({
  notationsWithTechniques,
  videoViews,
}: TechniqueFlowTreeProps) {
  const { language } = useLanguage();
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTechniques();
  const [selectedEntry, setSelectedEntry] = useState<EntryPoint | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NotationCategory | null>(null);
  const [selectedNotation, setSelectedNotation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Split notations into entry points
  const { hikikomiNotations, tachiwazaNotations } = useMemo(() => {
    const hikikomi: NotationWithTechniques[] = [];
    const tachiwaza: NotationWithTechniques[] = [];

    notationsWithTechniques.forEach((n) => {
      if (n.category === "takedown") {
        tachiwaza.push(n);
      } else if (n.category === "action" && STANDING_ACTION_CODES.includes(n.code)) {
        tachiwaza.push(n);
      } else {
        hikikomi.push(n);
      }
    });

    return { hikikomiNotations: hikikomi, tachiwazaNotations: tachiwaza };
  }, [notationsWithTechniques]);

  const currentNotations = selectedEntry === "tachiwaza" ? tachiwazaNotations : hikikomiNotations;

  // Get available categories for current entry point
  const availableCategories = useMemo(() => {
    const cats = new Map<NotationCategory, number>();
    currentNotations.forEach((n) => {
      const count = cats.get(n.category) || 0;
      cats.set(n.category, count + n.techniques.length);
    });
    return Array.from(cats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ category: cat, count }));
  }, [currentNotations]);

  // Get notations for selected category
  const categoryNotations = useMemo(() => {
    if (!selectedCategory) return [];
    return currentNotations
      .filter((n) => n.category === selectedCategory)
      .sort((a, b) => b.techniques.length - a.techniques.length);
  }, [currentNotations, selectedCategory]);

  // Get selected notation data
  const selectedNotationData = useMemo(() => {
    if (!selectedNotation) return null;
    return notationsWithTechniques.find((n) => n.id === selectedNotation) || null;
  }, [notationsWithTechniques, selectedNotation]);

  // Search across all
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: { notation: NotationWithTechniques; techniques: Technique[] }[] = [];

    notationsWithTechniques.forEach((n) => {
      const matchingTechs = n.techniques.filter((t) => {
        const name = getTechniqueName(t).toLowerCase();
        return name.includes(q) || n.code.toLowerCase().includes(q) || n.name_ja.toLowerCase().includes(q) || n.name_en.toLowerCase().includes(q);
      });
      if (matchingTechs.length > 0) {
        results.push({ notation: n, techniques: matchingTechs });
      }
    });

    return results;
  }, [searchQuery, notationsWithTechniques, language]);

  // Build breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: language === "ja" ? "技の分岐" : "Technique Tree", level: "root" },
  ];

  if (selectedEntry) {
    const entry = ENTRY_POINTS.find((e) => e.id === selectedEntry)!;
    breadcrumbs.push({
      label: language === "ja" ? entry.label_ja : entry.label_en,
      level: "entry",
      value: selectedEntry,
    });
  }

  if (selectedCategory) {
    breadcrumbs.push({
      label: getCategoryLabel(selectedCategory),
      level: "category",
      value: selectedCategory,
    });
  }

  if (selectedNotationData) {
    breadcrumbs.push({
      label: `${selectedNotationData.code} ${getNotationLabel(selectedNotationData)}`,
      level: "notation",
      value: selectedNotationData.id,
    });
  }

  const handleBreadcrumbClick = (crumb: BreadcrumbItem) => {
    if (crumb.level === "root") {
      setSelectedEntry(null);
      setSelectedCategory(null);
      setSelectedNotation(null);
    } else if (crumb.level === "entry") {
      setSelectedCategory(null);
      setSelectedNotation(null);
    } else if (crumb.level === "category") {
      setSelectedNotation(null);
    }
  };

  const goBack = () => {
    if (selectedNotation) {
      setSelectedNotation(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedEntry) {
      setSelectedEntry(null);
    }
  };

  // Render technique row
  const renderTechniqueRow = (tech: Technique, notationCode?: string) => {
    const viewCount = videoViews[tech.id];
    const isWatched = viewCount && viewCount > 0;
    const translatedLangs = getAvailableVideoLanguages(tech as TechniqueVideoData)
      .filter((l) => !l.isOriginal)
      .map((l) => l.code);

    const notationId = notationCode && tech.series_order
      ? `${notationCode}-${tech.series_order}`
      : notationCode || null;

    const oldSeriesLabel = tech.series_prefix && tech.series_order
      ? `${tech.series_prefix}-${tech.series_order}`
      : tech.series_prefix || null;

    return (
      <div
        key={tech.id}
        className="flex items-center gap-3 p-3 md:p-4 hover:bg-muted/50 transition-all group rounded-lg"
      >
        <Link
          to={`/video/${tech.id}`}
          className="flex items-center gap-3 flex-1 min-w-0"
          onMouseEnter={() =>
            prefetchVideo(
              language === "ja"
                ? (tech as any).video_url_ja
                : language === "pt"
                ? (tech as any).video_url_pt
                : tech.video_url
            )
          }
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {notationId && (
              <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-primary/15 text-primary font-mono font-bold text-xs border border-primary/30">
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
              <h4 className="text-sm md:text-base font-medium text-foreground group-hover:text-primary transition-colors">
                {getTechniqueName(tech)}
              </h4>
              {translatedLangs.length > 0 && (
                <div className="inline-flex items-center gap-0.5 flex-shrink-0">
                  <Globe className="w-3 h-3 text-emerald-500" />
                  {translatedLangs.map((lang) => (
                    <span
                      key={lang}
                      className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                        lang === language
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
              {isWatched && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
              )}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isWatched && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
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
              isFavorite(tech.id) ? "hover:bg-amber-500/20" : "hover:bg-muted"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite(tech.id) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  // Get notation category color
  const getCatColor = (category: NotationCategory): string => {
    const colors: Record<NotationCategory, string> = {
      position: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      action: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
      submission: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
      grip: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
      movement: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      takedown: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      outcome: "border-muted bg-muted/50 text-muted-foreground",
    };
    return colors[category] || "border-border bg-muted";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={
            language === "ja"
              ? "技名・タグで検索..."
              : "Search techniques..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Search results */}
      {searchResults && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {language === "ja"
              ? `「${searchQuery}」の検索結果`
              : `Results for "${searchQuery}"`}
          </h3>
          {searchResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {language === "ja" ? "見つかりませんでした" : "No results found"}
            </p>
          ) : (
            searchResults.map(({ notation, techniques }) => (
              <div key={notation.id} className="border rounded-xl bg-card/90 overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getCatColor(notation.category)}`}>
                    {notation.code}
                  </span>
                  <span className="text-sm font-medium">{getNotationLabel(notation)}</span>
                </div>
                <div className="divide-y divide-border/50">
                  {techniques.map((t) => renderTechniqueRow(t, notation.code))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tree navigation (hidden during search) */}
      {!searchResults && (
        <>
          {/* Breadcrumbs */}
          {selectedEntry && (
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {language === "ja" ? "戻る" : "Back"}
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3" />}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb)}
                      className={cn(
                        "hover:text-foreground transition-colors",
                        i === breadcrumbs.length - 1
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {crumb.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Level 1: Entry point selection */}
          {!selectedEntry && (
            <div className="space-y-4">
              {/* Featured: Spider Guard shortcut */}
              {(() => {
                const featured = notationsWithTechniques.find((n) => n.code === "SG");
                if (!featured) return null;
                return (
                  <button
                    onClick={() => {
                      setSelectedEntry("hikikomi");
                      setSelectedCategory(featured.category);
                      setSelectedNotation(featured.id);
                    }}
                    className="group relative w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:border-primary/70 hover:from-primary/15 transition-all shadow-lg hover:shadow-xl text-left"
                  >
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold border flex-shrink-0 ${getCatColor(featured.category)}`}>
                      {featured.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {language === "ja" ? "注目" : "Featured"}
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {getNotationLabel(featured)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {featured.techniques.length}
                        {language === "ja" ? " 本の動画" : " videos"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })()}

              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {language === "ja"
                    ? "どちらから始めますか？"
                    : "Where do you start?"}
                </h2>
              </div>

              {/* Tree connector line */}
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-px top-0 h-4 w-0.5 bg-border" />
                <div className="absolute left-[calc(25%)] right-[calc(25%)] top-4 h-0.5 bg-border" />
                <div className="absolute left-[calc(25%)] -translate-x-px top-4 h-4 w-0.5 bg-border" />
                <div className="absolute right-[calc(25%)] translate-x-px top-4 h-4 w-0.5 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8">
                {ENTRY_POINTS.map((entry) => {
                  const Icon = entry.icon;
                  const count =
                    entry.id === "hikikomi"
                      ? hikikomiNotations.reduce((s, n) => s + n.techniques.length, 0)
                      : tachiwazaNotations.reduce((s, n) => s + n.techniques.length, 0);

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry.id)}
                      className="group relative flex flex-col items-center gap-3 p-6 md:p-8 rounded-2xl border-2 border-border bg-card/80 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all shadow-lg hover:shadow-xl"
                    >
                      <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="text-lg md:text-xl font-bold text-foreground">
                          {language === "ja"
                            ? entry.label_ja
                            : language === "pt"
                            ? entry.label_pt
                            : entry.label_en}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {language === "ja"
                            ? entry.description_ja
                            : entry.description_en}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {count}
                          {language === "ja" ? " 本の動画" : " videos"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all absolute right-4 top-1/2 -translate-y-1/2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level 2: Category selection */}
          {selectedEntry && !selectedCategory && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                {language === "ja" ? "カテゴリを選択" : "Choose a category"}
              </h2>

              {/* Tree lines */}
              <div className="relative pl-6 space-y-2">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                {availableCategories.map(({ category, count }, i) => {
                  const catLabel = getCategoryLabel(category);
                  const catColor = NOTATION_CATEGORY_LABELS[category]?.color || "bg-muted";

                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className="relative w-full flex items-center gap-3 p-4 rounded-xl border bg-card/80 hover:bg-primary/5 hover:border-primary/40 transition-all group text-left"
                    >
                      {/* Connector line */}
                      <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-border" />
                      <div className={`w-4 h-4 rounded-full ${catColor} flex-shrink-0`} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {catLabel}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {currentNotations.filter((n) => n.category === category).length}
                          {language === "ja" ? " タグ · " : " tags · "}
                          {count}
                          {language === "ja" ? " 本の動画" : " videos"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level 3: Notation selection */}
          {selectedCategory && !selectedNotation && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                {language === "ja"
                  ? `${getCategoryLabel(selectedCategory)}の技術タグ`
                  : `${getCategoryLabel(selectedCategory)} Tags`}
              </h2>

              <div className="relative pl-6 space-y-2">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                {categoryNotations.map((notation) => (
                  <button
                    key={notation.id}
                    onClick={() => setSelectedNotation(notation.id)}
                    className="relative w-full flex items-center gap-3 p-4 rounded-xl border bg-card/80 hover:bg-primary/5 hover:border-primary/40 transition-all group text-left"
                  >
                    <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-border" />
                    <span
                      className={`px-2.5 py-1 rounded-lg text-sm font-mono font-bold border flex-shrink-0 ${getCatColor(notation.category)}`}
                    >
                      {notation.code}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {getNotationLabel(notation)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {notation.techniques.length}
                        {language === "ja" ? " 本の動画" : " videos"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Level 4: Technique list */}
          {selectedNotationData && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold border ${getCatColor(selectedNotationData.category)}`}
                >
                  {selectedNotationData.code}
                </span>
                <h2 className="text-lg font-semibold">
                  {getNotationLabel(selectedNotationData)}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({selectedNotationData.techniques.length}
                  {language === "ja" ? "本" : ""})
                </span>
              </div>

              <div className="border rounded-xl bg-card/90 overflow-hidden divide-y divide-border/50">
                {selectedNotationData.techniques.map((tech) =>
                  renderTechniqueRow(tech, selectedNotationData.code)
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
