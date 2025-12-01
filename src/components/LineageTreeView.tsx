import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Celebrity {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
}

interface LineageNode {
  celebrity: Celebrity;
  students: LineageNode[];
}

export const LineageTreeView = () => {
  const [lineageRoots, setLineageRoots] = useState<LineageNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLineageTree();
  }, []);

  const loadLineageTree = async () => {
    setIsLoading(true);
    try {
      // Load all celebrities
      const { data: celebrities, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .order('display_name');

      if (celebError) throw celebError;

      // Load all lineage relationships
      const { data: lineages, error: lineageError } = await supabase
        .from('celebrity_lineage')
        .select('*');

      if (lineageError) throw lineageError;

      // Build tree structure
      const celebMap = new Map<string, Celebrity>();
      celebrities?.forEach(c => celebMap.set(c.id, c));

      // Find roots (celebrities with no instructors)
      const studentsSet = new Set(lineages?.map(l => l.student_id) || []);
      const roots = celebrities?.filter(c => !studentsSet.has(c.id)) || [];

      // Build tree recursively
      const buildTree = (celebrityId: string): LineageNode => {
        const celebrity = celebMap.get(celebrityId)!;
        const studentRelations = lineages?.filter(l => l.instructor_id === celebrityId) || [];
        const students = studentRelations.map(rel => buildTree(rel.student_id));
        
        return { celebrity, students };
      };

      const trees = roots.map(root => buildTree(root.id));
      setLineageRoots(trees);
    } catch (error) {
      console.error('Error loading lineage tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBeltName = (beltHistory: any): string => {
    if (!beltHistory || !Array.isArray(beltHistory) || beltHistory.length === 0) {
      return '';
    }
    return beltHistory[beltHistory.length - 1]?.belt || '';
  };

  const getEraInfo = (name: string) => {
    if (name.includes('嘉納治五郎') || name.includes('Kano Jigoro')) {
      return { era: '講道館柔道', year: '1882年', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' };
    }
    if (name.includes('前田光世') || name.includes('Mitsuyo Maeda')) {
      return { era: '講道館四天王', year: '1878-1941', color: 'from-red-500/20 to-rose-500/20 border-red-500/30' };
    }
    if (name.includes('Carlos Gracie') || name.includes('Helio Gracie')) {
      return { era: 'グレイシー柔術', year: '1925年～', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' };
    }
    return { era: 'ブラジリアン柔術', year: '現代', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' };
  };

  const renderNode = (node: LineageNode, depth: number = 0) => {
    const belt = getBeltName(node.celebrity.belt_history);
    const eraInfo = getEraInfo(node.celebrity.display_name);
    
    return (
      <div key={node.celebrity.id} className="relative animate-fade-in">
        <Link 
          to={`/athlete/${node.celebrity.id}`}
          className="block group"
        >
          <Card className={`inline-block bg-gradient-to-br ${eraInfo.color} border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 ring-2 ring-background shadow-lg">
                  <AvatarImage src={node.celebrity.avatar_url || undefined} />
                  <AvatarFallback className="text-lg font-bold">{node.celebrity.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                      {node.celebrity.display_name}
                    </h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {eraInfo.era}
                    </Badge>
                  </div>
                  
                  {belt && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{belt}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{eraInfo.year}</span>
                  </div>
                  
                  {node.students.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{node.students.length}人の弟子</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {node.students.length > 0 && (
          <div className="relative mt-6 ml-12 space-y-6">
            {/* Vertical connection line with gradient */}
            <div className="absolute left-0 top-0 bottom-6 w-0.5 bg-gradient-to-b from-primary/50 to-primary/20" />
            
            {node.students.map((student, idx) => (
              <div key={student.celebrity.id} className="relative pl-12">
                {/* Horizontal connection line */}
                <div className="absolute left-0 top-10 h-0.5 w-12 bg-gradient-to-r from-primary/50 to-primary/20">
                  <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary/60 animate-pulse" />
                </div>
                {renderNode(student, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full max-w-md" />
        <div className="ml-8 space-y-4">
          <Skeleton className="h-24 w-full max-w-md" />
          <Skeleton className="h-24 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (lineageRoots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          系統図データがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-16 py-8">
      {/* Historical timeline header */}
      <div className="text-center space-y-3 animate-fade-in">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-500 via-red-500 to-purple-500 bg-clip-text text-transparent">
          武道の系譜
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          日本古流柔術から講道館柔道、そしてブラジリアン柔術へと受け継がれてきた技術と精神の歴史
        </p>
      </div>

      {lineageRoots.map((root, idx) => (
        <div key={root.celebrity.id} className="relative" style={{ animationDelay: `${idx * 100}ms` }}>
          {renderNode(root)}
        </div>
      ))}
    </div>
  );
};
