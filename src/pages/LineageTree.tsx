import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SimpleLineageTree } from "@/components/lineage/SimpleLineageTree";
import { LineageFilters } from "@/components/lineage/LineageFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, List } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";

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
  organization?: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
  };
}

interface LineageRelation {
  id: string;
  instructor_id: string;
  student_id: string;
  belt_level: string | null;
  notes: string | null;
}

interface LineageNode {
  celebrity: Celebrity;
  students: LineageNode[];
}

export default function LineageTree() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [lineageRoots, setLineageRoots] = useState<LineageNode[]>([]);
  const [allCelebrities, setAllCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeltLevel, setSelectedBeltLevel] = useState<string | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  useEffect(() => {
    const titles = {
      ja: "系譜ツリー | jiuflow",
      en: "Lineage Tree | jiuflow",
      pt: "Árvore de Linhagem | jiuflow"
    };
    
    const descriptions = {
      ja: "ブラジリアン柔術の系譜を可視化。師弟関係、帯のレベル、組織別に系統図を確認できます。",
      en: "Visualize Brazilian Jiu-Jitsu lineage. View instructor-student relationships, belt levels, and organizational trees.",
      pt: "Visualize a linhagem do Jiu-Jitsu Brasileiro. Veja relacionamentos instrutor-aluno, níveis de faixa e árvores organizacionais."
    };
    
    document.title = titles[language] || titles.ja;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptions[language] || descriptions.ja);
    }
  }, [language]);

  useEffect(() => {
    loadLineageTree();
  }, []);

  const loadLineageTree = async () => {
    try {
      setIsLoading(true);

      // Fetch all celebrities with their organizations
      const { data: celebrities, error: celebError } = await supabase
        .from("celebrities")
        .select(`
          *,
          organization:organizations(*)
        `)
        .order("display_name");

      if (celebError) throw celebError;

      // Fetch all lineage relationships
      const { data: lineages, error: lineageError } = await supabase
        .from("celebrity_lineage")
        .select("*");

      if (lineageError) throw lineageError;

      setAllCelebrities(celebrities || []);

      // Build the tree structure
      const tree = buildLineageTree(celebrities || [], lineages || []);
      setLineageRoots(tree);
    } catch (error) {
      console.error("Error loading lineage tree:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildLineageTree = (
    celebrities: Celebrity[],
    lineages: LineageRelation[]
  ): LineageNode[] => {
    const celebMap = new Map<string, Celebrity>();
    celebrities.forEach((c) => celebMap.set(c.id, c));

    const childrenMap = new Map<string, string[]>();
    lineages.forEach((lineage) => {
      if (!childrenMap.has(lineage.instructor_id)) {
        childrenMap.set(lineage.instructor_id, []);
      }
      childrenMap.get(lineage.instructor_id)!.push(lineage.student_id);
    });

    const instructorIds = new Set(lineages.map((l) => l.instructor_id));
    const studentIds = new Set(lineages.map((l) => l.student_id));
    const rootIds = [...instructorIds].filter((id) => !studentIds.has(id));

    const buildNode = (celebId: string): LineageNode | null => {
      const celebrity = celebMap.get(celebId);
      if (!celebrity) return null;

      const studentIds = childrenMap.get(celebId) || [];
      const students = studentIds
        .map((id) => buildNode(id))
        .filter((node): node is LineageNode => node !== null);

      return { celebrity, students };
    };

    return rootIds
      .map((id) => buildNode(id))
      .filter((node): node is LineageNode => node !== null);
  };

  const filterNodes = (nodes: LineageNode[]): LineageNode[] => {
    return nodes
      .map((node) => {
        const matchesSearch =
          !searchQuery ||
          node.celebrity.display_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesBelt =
          !selectedBeltLevel ||
          (node.celebrity.belt_history &&
            Array.isArray(node.celebrity.belt_history) &&
            node.celebrity.belt_history.some(
              (belt: any) => belt.belt === selectedBeltLevel
            ));

        const matchesFeatured =
          !showFeaturedOnly || node.celebrity.featured;

        const filteredStudents = filterNodes(node.students);

        if (
          matchesSearch &&
          matchesBelt &&
          matchesFeatured
        ) {
          return { ...node, students: filteredStudents };
        } else if (filteredStudents.length > 0) {
          return { ...node, students: filteredStudents };
        }

        return null;
      })
      .filter((node): node is LineageNode => node !== null);
  };

  const filteredRoots = filterNodes(lineageRoots);

  const beltLevels = [
    "White",
    "Blue",
    "Purple",
    "Brown",
    "Black",
    "Coral",
    "Red",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 pt-20 md:pt-28 pb-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight mb-2 md:mb-4 text-foreground">
                {language === "ja" ? "系譜ツリー" : language === "pt" ? "Árvore de Linhagem" : language === "es" ? "Árbol de Linaje" : language === "fr" ? "Arbre Généalogique" : language === "de" ? "Stammbaum" : language === "zh" ? "传承树" : language === "ko" ? "계보 트리" : language === "it" ? "Albero Genealogico" : language === "ru" ? "Древо Наследия" : language === "ar" ? "شجرة النسب" : language === "hi" ? "वंश वृक्ष" : "Lineage Tree"}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                {language === "ja" ? "ブラジリアン柔術マスターの系譜と繋がりを探る" : language === "pt" ? "Explore as conexões e herança dos mestres de Jiu-Jitsu Brasileiro" : language === "es" ? "Explora las conexiones y herencia de los maestros de Jiu-Jitsu Brasileño" : language === "fr" ? "Explorez les connexions et l'héritage des maîtres de Jiu-Jitsu Brésilien" : language === "de" ? "Erkunden Sie die Verbindungen und das Erbe der brasilianischen Jiu-Jitsu-Meister" : language === "zh" ? "探索巴西柔术大师的传承与联系" : language === "ko" ? "브라질리언 주짓수 마스터들의 연결과 유산을 탐험하세요" : language === "it" ? "Esplora le connessioni e l'eredità dei maestri di Jiu-Jitsu Brasiliano" : language === "ru" ? "Исследуйте связи и наследие мастеров бразильского джиу-джитсу" : language === "ar" ? "استكشف روابط وتراث أساتذة الجيو جيتسو البرازيلي" : language === "hi" ? "ब्राज़ीलियन जिउ-जित्सु मास्टर्स की विरासत और संबंधों का अन्वेषण करें" : "Explore the connections and heritage of Brazilian Jiu-Jitsu masters"}
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link to="/athletes" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                {language === "ja" ? "一覧表示" : language === "pt" ? "Ver Lista" : "View List"}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("lineageTree.searchPlaceholder", "Search by name...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <LineageFilters
            beltLevels={beltLevels}
            selectedBeltLevel={selectedBeltLevel}
            showFeaturedOnly={showFeaturedOnly}
            onBeltLevelChange={setSelectedBeltLevel}
            onFeaturedChange={setShowFeaturedOnly}
          />
        </div>

        <SimpleLineageTree
          roots={filteredRoots}
          isLoading={isLoading}
        />
      </main>

      <Footer />
    </div>
  );
}
