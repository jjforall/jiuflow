import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Celebrity {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
  home_dojo: string | null;
}

interface LineageRelation {
  instructor: Celebrity;
  student: Celebrity;
  belt_level: string | null;
  notes: string | null;
}

interface LineageTreeProps {
  celebrityId: string;
}

export const LineageTree = ({ celebrityId }: LineageTreeProps) => {
  const { language } = useLanguage();
  const [instructors, setInstructors] = useState<LineageRelation[]>([]);
  const [students, setStudents] = useState<LineageRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLineage();
  }, [celebrityId]);

  const loadLineage = async () => {
    setIsLoading(true);
    try {
      // Load instructors (who taught this person)
      const { data: instructorData, error: instructorError } = await supabase
        .from('celebrity_lineage')
        .select(`
          belt_level,
          notes,
          instructor:celebrities!celebrity_lineage_instructor_id_fkey (
            id,
            display_name,
            avatar_url,
            belt_history,
            home_dojo
          )
        `)
        .eq('student_id', celebrityId);

      if (instructorError) throw instructorError;

      // Load students (who this person taught)
      const { data: studentData, error: studentError } = await supabase
        .from('celebrity_lineage')
        .select(`
          belt_level,
          notes,
          student:celebrities!celebrity_lineage_student_id_fkey (
            id,
            display_name,
            avatar_url,
            belt_history,
            home_dojo
          )
        `)
        .eq('instructor_id', celebrityId);

      if (studentError) throw studentError;

      setInstructors(instructorData?.map(d => ({
        instructor: d.instructor as Celebrity,
        student: {} as Celebrity,
        belt_level: d.belt_level,
        notes: d.notes
      })) || []);

      setStudents(studentData?.map(d => ({
        instructor: {} as Celebrity,
        student: d.student as Celebrity,
        belt_level: d.belt_level,
        notes: d.notes
      })) || []);
    } catch (error) {
      console.error('Error loading lineage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBeltName = (beltHistory: any[]) => {
    if (!beltHistory || beltHistory.length === 0) return null;
    const latestBelt = beltHistory[beltHistory.length - 1];
    return latestBelt?.belt;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🥋 {language === "ja" ? "系統図" : language === "pt" ? "Linhagem" : "Lineage"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (instructors.length === 0 && students.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🥋 {language === "ja" ? "系統図" : language === "pt" ? "Linhagem" : "Lineage"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructors (upward lineage) */}
        {instructors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowUp className="w-4 h-4" />
              {language === "ja" ? "師匠" : language === "pt" ? "Instrutores" : "Instructors"}
            </div>
            {instructors.map((relation, index) => (
              <Link
                key={index}
                to={`/athlete/${relation.instructor.id}`}
                className="block"
              >
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary transition-colors hover:bg-accent/50">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    <AvatarImage src={relation.instructor.avatar_url || undefined} />
                    <AvatarFallback>
                      {relation.instructor.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                      {relation.instructor.display_name}
                    </h4>
                    {getBeltName(relation.instructor.belt_history) && (
                      <BeltBadge belt={getBeltName(relation.instructor.belt_history)!} className="text-xs mt-1" />
                    )}
                    {relation.instructor.home_dojo && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {relation.instructor.home_dojo}
                      </p>
                    )}
                    {relation.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        {relation.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Students (downward lineage) */}
        {students.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowDown className="w-4 h-4" />
              {language === "ja" ? "弟子" : language === "pt" ? "Alunos" : "Students"}
            </div>
            {students.map((relation, index) => (
              <Link
                key={index}
                to={`/athlete/${relation.student.id}`}
                className="block"
              >
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary transition-colors hover:bg-accent/50">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    <AvatarImage src={relation.student.avatar_url || undefined} />
                    <AvatarFallback>
                      {relation.student.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                      {relation.student.display_name}
                    </h4>
                    {getBeltName(relation.student.belt_history) && (
                      <BeltBadge belt={getBeltName(relation.student.belt_history)!} className="text-xs mt-1" />
                    )}
                    {relation.student.home_dojo && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {relation.student.home_dojo}
                      </p>
                    )}
                    {relation.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        {relation.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
