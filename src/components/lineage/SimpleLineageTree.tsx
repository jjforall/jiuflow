import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Celebrity {
  id: string;
  display_name: string;
  name_en: string | null;
  name_ja: string | null;
  name_pt: string | null;
  name_es: string | null;
  name_fr: string | null;
  name_de: string | null;
  name_zh: string | null;
  name_ko: string | null;
  name_it: string | null;
  name_ru: string | null;
  name_ar: string | null;
  name_hi: string | null;
  avatar_url: string | null;
  belt_history: any;
  organization_id: string | null;
  featured: boolean;
}

interface LineageNode {
  celebrity: Celebrity;
  students: LineageNode[];
}

interface SimpleLineageTreeProps {
  roots: LineageNode[];
  isLoading: boolean;
}

const getBeltName = (beltHistory: any): string => {
  if (!beltHistory || !Array.isArray(beltHistory) || beltHistory.length === 0) return "Unknown";
  return beltHistory[beltHistory.length - 1]?.belt || "Unknown";
};

const getBeltStyle = (belt: string): string => {
  const styles: Record<string, string> = {
    White: "bg-gray-200 border-gray-300",
    Blue: "bg-blue-500 border-blue-600",
    Purple: "bg-purple-500 border-purple-600",
    Brown: "bg-amber-700 border-amber-800",
    Black: "bg-zinc-900 border-zinc-950",
    Coral: "bg-gradient-to-r from-red-400 to-white border-red-500",
    Red: "bg-red-600 border-red-700",
  };
  return styles[belt] || "bg-gray-400 border-gray-500";
};

const getBeltTranslation = (belt: string, language: string): string => {
  const translations: Record<string, Record<string, string>> = {
    White: { ja: "白帯", en: "White", pt: "Branca" },
    Blue: { ja: "青帯", en: "Blue", pt: "Azul" },
    Purple: { ja: "紫帯", en: "Purple", pt: "Roxa" },
    Brown: { ja: "茶帯", en: "Brown", pt: "Marrom" },
    Black: { ja: "黒帯", en: "Black", pt: "Preta" },
    Coral: { ja: "コーラル帯", en: "Coral", pt: "Coral" },
    Red: { ja: "赤帯", en: "Red", pt: "Vermelha" },
    Unknown: { ja: "不明", en: "Unknown", pt: "Desconhecido" },
  };
  return translations[belt]?.[language] || belt;
};

function LineageNodeCard({ node, depth = 0, language }: { node: LineageNode; depth?: number; language: string }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const belt = getBeltName(node.celebrity.belt_history);
  const beltStyle = getBeltStyle(belt);
  const beltLabel = getBeltTranslation(belt, language);
  const hasStudents = node.students.length > 0;

  // Get localized name based on current language
  const getLocalizedName = (): string | null => {
    const nameMap: Record<string, string | null> = {
      ja: node.celebrity.name_ja,
      en: node.celebrity.name_en,
      pt: node.celebrity.name_pt,
      es: node.celebrity.name_es,
      fr: node.celebrity.name_fr,
      de: node.celebrity.name_de,
      zh: node.celebrity.name_zh,
      ko: node.celebrity.name_ko,
      it: node.celebrity.name_it,
      ru: node.celebrity.name_ru,
      ar: node.celebrity.name_ar,
      hi: node.celebrity.name_hi,
    };
    return nameMap[language] || null;
  };

  const localizedName = getLocalizedName();
  const englishName = node.celebrity.name_en || node.celebrity.display_name;
  const showBothNames = localizedName && language !== 'en' && localizedName !== englishName;

  return (
    <div className="relative">
      {/* Vertical line connecting to parent */}
      {depth > 0 && (
        <div className="absolute left-5 -top-3 w-0.5 h-3 bg-border" />
      )}
      
      <div className={cn(
        "relative",
        depth > 0 && "ml-4 md:ml-6"
      )}>
        {/* Horizontal line for children */}
        {depth > 0 && (
          <div className="absolute left-0 top-5 w-4 md:w-6 h-0.5 bg-border -translate-x-full" />
        )}

        {/* Main card */}
        <div
          className={cn(
            "flex items-center gap-3 p-2.5 md:p-3 rounded-xl border bg-card transition-all",
            hasStudents && "cursor-pointer hover:bg-accent/50",
            node.celebrity.featured && "ring-2 ring-primary/30"
          )}
          onClick={() => hasStudents && setIsExpanded(!isExpanded)}
        >
          {/* Expand/Collapse button */}
          {hasStudents ? (
            <button className="shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Avatar with belt indicator */}
          <Link 
            to={`/athlete/${node.celebrity.id}`}
            className="shrink-0 relative group"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-border group-hover:border-primary transition-colors">
              <AvatarImage
                src={node.celebrity.avatar_url || ""}
                alt={node.celebrity.display_name}
              />
              <AvatarFallback className="text-xs md:text-sm font-medium">
                {node.celebrity.display_name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {/* Belt color indicator */}
            <div 
              className={cn(
                "absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full border",
                beltStyle
              )}
            />
          </Link>

          {/* Name and info */}
          <div className="flex-1 min-w-0">
            <Link 
              to={`/athlete/${node.celebrity.id}`}
              className="font-medium text-sm md:text-base hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="line-clamp-1">
                {showBothNames ? localizedName : (localizedName || englishName)}
              </span>
              {showBothNames && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({englishName})
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{beltLabel}</span>
              {node.celebrity.featured && <span className="text-amber-500">★</span>}
            </div>
          </div>

          {/* Student count badge */}
          {hasStudents && (
            <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Users className="w-3 h-3" />
              <span>{node.students.length}</span>
            </div>
          )}
        </div>

        {/* Children */}
        {hasStudents && isExpanded && (
          <div className="mt-3 pl-5 border-l border-border space-y-3">
            {node.students.map((student) => (
              <LineageNodeCard 
                key={student.celebrity.id} 
                node={student} 
                depth={depth + 1}
                language={language}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SimpleLineageTree({ roots, isLoading }: SimpleLineageTreeProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const getInstructions = () => {
    const instructions: Record<string, string> = {
      ja: "タップして弟子を表示 • 名前をタップでプロフィールへ",
      en: "Tap to show students • Tap name for profile",
      pt: "Toque para mostrar alunos • Toque no nome para perfil"
    };
    return instructions[language] || instructions.en;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className="p-8 md:p-12 text-center border rounded-xl bg-card">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {t("lineageTree.noResults", "No lineage data found matching your filters.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center p-3 rounded-lg bg-muted/50 text-xs">
        {["White", "Blue", "Purple", "Brown", "Black", "Coral", "Red"].map((belt) => (
          <div key={belt} className="flex items-center gap-1.5">
            <div className={cn("w-4 h-1.5 rounded-full border", getBeltStyle(belt))} />
            <span className="text-muted-foreground">{getBeltTranslation(belt, language)}</span>
          </div>
        ))}
      </div>

      {/* Tree */}
      <div className="space-y-4">
        {roots.map((root) => (
          <LineageNodeCard key={root.celebrity.id} node={root} language={language} />
        ))}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        {getInstructions()}
      </p>
    </div>
  );
}
