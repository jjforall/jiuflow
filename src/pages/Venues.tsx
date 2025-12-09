import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Trophy, Calendar, Search, Users, ArrowRight, Heart } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  name_ja: string | null;
  address: string | null;
  address_ja: string | null;
  city: string | null;
  country: string;
  image_url: string | null;
  capacity: number | null;
}

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  date_start: string;
  slug: string;
  organizer: string;
  venue_id: string;
}

const countryNames: Record<string, { ja: string; en: string }> = {
  'JP': { ja: '日本', en: 'Japan' },
  'US': { ja: 'アメリカ', en: 'USA' },
  'BR': { ja: 'ブラジル', en: 'Brazil' },
  'GB': { ja: 'イギリス', en: 'UK' },
  'IT': { ja: 'イタリア', en: 'Italy' },
  'PT': { ja: 'ポルトガル', en: 'Portugal' },
  'AE': { ja: 'UAE', en: 'UAE' },
  'TW': { ja: '台湾', en: 'Taiwan' },
  'CN': { ja: '中国', en: 'China' },
  'KR': { ja: '韓国', en: 'South Korea' },
  'MY': { ja: 'マレーシア', en: 'Malaysia' },
  'SG': { ja: 'シンガポール', en: 'Singapore' },
};

const countryFlags: Record<string, string> = {
  'JP': '🇯🇵',
  'US': '🇺🇸',
  'BR': '🇧🇷',
  'GB': '🇬🇧',
  'IT': '🇮🇹',
  'PT': '🇵🇹',
  'AE': '🇦🇪',
  'TW': '🇹🇼',
  'CN': '🇨🇳',
  'KR': '🇰🇷',
  'MY': '🇲🇾',
  'SG': '🇸🇬',
};

