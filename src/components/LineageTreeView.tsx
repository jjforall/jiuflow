import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowDown, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  const renderNode = (node: LineageNode, depth: number = 0) => {
    const belt = getBeltName(node.celebrity.belt_history);
    
    return (
      <div key={node.celebrity.id} className="relative">
        <Link 
          to={`/athlete/${node.celebrity.id}`}
          className="block transition-transform hover:scale-105"
        >
          <Card className="inline-block">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={node.celebrity.avatar_url || undefined} />
                  <AvatarFallback>{node.celebrity.display_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{node.celebrity.display_name}</p>
                  {belt && (
                    <p className="text-sm text-muted-foreground">{belt}</p>
                  )}
                  {node.students.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3" />
                      <span>{node.students.length} 弟子</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {node.students.length > 0 && (
          <div className="ml-8 mt-4 space-y-4 border-l-2 border-border pl-8">
            <div className="absolute left-0 top-20 h-4 w-8 border-b-2 border-l-2 border-border rounded-bl" />
            {node.students.map((student, idx) => (
              <div key={student.celebrity.id} className="relative">
                {idx > 0 && (
                  <div className="absolute -left-8 -top-4 h-8 border-l-2 border-border" />
                )}
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
    <div className="space-y-12">
      {lineageRoots.map(root => (
        <div key={root.celebrity.id}>
          {renderNode(root)}
        </div>
      ))}
    </div>
  );
};
