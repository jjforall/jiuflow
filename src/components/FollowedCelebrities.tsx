import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BeltBadge } from "@/components/ui/belt-badge";

interface Celebrity {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
  home_dojo: string | null;
  featured: boolean;
  user_id: string | null;
}

interface FollowedCelebritiesProps {
  userId: string;
}

export const FollowedCelebrities = ({ userId }: FollowedCelebritiesProps) => {
  const { language } = useLanguage();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFollowedCelebrities();
  }, [userId]);

  const loadFollowedCelebrities = async () => {
    setIsLoading(true);
    try {
      // Get celebrity follows
      const { data: follows, error: followsError } = await supabase
        .from('celebrity_follows')
        .select('celebrity_id')
        .eq('user_id', userId);

      if (followsError) throw followsError;

      if (!follows || follows.length === 0) {
        setCelebrities([]);
        setIsLoading(false);
        return;
      }

      const celebrityIds = follows.map(f => f.celebrity_id);

      // Get celebrity details
      const { data: celebs, error: celebsError } = await supabase
        .from('celebrities')
        .select('id, display_name, avatar_url, belt_history, home_dojo, featured, user_id')
        .in('id', celebrityIds)
        .order('featured', { ascending: false })
        .order('display_name', { ascending: true });

      if (celebsError) throw celebsError;
      setCelebrities(celebs || []);
    } catch (error) {
      console.error('Error loading followed celebrities:', error);
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5" />
            {language === "ja" ? "フォロー中の選手" : language === "pt" ? "Atletas Seguidos" : "Following Athletes"}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5" />
          {language === "ja" ? "フォロー中の選手" : language === "pt" ? "Atletas Seguidos" : "Following Athletes"}
        </h3>
        <Link to="/athletes">
          <Button variant="ghost" size="sm" className="gap-2">
            {language === "ja" ? "もっと見る" : language === "pt" ? "Ver mais" : "View All"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {celebrities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              {language === "ja" 
                ? "まだフォローしている選手がいません" 
                : language === "pt" 
                ? "Você ainda não segue nenhum atleta" 
                : "You're not following any athletes yet"}
            </p>
            <Link to="/athletes">
              <Button variant="outline" className="w-full gap-2">
                {language === "ja" ? "選手を探す" : language === "pt" ? "Encontrar Atletas" : "Find Athletes"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {celebrities.slice(0, 4).map((celebrity) => (
            <Link
              key={celebrity.id}
              to={`/athlete/${celebrity.user_id || celebrity.id}`}
              className="group"
            >
              <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-12 w-12 border border-border group-hover:border-primary transition-colors">
                      <AvatarImage src={celebrity.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {celebrity.display_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {celebrity.featured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {celebrity.display_name}
                  </h4>
                  {getBeltName(celebrity.belt_history) && (
                    <BeltBadge 
                      belt={getBeltName(celebrity.belt_history)!} 
                      className="text-xs px-2 py-0.5 mt-1"
                    />
                  )}
                  {celebrity.home_dojo && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {celebrity.home_dojo}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