const Venues = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const getLocale = () => {
    switch (language) {
      case 'ja': return ja;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  // Fetch venues
  const { data: venues, isLoading: venuesLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Venue[];
    },
  });

  // Fetch all tournaments with venue_id
  const { data: tournaments } = useQuery({
    queryKey: ['tournaments-by-venue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, name_ja, date_start, slug, organizer, venue_id')
        .not('venue_id', 'is', null)
        .order('date_start', { ascending: false });
      if (error) throw error;
      return data as Tournament[];
    },
  });

  // Fetch favorite venues
  const { data: favoriteVenues } = useQuery({
    queryKey: ['favorite-venues', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorite_venues')
        .select('venue_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(f => f.venue_id);
    },
    enabled: !!user,
  });

  // Add favorite mutation
  const addFavorite = useMutation({
    mutationFn: async (venueId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('favorite_venues')
        .insert({ user_id: user.id, venue_id: venueId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-venues'] });
      toast.success(language === 'ja' ? 'お気に入りに追加しました' : 'Added to favorites');
    },
  });

  // Remove favorite mutation
  const removeFavorite = useMutation({
    mutationFn: async (venueId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('favorite_venues')
        .delete()
        .eq('user_id', user.id)
        .eq('venue_id', venueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-venues'] });
      toast.success(language === 'ja' ? 'お気に入りから削除しました' : 'Removed from favorites');
    },
  });

  const toggleFavorite = (e: React.MouseEvent, venueId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error(language === 'ja' ? 'ログインしてください' : 'Please login');
      return;
    }
    if (favoriteVenues?.includes(venueId)) {
      removeFavorite.mutate(venueId);
    } else {
      addFavorite.mutate(venueId);
    }
  };

  // Group tournaments by venue
  const tournamentsByVenue = useMemo(() => {
    if (!tournaments) return {};
    return tournaments.reduce((acc, t) => {
      if (!t.venue_id) return acc;
      if (!acc[t.venue_id]) acc[t.venue_id] = [];
      acc[t.venue_id].push(t);
      return acc;
    }, {} as Record<string, Tournament[]>);
  }, [tournaments]);

  // Filter venues by search
  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    if (!searchQuery.trim()) return venues;
    const query = searchQuery.toLowerCase();
    return venues.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.name_ja?.toLowerCase().includes(query) ||
      v.city?.toLowerCase().includes(query) ||
      countryNames[v.country]?.ja.includes(query) ||
      countryNames[v.country]?.en.toLowerCase().includes(query)
    );
  }, [venues, searchQuery]);

  // Sort venues: with image first, then by capacity (largest first)
  const sortedVenues = useMemo(() => {
    return [...filteredVenues].sort((a, b) => {
      // First, prioritize venues with images
      const hasImageA = a.image_url && !a.image_url.includes('default-venue') ? 1 : 0;
      const hasImageB = b.image_url && !b.image_url.includes('default-venue') ? 1 : 0;
      if (hasImageB !== hasImageA) return hasImageB - hasImageA;
      
      // Then, sort by capacity (largest first)
      const capacityA = a.capacity || 0;
      const capacityB = b.capacity || 0;
      return capacityB - capacityA;
    });
  }, [filteredVenues]);

  const getName = (venue: Venue) => language === 'ja' && venue.name_ja ? venue.name_ja : venue.name;
  const getTournamentName = (t: Tournament) => language === 'ja' && t.name_ja ? t.name_ja : t.name;

  // Get next upcoming tournament or most recent past tournament
  const getDisplayTournament = (venueId: string): { tournament: Tournament | null; isPast: boolean } => {
    const venueTournaments = tournamentsByVenue[venueId] || [];
    const now = new Date();
    
    // Find next upcoming tournament
    const upcomingTournaments = venueTournaments.filter(t => isAfter(parseISO(t.date_start), now));
    if (upcomingTournaments.length > 0) {
      // Sort by date ascending and get the nearest one
      const sorted = [...upcomingTournaments].sort((a, b) => 
        parseISO(a.date_start).getTime() - parseISO(b.date_start).getTime()
      );
      return { tournament: sorted[0], isPast: false };
    }
    
    // No upcoming, get most recent past tournament
    const pastTournaments = venueTournaments.filter(t => isBefore(parseISO(t.date_start), now));
    if (pastTournaments.length > 0) {
      // Already sorted descending, so first one is most recent
      return { tournament: pastTournaments[0], isPast: true };
    }
    
    return { tournament: null, isPast: false };
  };

  const seoData = {
    ja: {
      title: "会場一覧 | JiuFlow - ブラジリアン柔術大会",
      description: "ブラジリアン柔術大会が開催される会場一覧。各会場の詳細情報、開催大会数、今後の大会スケジュールを確認できます。"
    },
    en: {
      title: "Venues | JiuFlow - BJJ Tournaments",
      description: "List of venues hosting Brazilian Jiu-Jitsu tournaments. View venue details, tournament counts, and upcoming schedules."
    },
    pt: {
      title: "Locais | JiuFlow - Torneios de BJJ",
      description: "Lista de locais que sediam torneios de Jiu-Jitsu Brasileiro. Veja detalhes, contagem de torneios e próximos eventos."
    }
  };

  const currentSeo = seoData[language] || seoData.ja;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl="https://jiuflow.lovableproject.com/venues"
        keywords={["BJJ", "会場", "venue", "大会", "tournament"]}
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {language === 'ja' ? '会場一覧' : 'Venues'}
            </h1>
            {venues && (
              <Badge variant="secondary" className="ml-2">
                {venues.length} {language === 'ja' ? '会場' : 'venues'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {language === 'ja' 
              ? 'ブラジリアン柔術大会が開催される会場の一覧です'
              : 'List of venues hosting Brazilian Jiu-Jitsu tournaments'}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ja' ? '会場名、都市、国で検索...' : 'Search by name, city, country...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Venue Grid */}
        {venuesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedVenues.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ja' ? '該当する会場が見つかりません' : 'No venues found'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedVenues.map((venue) => {
              const tournamentCount = tournamentsByVenue[venue.id]?.length || 0;
              const { tournament: displayTournament, isPast } = getDisplayTournament(venue.id);
              const isFavorite = favoriteVenues?.includes(venue.id);
              
              return (
                <Link key={venue.id} to={`/venue/${venue.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all group h-full">
                    {/* Image */}
                    <div className="relative h-40 bg-muted overflow-hidden">
                      {venue.image_url ? (
                        <img
                          src={venue.image_url}
                          alt={getName(venue)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = '/images/venues/default-venue.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Building2 className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      {/* Country flag */}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-md bg-background/90 backdrop-blur-sm flex items-center justify-center text-lg shadow-sm">
                        {countryFlags[venue.country] || '🏟️'}
                      </div>
                      {/* Favorite button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => toggleFavorite(e, venue.id)}
                      >
                        <Heart 
                          className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                        />
                      </Button>
                      {/* Tournament count badge */}
                      {tournamentCount > 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-primary/90 backdrop-blur-sm">
                          <Trophy className="h-3 w-3 mr-1" />
                          {tournamentCount} {language === 'ja' ? '大会' : 'tournaments'}
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="p-4 space-y-3">
                      {/* Venue name */}
                      <h3 className="font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">
                        {getName(venue)}
                      </h3>
                      
                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          {venue.city && `${venue.city}, `}
                          {countryNames[venue.country]?.[language === 'ja' ? 'ja' : 'en'] || venue.country}
                        </span>
                      </div>
                      
                      {/* Capacity */}
                      {venue.capacity && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {language === 'ja' ? `収容人数: ${venue.capacity.toLocaleString()}人` : `Capacity: ${venue.capacity.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      
                      {/* Tournament info */}
                      {displayTournament && (
                        <div className="pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {isPast 
                                ? (language === 'ja' ? '過去開催' : 'Past event')
                                : (language === 'ja' ? '次回開催' : 'Next event')
                              }
                            </span>
                          </div>
                          <div className={`text-sm font-medium line-clamp-1 ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
                            {getTournamentName(displayTournament)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(displayTournament.date_start), language === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy', { locale: getLocale() })}
                          </div>
                        </div>
                      )}
                      
                      {/* View details */}
                      <div className="flex items-center justify-end text-xs text-primary font-medium pt-1">
                        {language === 'ja' ? '詳細を見る' : 'View details'}
                        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Venues;