import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Trophy, Globe, Users } from "lucide-react";
import { format, parseISO, isAfter, isBefore, addMonths } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";

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

const Tournaments = () => {
  const { language } = useLanguage();
  const [showPastTournaments, setShowPastTournaments] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date_start', { ascending: true });
      
      if (error) throw error;
      return data as Tournament[];
    }
  });

  // Fetch participant counts for all tournaments
  const { data: participantCounts } = useQuery({
    queryKey: ['tournament-participant-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .neq('status', 'canceled');
      
      if (error) throw error;
      
      // Count participants per tournament
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
      });
      return counts;
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
      return format(date, 'M月d日(E)', { locale: ja });
    }
    return format(date, 'MMM d (EEE)', { locale: getLocale() });
  };

  const formatDateRange = (start: string, end: string | null) => {
    if (!end || start === end) return formatDate(start);
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (language === 'ja') {
      return `${format(startDate, 'M月d日', { locale: ja })} - ${format(endDate, 'd日(E)', { locale: ja })}`;
    }
    return `${format(startDate, 'MMM d', { locale: getLocale() })} - ${format(endDate, 'd (EEE)', { locale: getLocale() })}`;
  };

  const getName = (t: Tournament) => language === 'ja' && t.name_ja ? t.name_ja : t.name;
  const getLocation = (t: Tournament) => language === 'ja' && t.location_ja ? t.location_ja : t.location;
  const getVenue = (t: Tournament) => language === 'ja' && t.venue_ja ? t.venue_ja : t.venue;
  const getNotes = (t: Tournament) => language === 'ja' && t.notes_ja ? t.notes_ja : t.notes;

  const now = new Date();
  const threeMonthsLater = addMonths(now, 3);

  // Get unique organizers for filter
  const organizers = Array.from(new Set(tournaments?.map(t => t.organizer) || [])).sort();

  // Filter by organizer if selected
  const filterByOrganizer = (list: Tournament[] | undefined) => {
    if (!selectedOrganizer || !list) return list;
    return list.filter(t => t.organizer === selectedOrganizer);
  };

  // Filter by date (past/future)
  const filterByDate = (list: Tournament[] | undefined, checkFuture: boolean = true) => {
    if (!list) return list;
    if (showPastTournaments) return list;
    if (checkFuture) return list.filter(t => isAfter(parseISO(t.date_start), now));
    return list;
  };

  const upcomingTournaments = filterByOrganizer(tournaments?.filter(t => isAfter(parseISO(t.date_start), now) && isBefore(parseISO(t.date_start), threeMonthsLater)));
  // Group tournaments by country
  const tournamentsByCountry = tournaments?.reduce((acc, t) => {
    const country = t.country || 'OTHER';
    if (!acc[country]) acc[country] = [];
    acc[country].push(t);
    return acc;
  }, {} as Record<string, Tournament[]>) || {};
  
  const majorTournaments = filterByOrganizer(filterByDate(tournaments?.filter(t => t.category === 'major' || t.category === 'international'), !showPastTournaments));
  
  // Get unique countries for tabs
  const countries = Object.keys(tournamentsByCountry).sort((a, b) => {
    // Sort by number of tournaments (descending)
    return (tournamentsByCountry[b]?.length || 0) - (tournamentsByCountry[a]?.length || 0);
  });
  
  const getCountryName = (code: string) => {
    const names: Record<string, Record<string, string>> = {
      'JP': { ja: '日本', en: 'Japan', pt: 'Japão' },
      'US': { ja: 'アメリカ', en: 'USA', pt: 'EUA' },
      'PT': { ja: 'ポルトガル', en: 'Portugal', pt: 'Portugal' },
      'IT': { ja: 'イタリア', en: 'Italy', pt: 'Itália' },
      'AE': { ja: 'UAE', en: 'UAE', pt: 'EAU' },
      'GB': { ja: 'イギリス', en: 'UK', pt: 'Reino Unido' },
      'TW': { ja: '台湾', en: 'Taiwan', pt: 'Taiwan' },
      'PL': { ja: 'ポーランド', en: 'Poland', pt: 'Polônia' },
      'BR': { ja: 'ブラジル', en: 'Brazil', pt: 'Brasil' },
    };
    return names[code]?.[language] || names[code]?.en || code;
  };

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
      'PT': '🇵🇹',
      'PL': '🇵🇱',
      'IT': '🇮🇹',
      'AE': '🇦🇪',
      'GB': '🇬🇧',
      'TW': '🇹🇼',
      'BR': '🇧🇷',
      'IE': '🇮🇪',
    };
    return flags[country] || '🌍';
  };

  const getTournamentUrl = (tournament: Tournament) => {
    const year = new Date(tournament.date_start).getFullYear();
    return `/tournaments/${year}/${tournament.slug}`;
  };

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => {
    const isPast = isBefore(parseISO(tournament.date_start), now);
    const participantCount = participantCounts?.[tournament.id] || 0;
    
    return (
      <Link to={getTournamentUrl(tournament)}>
        <Card 
          className={`hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 cursor-pointer h-full ${isPast ? 'opacity-60' : ''}`}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {getOrganizerBadge(tournament.organizer)}
                    {isPast && <Badge variant="outline" className="text-muted-foreground text-xs">{language === 'ja' ? '終了' : 'Past'}</Badge>}
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{getName(tournament)}</h3>
                </div>
                <span className="text-xl sm:text-2xl flex-shrink-0">{getCountryFlag(tournament.country)}</span>
              </div>
              
              <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">
                    {formatDateRange(tournament.date_start, tournament.date_end)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {getLocation(tournament)}
                  </span>
                </div>
                {participantCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span className="text-primary font-medium">
                      {participantCount} {language === 'ja' ? '人参加予定' : 'planning'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const TournamentSection = ({ title, tournaments, icon }: { title: string; tournaments: Tournament[] | undefined; icon: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
        <Badge variant="secondary" className="ml-2">{tournaments?.length || 0}</Badge>
      </div>
      {tournaments && tournaments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          {language === 'ja' ? '大会がありません' : 'No tournaments found'}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">
            {language === 'ja' ? '大会スケジュール' : 'Tournament Schedule'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {language === 'ja' 
              ? '2025年〜2026年の柔術大会スケジュール'
              : 'BJJ tournament schedule 2025-2026'}
          </p>
        </div>

        {/* World Pro Highlight */}
        {majorTournaments && majorTournaments.length > 0 && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 via-background to-amber-500/10 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                {language === 'ja' ? '注目の大会' : 'Featured Events'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {majorTournaments.slice(0, 4).map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Section - Collapsed on mobile */}
        <details className="mb-6 sm:mb-8">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {language === 'ja' ? '💡 初心者の方へのヒント' : '💡 Tips for Beginners'}
          </summary>
          <Card className="mt-3 bg-muted/30">
            <CardContent className="p-3 sm:p-4 space-y-3 text-xs sm:text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <h4 className="font-semibold text-primary text-sm">ASJJF / SJJJF</h4>
                  <p className="text-muted-foreground">
                    {language === 'ja' 
                      ? '初心者にやさしい。会員登録なしで出場可能。'
                      : 'Beginner-friendly. No membership required.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-primary text-sm">JBJJF</h4>
                  <p className="text-muted-foreground">
                    {language === 'ja'
                      ? 'IBJJF傘下で格式が高い。道着チェックが厳格。'
                      : 'Under IBJJF. Strict gi checks.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </details>

        {/* Filters */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {/* Past Tournaments Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="show-past"
              checked={showPastTournaments}
              onCheckedChange={setShowPastTournaments}
            />
            <Label htmlFor="show-past" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
              {language === 'ja' ? '過去の大会も表示' : 'Show past'}
            </Label>
          </div>

          {/* Organizer Filter */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <div className="flex gap-1.5 min-w-max">
              <Badge 
                variant={selectedOrganizer === null ? "default" : "outline"}
                className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                onClick={() => setSelectedOrganizer(null)}
              >
                {language === 'ja' ? 'すべて' : 'All'}
              </Badge>
              {organizers.map((org) => (
                <Badge 
                  key={org}
                  variant={selectedOrganizer === org ? "default" : "outline"}
                  className={`cursor-pointer hover:opacity-80 transition-opacity text-xs ${
                    selectedOrganizer === org ? '' : 
                    org === 'IBJJF' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' :
                    org === 'AJP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                    org === 'ADCC' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                    org === 'ASJJF' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                    org === 'JBJJF' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                    org === 'SJJIF' ? 'bg-pink-500/10 text-pink-500 border-pink-500/30' :
                    ''
                  }`}
                  onClick={() => setSelectedOrganizer(org)}
                >
                  {org}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex h-auto gap-1 min-w-max">
              <TabsTrigger value="upcoming" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {language === 'ja' ? '直近' : 'Upcoming'}
              </TabsTrigger>
              {countries.slice(0, 6).map((countryCode) => (
                <TabsTrigger key={countryCode} value={`country-${countryCode}`} className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <span className="text-sm sm:text-base">{getCountryFlag(countryCode)}</span>
                  <span className="text-xs text-muted-foreground">({tournamentsByCountry[countryCode]?.length})</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {language === 'ja' ? '全部' : 'All'}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming">
            <TournamentSection 
              title={language === 'ja' ? '直近3ヶ月の大会' : 'Next 3 Months'}
              tournaments={upcomingTournaments}
              icon={<Calendar className="h-5 w-5 text-primary" />}
            />
          </TabsContent>

          {countries.map((countryCode) => (
            <TabsContent key={countryCode} value={`country-${countryCode}`}>
              <TournamentSection 
                title={`${getCountryFlag(countryCode)} ${getCountryName(countryCode)}`}
                tournaments={filterByOrganizer(filterByDate(tournamentsByCountry[countryCode]))}
                icon={<span className="text-xl">{getCountryFlag(countryCode)}</span>}
              />
            </TabsContent>
          ))}

          <TabsContent value="all">
            <TournamentSection 
              title={language === 'ja' ? 'すべての大会' : 'All Tournaments'}
              tournaments={filterByOrganizer(filterByDate(tournaments))}
              icon={<Globe className="h-5 w-5 text-primary" />}
            />
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Tournaments;