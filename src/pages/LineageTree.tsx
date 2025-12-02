import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { InteractiveLineageTree } from "@/components/lineage/InteractiveLineageTree";
import { LineageFilters } from "@/components/lineage/LineageFilters";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Celebrity {
  id: string;
  display_name: string;
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
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            {t("lineageTree.title", "Martial Arts Lineage Tree")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "lineageTree.description",
              "Explore the connections and heritage of Brazilian Jiu-Jitsu masters"
            )}
          </p>
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

        <InteractiveLineageTree
          roots={filteredRoots}
          isLoading={isLoading}
        />
      </main>

      <Footer />
    </div>
  );
}
