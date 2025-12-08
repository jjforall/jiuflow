import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Trophy, Info, ExternalLink, Building2, ArrowLeft, Globe, Users, UserPlus, UserMinus, AlertCircle } from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  date_start: string;
  date_end: string | null;
  location: string;
  location_ja: string | null;
  venue: string | null;
  venue_ja: string | null;
  organizer: string;
  country: string;
  is_international: boolean;
  category: string;
  notes: string | null;
  notes_ja: string | null;
  registration_url: string | null;
  slug: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  weight_class: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

const TournamentDetail = () => {
  const { year, slug } = useParams<{ year: string; slug: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ['tournament', year, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Tournament | null;
    }
  });

  const { data: participants } = useQuery({
    queryKey: ['tournament-participants', tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          user_id,
          status,
          weight_class,
          profiles (
            id,
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('tournament_id', tournament.id)
        .neq('status', 'canceled');
      
      if (error) throw error;
      return data as Participant[];
    },
    enabled: !!tournament?.id
  });

  const isParticipating = participants?.some(p => p.user_id === user?.id);

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tournament) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          status: 'planning'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-participants', tournament?.id] });
      toast.success(language === 'ja' ? '参加予定に登録しました' : 'Added to your plan');
    },
    onError: () => {
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tournament) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-participants', tournament?.id] });
      toast.success(language === 'ja' ? '参加予定を取り消しました' : 'Removed from your plan');
    },
    onError: () => {
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  });

  const getLocale = () => {
    switch (language) {
      case 'ja': return ja;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (language === 'ja') {
      return format(date, 'yyyy年M月d日(E)', { locale: ja });
    }
    return format(date, 'MMMM d, yyyy (EEE)', { locale: getLocale() });
  };

  const formatDateRange = (start: string, end: string | null) => {
    if (!end || start === end) return formatDate(start);
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (language === 'ja') {
      return `${format(startDate, 'yyyy年M月d日', { locale: ja })} - ${format(endDate, 'M月d日(E)', { locale: ja })}`;
    }
    return `${format(startDate, 'MMMM d', { locale: getLocale() })} - ${format(endDate, 'd, yyyy (EEE)', { locale: getLocale() })}`;
  };

  const getName = (t: Tournament) => language === 'ja' && t.name_ja ? t.name_ja : t.name;
  const getLocation = (t: Tournament) => language === 'ja' && t.location_ja ? t.location_ja : t.location;
  const getVenue = (t: Tournament) => language === 'ja' && t.venue_ja ? t.venue_ja : t.venue;
  const getNotes = (t: Tournament) => language === 'ja' && t.notes_ja ? t.notes_ja : t.notes;

  const getCategoryBadge = (category: string, isInternational: boolean) => {
    if (category === 'major' || category === 'international') {
      return <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">{language === 'ja' ? '主要大会' : 'Major'}</Badge>;
    }
    if (isInternational) {
      return <Badge variant="secondary">{language === 'ja' ? '国際' : 'International'}</Badge>;
    }
    return <Badge variant="outline">{language === 'ja' ? '国内' : 'Domestic'}</Badge>;
  };

  const getOrganizerBadge = (organizer: string) => {
    const colors: Record<string, string> = {
      'ASJJF': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      'JBJJF': 'bg-red-500/10 text-red-500 border-red-500/30',
      'IBJJF': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      'ADCC': 'bg-green-500/10 text-green-500 border-green-500/30',
      'AJP': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      'SJJIF': 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    };
    return <Badge variant="outline" className={colors[organizer] || ''}>{organizer}</Badge>;
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'JP': '🇯🇵',
      'US': '🇺🇸',
      'BR': '🇧🇷',
      'PT': '🇵🇹',
      'PL': '🇵🇱',
      'IT': '🇮🇹',
      'AE': '🇦🇪',
      'GB': '🇬🇧',
      'TH': '🇹🇭',
      'CN': '🇨🇳',
    };
    return flags[country] || '🌍';
  };

  const now = new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">
              {language === 'ja' ? '大会が見つかりません' : 'Tournament not found'}
            </h1>
            <Button asChild>
              <Link to="/tournaments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'ja' ? '大会一覧に戻る' : 'Back to Tournaments'}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPast = isBefore(parseISO(tournament.date_start), now);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ja' ? '大会一覧' : 'All Tournaments'}
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto space-y-6">
          <Card className={isPast ? 'opacity-75' : ''}>
            <CardContent className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(tournament.category, tournament.is_international)}
                  {getOrganizerBadge(tournament.organizer)}
                  {isPast && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {language === 'ja' ? '終了' : 'Past'}
                    </Badge>
                  )}
                </div>
                <span className="text-4xl">{getCountryFlag(tournament.country)}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold mb-6">{getName(tournament)}</h1>

              {/* Details */}
              <div className="space-y-5">
                <div className="flex items-start gap-4 text-foreground">
                  <Calendar className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-lg">{formatDateRange(tournament.date_start, tournament.date_end)}</p>
                    {tournament.date_end && tournament.date_start !== tournament.date_end && (
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const start = parseISO(tournament.date_start);
                          const end = parseISO(tournament.date_end);
                          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return language === 'ja' ? `${days}日間` : `${days} days`;
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4 text-foreground">
                  <MapPin className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{getLocation(tournament)}</p>
                    {tournament.is_international && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Globe className="h-3 w-3" />
                        {language === 'ja' ? '国際大会' : 'International Event'}
                      </div>
                    )}
                  </div>
                </div>

                {getVenue(tournament) && (
                  <div className="flex items-start gap-4 text-foreground">
                    <Building2 className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="font-medium">{getVenue(tournament)}</p>
                  </div>
                )}

                <div className="flex items-start gap-4 text-foreground">
                  <Trophy className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="font-medium">{tournament.organizer}</p>
                </div>

                {getNotes(tournament) && (
                  <div className="bg-muted/50 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-muted-foreground">{getNotes(tournament)}</p>
                    </div>
                  </div>
                )}

                {/* Participation Section */}
                {!isPast && (
                  <div className="border-t pt-6 mt-6 space-y-4">
                    {user ? (
                      isParticipating ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => leaveMutation.mutate()}
                          disabled={leaveMutation.isPending}
                        >
                          <UserMinus className="h-5 w-5 mr-2" />
                          {language === 'ja' ? '参加予定を取り消す' : 'Cancel Participation'}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => joinMutation.mutate()}
                          disabled={joinMutation.isPending}
                        >
                          <UserPlus className="h-5 w-5 mr-2" />
                          {language === 'ja' ? '参加予定' : 'Plan to Participate'}
                        </Button>
                      )
                    ) : (
                      <Button variant="outline" asChild className="w-full">
                        <Link to="/login">
                          <UserPlus className="h-5 w-5 mr-2" />
                          {language === 'ja' ? 'ログインして参加予定を登録' : 'Login to Join'}
                        </Link>
                      </Button>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {language === 'ja' 
                            ? '※「参加予定」はあくまで予定の共有です。本エントリーは必ず各主催者の公式ページから行ってください。' 
                            : '※ This is just for sharing your plans. Please register officially through the organizer\'s page.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {tournament.registration_url && (
                  <Button asChild className="w-full mt-6" size="lg">
                    <a
                      href={tournament.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      {language === 'ja' ? '公式登録ページを開く' : 'Open Official Registration'}
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Participants Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {language === 'ja' ? '参加予定者' : 'Participants'}
                </h2>
                <Badge variant="secondary">{participants?.length || 0}</Badge>
              </div>

              {participants && participants.length > 0 ? (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <Link
                      key={participant.id}
                      to={participant.profiles?.username ? `/${participant.profiles.username}` : '#'}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {participant.profiles?.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.profiles?.display_name || (language === 'ja' ? '名前未設定' : 'Anonymous')}
                        </p>
                        {participant.weight_class && (
                          <p className="text-sm text-muted-foreground">{participant.weight_class}</p>
                        )}
                      </div>
                      {participant.status === 'registered' && (
                        <Badge variant="default" className="bg-green-500">
                          {language === 'ja' ? '登録済' : 'Registered'}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  {language === 'ja' ? 'まだ参加予定者がいません' : 'No participants yet'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TournamentDetail;
