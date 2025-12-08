import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Trophy, Info, ExternalLink, Building2, ArrowLeft, Globe, Users, UserPlus, UserMinus, AlertCircle, Clock, FileText } from "lucide-react";
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
  description: string | null;
  description_ja: string | null;
  registration_url: string | null;
  registration_deadline: string | null;
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
  const { t } = useTranslation();
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
      toast.success(t('tournaments.addedToPlan'));
    },
    onError: () => {
      toast.error(t('tournaments.errorOccurred'));
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
      toast.success(t('tournaments.removedFromPlan'));
    },
    onError: () => {
      toast.error(t('tournaments.errorOccurred'));
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
  const getDescription = (t: Tournament) => language === 'ja' && t.description_ja ? t.description_ja : t.description;

  const getCategoryBadge = (category: string, isInternational: boolean) => {
    if (category === 'major' || category === 'international') {
      return <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">{t('tournaments.major')}</Badge>;
    }
    if (isInternational) {
      return <Badge variant="secondary">{t('tournaments.international')}</Badge>;
    }
    return <Badge variant="outline">{t('tournaments.domestic')}</Badge>;
  };

  const getOrganizerBadge = (organizer: string) => {
    const colors: Record<string, string> = {
      'ASJJF': 'bg-red-500/10 text-red-500 border-red-500/30',
      'JBJJF': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      'IBJJF': 'bg-blue-600/10 text-blue-600 border-blue-600/30',
      'ADCC': 'bg-green-500/10 text-green-500 border-green-500/30',
      'AJP': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      'SJJIF': 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    };
    return <Badge variant="outline" className={colors[organizer] || ''}>{organizer}</Badge>;
  };

  const getCountryBadge = (country: string) => {
    const name = t(`tournaments.countries.${country}`, country);
    return (
      <Badge variant="outline" className="text-xs font-medium">
        {name}
      </Badge>
    );
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
              {t('tournaments.notFound')}
            </h1>
            <Button asChild>
              <Link to="/tournaments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('tournaments.backToList')}
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
            {t('tournaments.backToList')}
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto space-y-6">
          <Card className={isPast ? 'opacity-75' : ''}>
            <CardContent className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getCategoryBadge(tournament.category, tournament.is_international)}
                  {getOrganizerBadge(tournament.organizer)}
                  {getCountryBadge(tournament.country)}
                  {isPast && (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      {t('tournaments.past')}
                    </Badge>
                  )}
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 leading-tight">{getName(tournament)}</h1>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-foreground">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{formatDateRange(tournament.date_start, tournament.date_end)}</p>
                    {tournament.date_end && tournament.date_start !== tournament.date_end && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const start = parseISO(tournament.date_start);
                          const end = parseISO(tournament.date_end);
                          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return `${days} ${t('tournaments.days')}`;
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-foreground">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">{getLocation(tournament)}</p>
                    {tournament.is_international && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Globe className="h-3 w-3" />
                        {t('tournaments.internationalEvent')}
                      </div>
                    )}
                  </div>
                </div>

                {getVenue(tournament) && (
                  <div className="flex items-start gap-3 text-foreground">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="font-medium text-sm sm:text-base">{getVenue(tournament)}</p>
                  </div>
                )}

                <div className="flex items-start gap-3 text-foreground">
                  <Trophy className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="font-medium text-sm sm:text-base">{tournament.organizer}</p>
                </div>

                {/* Registration Deadline */}
                {tournament.registration_deadline && !isPast && (
                  <div className="flex items-start gap-3 text-foreground">
                    <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">
                        {t('tournaments.registrationDeadline')}
                      </p>
                      <p className={`text-xs sm:text-sm ${
                        isBefore(parseISO(tournament.registration_deadline), now) 
                          ? 'text-muted-foreground line-through' 
                          : 'text-orange-500 font-semibold'
                      }`}>
                        {format(parseISO(tournament.registration_deadline), language === 'ja' ? 'M月d日(E)' : 'MMM d (EEE)', { locale: getLocale() })}
                        {!isBefore(parseISO(tournament.registration_deadline), now) && (
                          <span className="ml-1.5">
                            ({(() => {
                              const days = Math.ceil((parseISO(tournament.registration_deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              if (days === 0) return t('tournaments.today');
                              if (days < 0) return t('tournaments.closed');
                              return t('tournaments.daysLeft').replace('{days}', String(days));
                            })()})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {getDescription(tournament) && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-xs mb-1">
                          {t('tournaments.about')}
                        </p>
                        <p className="text-foreground text-sm">{getDescription(tournament)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {getNotes(tournament) && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2.5">
                      <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-muted-foreground text-sm">{getNotes(tournament)}</p>
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
                          {t('tournaments.cancelParticipation')}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => joinMutation.mutate()}
                          disabled={joinMutation.isPending}
                        >
                          <UserPlus className="h-5 w-5 mr-2" />
                          {t('tournaments.planToParticipate')}
                        </Button>
                      )
                    ) : (
                      <Button variant="outline" asChild className="w-full">
                        <Link to="/login">
                          <UserPlus className="h-5 w-5 mr-2" />
                          {t('tournaments.loginToJoin')}
                        </Link>
                      </Button>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {t('tournaments.participationNote')}
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
                      {t('tournaments.openRegistration')}
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
                  {t('tournaments.participants')}
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
                          {participant.profiles?.display_name || t('tournaments.anonymous')}
                        </p>
                        {participant.weight_class && (
                          <p className="text-sm text-muted-foreground">{participant.weight_class}</p>
                        )}
                      </div>
                      {participant.status === 'registered' && (
                        <Badge variant="default" className="bg-green-500">
                          {t('tournaments.registered')}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  {t('tournaments.noParticipants')}
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
