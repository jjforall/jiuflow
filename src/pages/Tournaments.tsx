import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Trophy, Globe, Info, ExternalLink } from "lucide-react";
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
}

const Tournaments = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("upcoming");

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

  const upcomingTournaments = tournaments?.filter(t => isAfter(parseISO(t.date_start), now) && isBefore(parseISO(t.date_start), threeMonthsLater));
  const domesticTournaments = tournaments?.filter(t => t.country === 'JP' && isAfter(parseISO(t.date_start), now));
  const internationalTournaments = tournaments?.filter(t => t.country !== 'JP' && isAfter(parseISO(t.date_start), now));
  const majorTournaments = tournaments?.filter(t => t.category === 'major' || t.category === 'international');

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
    };
    return flags[country] || '🌍';
  };

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {getCategoryBadge(tournament.category, tournament.is_international)}
                {getOrganizerBadge(tournament.organizer)}
              </div>
              <h3 className="font-semibold text-lg leading-tight">{getName(tournament)}</h3>
            </div>
            <span className="text-2xl">{getCountryFlag(tournament.country)}</span>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {formatDateRange(tournament.date_start, tournament.date_end)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {getLocation(tournament)}
                {getVenue(tournament) && ` - ${getVenue(tournament)}`}
              </span>
            </div>
            {getNotes(tournament) && (
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-2 mt-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-xs">{getNotes(tournament)}</span>
              </div>
            )}
          </div>

          {tournament.registration_url && (
            <a
              href={tournament.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              {language === 'ja' ? '登録ページ' : 'Registration'}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {language === 'ja' ? '大会スケジュール' : 'Tournament Schedule'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ja' 
              ? '2025年〜2026年の柔術大会スケジュール。国内・国際大会の情報をまとめています。'
              : 'Jiu-Jitsu tournament schedule for 2025-2026. Domestic and international events.'}
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

        {/* Tips Section */}
        <Card className="mb-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ja' ? '初心者の方へのヒント' : 'Tips for Beginners'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">ASJJF / SJJJF</h4>
                <p className="text-muted-foreground">
                  {language === 'ja' 
                    ? '初心者にやさしい。会員登録なしで出場できる大会が多く、エンターテイメント性が高い。'
                    : 'Beginner-friendly. Many events allow participation without membership. High entertainment value.'}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">JBJJF</h4>
                <p className="text-muted-foreground">
                  {language === 'ja'
                    ? '国際連盟（IBJJF）傘下で格式が高い。ルールや道着のチェックが厳格。事前会員登録が必要。'
                    : 'Under IBJJF with high prestige. Strict rules and gi checks. Prior membership registration required.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              {language === 'ja' ? '直近' : 'Upcoming'}
            </TabsTrigger>
            <TabsTrigger value="domestic" className="gap-2">
              🇯🇵
              {language === 'ja' ? '国内' : 'Japan'}
            </TabsTrigger>
            <TabsTrigger value="international" className="gap-2">
              <Globe className="h-4 w-4" />
              {language === 'ja' ? '国際' : 'World'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <TournamentSection 
              title={language === 'ja' ? '直近3ヶ月の大会' : 'Next 3 Months'}
              tournaments={upcomingTournaments}
              icon={<Calendar className="h-5 w-5 text-primary" />}
            />
          </TabsContent>

          <TabsContent value="domestic">
            <TournamentSection 
              title={language === 'ja' ? '国内大会' : 'Domestic (Japan)'}
              tournaments={domesticTournaments}
              icon={<span className="text-xl">🇯🇵</span>}
            />
          </TabsContent>

          <TabsContent value="international">
            <TournamentSection 
              title={language === 'ja' ? '国際大会' : 'International'}
              tournaments={internationalTournaments}
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