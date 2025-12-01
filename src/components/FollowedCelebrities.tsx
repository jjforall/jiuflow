import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BeltBadge } from "@/components/ui/belt-badge";

interface FollowedPerson {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
  featured: boolean;
  user_id: string | null;
  is_celebrity: boolean;
}

interface FollowedCelebritiesProps {
  userId: string;
}

export const FollowedCelebrities = ({ userId }: FollowedCelebritiesProps) => {
  const { language } = useLanguage();
  const [followedPeople, setFollowedPeople] = useState<FollowedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFollowedCelebrities();
  }, [userId]);

  const loadFollowedCelebrities = async () => {
    setIsLoading(true);
    try {
      const allFollowed: FollowedPerson[] = [];

      // Get celebrity follows
      const { data: celebrityFollows, error: celebrityFollowsError } = await supabase
        .from('celebrity_follows')
        .select('celebrity_id')
        .eq('user_id', userId);

      if (!celebrityFollowsError && celebrityFollows && celebrityFollows.length > 0) {
        const celebrityIds = celebrityFollows.map(f => f.celebrity_id);
        
        const { data: celebs, error: celebsError } = await supabase
          .from('celebrities')
          .select('id, display_name, avatar_url, belt_history, featured, user_id')
          .in('id', celebrityIds);

        if (!celebsError && celebs) {
          allFollowed.push(...celebs.map(c => ({
            ...c,
            is_celebrity: true
          })));
        }
      }

      // Get user follows
      const { data: userFollows, error: userFollowsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (!userFollowsError && userFollows && userFollows.length > 0) {
        const followingIds = userFollows.map(f => f.following_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, belt_history, username')
          .in('id', followingIds);

        if (!profilesError && profiles) {
          allFollowed.push(...profiles.map(p => ({
            id: p.id,
            display_name: p.display_name || p.username || 'Unknown',
            avatar_url: p.avatar_url,
            belt_history: p.belt_history,
            featured: false,
            user_id: p.id,
            is_celebrity: false
          })));
        }
      }

      // Sort: featured first, then by name
      allFollowed.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

      setFollowedPeople(allFollowed);
    } catch (error) {
      console.error('Error loading followed people:', error);
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
          {language === "ja" ? "フォロー中" : language === "pt" ? "Seguindo" : "Following"}
        </h3>
      </div>

      {followedPeople.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              {language === "ja" 
                ? "まだ誰もフォローしていません" 
                : language === "pt" 
                ? "Você ainda não segue ninguém" 
                : "You're not following anyone yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {followedPeople.map((person) => (
            <Link
              key={person.id}
              to={person.is_celebrity ? `/athlete/${person.user_id || person.id}` : `/profile/${person.user_id}`}
              className="group"
            >
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="relative">
                  <Avatar className="h-14 w-14 border border-border group-hover:border-primary transition-colors">
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {person.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {person.featured && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                  )}
                </div>
                <div className="text-center w-full">
                  <p className="font-medium text-xs truncate group-hover:text-primary transition-colors">
                    {person.display_name}
                  </p>
                  {getBeltName(person.belt_history) && (
                    <BeltBadge 
                      belt={getBeltName(person.belt_history)!} 
                      className="text-[10px] px-1.5 py-0 mt-0.5 inline-block"
                    />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
