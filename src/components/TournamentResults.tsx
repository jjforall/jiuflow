import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import { Link } from "react-router-dom";

interface TournamentResult {
  id: string;
  weight_class: string;
  position: number;
  athlete_name: string;
  athlete_name_ja: string | null;
  team_name: string | null;
  team_name_ja: string | null;
  notes: string | null;
  notes_ja: string | null;
  user_id: string | null;
  celebrity_id: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
  celebrities?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    slug: string | null;
  } | null;
}

interface TournamentResultsProps {
  tournamentId: string;
}

export function TournamentResults({ tournamentId }: TournamentResultsProps) {
  const { language } = useLanguage();

  const { data: results, isLoading } = useQuery({
    queryKey: ['tournament-results', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_results')
        .select(`
          *,
          profiles:user_id (id, display_name, avatar_url, username),
          celebrities:celebrity_id (id, display_name, avatar_url, slug)
        `)
        .eq('tournament_id', tournamentId)
        .order('weight_class')
        .order('position');
      
      if (error) throw error;
      return data as TournamentResult[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  // Group results by weight class
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.weight_class]) {
      acc[result.weight_class] = [];
    }
    acc[result.weight_class].push(result);
    return acc;
  }, {} as Record<string, TournamentResult[]>);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">{position}位</span>;
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white">🥇 優勝</Badge>;
      case 2:
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">🥈 準優勝</Badge>;
      case 3:
        return <Badge variant="outline" className="border-amber-600 text-amber-600">🥉 3位</Badge>;
      default:
        return <Badge variant="outline">{position}位</Badge>;
    }
  };

  const getAthleteName = (result: TournamentResult) => {
    if (language === 'ja' && result.athlete_name_ja) {
      return result.athlete_name_ja;
    }
    return result.athlete_name;
  };

  const getTeamName = (result: TournamentResult) => {
    if (language === 'ja' && result.team_name_ja) {
      return result.team_name_ja;
    }
    return result.team_name;
  };

  const getAthleteAvatar = (result: TournamentResult) => {
    if (result.celebrities?.avatar_url) return result.celebrities.avatar_url;
    if (result.profiles?.avatar_url) return result.profiles.avatar_url;
    return null;
  };

  const getAthleteLink = (result: TournamentResult) => {
    if (result.celebrities?.slug) {
      return `/athletes/${result.celebrities.slug}`;
    }
    if (result.profiles?.username) {
      return `/${result.profiles.username}`;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {language === 'ja' ? '大会結果' : 'Tournament Results'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedResults).map(([weightClass, weightResults]) => (
          <div key={weightClass} className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide border-b pb-2">
              {weightClass}
            </h4>
            <div className="space-y-2">
              {weightResults.map((result) => {
                const link = getAthleteLink(result);
                const avatar = getAthleteAvatar(result);
                const athleteName = getAthleteName(result);
                const teamName = getTeamName(result);

                const content = (
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    link ? 'hover:bg-muted/50 cursor-pointer' : ''
                  } ${result.position === 1 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getPositionIcon(result.position)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatar || undefined} alt={athleteName} />
                      <AvatarFallback>{athleteName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{athleteName}</span>
                        {getPositionBadge(result.position)}
                      </div>
                      {teamName && (
                        <p className="text-sm text-muted-foreground truncate">{teamName}</p>
                      )}
                    </div>
                  </div>
                );

                return link ? (
                  <Link key={result.id} to={link}>
                    {content}
                  </Link>
                ) : (
                  <div key={result.id}>{content}</div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
