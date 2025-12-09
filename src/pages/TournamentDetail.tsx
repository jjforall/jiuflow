import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Trophy, Info, ExternalLink, Building2, ArrowLeft, Globe, Users, UserPlus, UserMinus, AlertCircle, Clock, FileText, Train, DollarSign, ScrollText, Mail, Link as LinkIcon, Scale, ChevronDown, ChevronRight, CheckCircle2, CircleDashed, CalendarPlus, Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO, isBefore } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";
import { toast } from "sonner";
import komazawaVenue from "@/assets/venues/komazawa-olympic-park.jpg";
import { generateGoogleCalendarUrl } from "@/utils/googleCalendar";

interface Venue {
  id: string;
  name: string;
  name_ja: string | null;
  image_url: string | null;
}

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
  venue_image_url: string | null;
  venue_address: string | null;
  venue_address_ja: string | null;
  venue_access: string | null;
  venue_access_ja: string | null;
  weight_classes: string[] | null;
  entry_fee: string | null;
  entry_fee_ja: string | null;
  rules: string | null;
  rules_ja: string | null;
  contact_email: string | null;
  contact_url: string | null;
  related_tournament_slug: string | null;
  venue_id: string | null;
  venues: Venue | null;
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

const TournamentDetailSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navigation />
    <main className="flex-1 container mx-auto px-4 py-8 pt-24">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          {/* Hero skeleton */}
          <Skeleton className="w-full h-48 sm:h-64 rounded-t-lg" />
          <CardContent className="p-6 sm:p-8 space-y-4">
            {/* Badges */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-14" />
            </div>
            {/* Title */}
            <Skeleton className="h-8 w-3/4" />
            {/* Details */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <Skeleton className="h-px w-full my-6" />
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </CardContent>
        </Card>
        {/* Participants skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
    <Footer />
  </div>
);

const TournamentDetail = () => {
  const { year, slug } = useParams<{ year: string; slug: string }>();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // State for collapsible sections and dialog
  const [notesOpen, setNotesOpen] = useState(false);
  const [weightClassesOpen, setWeightClassesOpen] = useState(false);
  const [participationDialogOpen, setParticipationDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isPublicParticipation, setIsPublicParticipation] = useState(true);
  const [venueImageDialogOpen, setVenueImageDialogOpen] = useState(false);
  const [newVenueImageUrl, setNewVenueImageUrl] = useState('');
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);
  
  // Swipe back support
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      const swipeDistance = touchEndX.current - touchStartX.current;
      if (touchStartX.current < 50 && swipeDistance > 100) {
        navigate(-1);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ['tournament', year, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venues(id, name, name_ja, image_url)')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Tournament | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
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
    enabled: !!tournament?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: relatedTournament } = useQuery({
    queryKey: ['related-tournament', tournament?.related_tournament_slug],
    queryFn: async () => {
      if (!tournament?.related_tournament_slug) return null;
      const { data, error } = await supabase
        .from('tournaments')
        .select('name, name_ja, slug, date_start')
        .eq('slug', tournament.related_tournament_slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tournament?.related_tournament_slug,
    staleTime: 10 * 60 * 1000,
  });

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const userParticipation = participants?.find(p => p.user_id === user?.id);
  const isParticipating = !!userParticipation;
  const participationStatus = userParticipation?.status;

  const joinMutation = useMutation({
    mutationFn: async ({ status, isPublic }: { status: 'registered' | 'planning'; isPublic: boolean }) => {
      if (!user || !tournament) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          status: status,
          is_public: isPublic
        });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['tournament-participants', tournament?.id] });
      setParticipationDialogOpen(false);
      setIsPublicParticipation(true); // Reset for next time
      toast.success(
        status === 'registered' 
          ? (language === 'ja' ? 'エントリー済みとして登録しました' : 'Registered as entered')
          : (language === 'ja' ? 'エントリー予定として登録しました' : 'Registered as planning to enter')
      );
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

  // Mutation to update venue image
  const updateVenueImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      if (!tournament) throw new Error('No tournament');
      
      // If tournament has a venue_id, update the venue table
      if (tournament.venue_id) {
        const { error } = await supabase
          .from('venues')
          .update({ image_url: imageUrl })
          .eq('id', tournament.venue_id);
        if (error) throw error;
      } else {
        // Otherwise update the tournament's venue_image_url directly
        const { error } = await supabase
          .from('tournaments')
          .update({ venue_image_url: imageUrl })
          .eq('id', tournament.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', year, slug] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setVenueImageDialogOpen(false);
      setNewVenueImageUrl('');
      toast.success(language === 'ja' ? '施設画像を更新しました' : 'Venue image updated');
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
  const getDescription = (t: Tournament) => language === 'ja' && t.description_ja ? t.description_ja : t.description;
  const getVenueAddress = (t: Tournament) => language === 'ja' && t.venue_address_ja ? t.venue_address_ja : t.venue_address;
  const getVenueAccess = (t: Tournament) => language === 'ja' && t.venue_access_ja ? t.venue_access_ja : t.venue_access;
  const getEntryFee = (t: Tournament) => language === 'ja' && t.entry_fee_ja ? t.entry_fee_ja : t.entry_fee;
  const getRules = (t: Tournament) => language === 'ja' && t.rules_ja ? t.rules_ja : t.rules;
  
  const getVenueImage = (t: Tournament) => {
    // Use venue from relation if available
    if (t.venues?.image_url) return t.venues.image_url;
    if (t.venue_image_url) return t.venue_image_url;
    // Default venue image for Komazawa
    if (t.venue?.includes('Komazawa') || t.venue_ja?.includes('駒沢')) {
      return komazawaVenue;
    }
    // Default placeholder image
    return '/images/venues/default-venue.jpg';
  };

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
    return <TournamentDetailSkeleton />;
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
      
      <main className="flex-1 container mx-auto px-4 py-6 pt-20 sm:pt-24">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-4" size="sm">
          <Link to="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('tournaments.backToList')}
          </Link>
        </Button>

        <div className="max-w-4xl mx-auto space-y-4">
          {/* Hero Card - Title & Key Info */}
          <Card className={`overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
            {/* Venue Hero Image */}
            {getVenueImage(tournament) && (
              <div className="relative w-full h-40 sm:h-56 overflow-hidden group">
                <img 
                  src={getVenueImage(tournament) || ''} 
                  alt={getVenue(tournament) || 'Venue'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                
                {/* Admin: Edit venue image button */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setNewVenueImageUrl(getVenueImage(tournament) || '');
                      setVenueImageDialogOpen(true);
                    }}
                    className="absolute bottom-3 left-3 z-10 p-2 bg-background/80 hover:bg-background rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title={language === 'ja' ? '施設画像を変更' : 'Change venue image'}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
                
                {/* Participation Status Badge - Top Right (Clickable) */}
                {user && !isPast && (
                  <button
                    onClick={() => isParticipating 
                      ? (participationStatus === 'registered' ? setCancelDialogOpen(true) : leaveMutation.mutate())
                      : setParticipationDialogOpen(true)
                    }
                    className="absolute top-3 right-3 z-10"
                  >
                    <Badge 
                      className={`px-3 py-1.5 text-sm font-semibold shadow-lg cursor-pointer transition-all hover:scale-105 ${
                        isParticipating
                          ? participationStatus === 'registered' 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-primary/80 text-primary-foreground hover:bg-primary'
                      }`}
                    >
                      {isParticipating ? (
                        participationStatus === 'registered' ? (
                          <><CheckCircle2 className="h-4 w-4 mr-1.5" />{language === 'ja' ? 'エントリー済み' : 'Registered'}</>
                        ) : (
                          <><CircleDashed className="h-4 w-4 mr-1.5" />{language === 'ja' ? 'エントリー予定' : 'Planning'}</>
                        )
                      ) : (
                        <><UserPlus className="h-4 w-4 mr-1.5" />{language === 'ja' ? '参加予定' : 'Join'}</>
                      )}
                    </Badge>
                  </button>
                )}
              </div>
            )}
            
            {/* Participation Status Badge when no hero image */}
            {!getVenueImage(tournament) && user && !isPast && (
              <div className="relative">
                <button
                  onClick={() => isParticipating 
                    ? (participationStatus === 'registered' ? setCancelDialogOpen(true) : leaveMutation.mutate())
                    : setParticipationDialogOpen(true)
                  }
                  className="absolute top-3 right-3 z-10"
                >
                  <Badge 
                    className={`px-3 py-1.5 text-sm font-semibold shadow-lg cursor-pointer transition-all hover:scale-105 ${
                      isParticipating
                        ? participationStatus === 'registered' 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-primary/80 text-primary-foreground hover:bg-primary'
                    }`}
                  >
                    {isParticipating ? (
                      participationStatus === 'registered' ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1.5" />{language === 'ja' ? 'エントリー済み' : 'Registered'}</>
                      ) : (
                        <><CircleDashed className="h-4 w-4 mr-1.5" />{language === 'ja' ? 'エントリー予定' : 'Planning'}</>
                      )
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-1.5" />{language === 'ja' ? '参加予定' : 'Join'}</>
                    )}
                  </Badge>
                </button>
              </div>
            )}
            <CardContent className={`${getVenueImage(tournament) ? '-mt-16 relative z-10' : ''} p-4 sm:p-6`}>
              {/* Featured Badge */}
              {tournament.slug?.includes('sjjif-world-jiu-jitsu-championship-2026') && (
                <div className="mb-3">
                  <Badge className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white font-bold px-3 py-1 text-sm shadow-lg animate-pulse">
                    ⭐ {language === 'ja' ? '注目の大会' : 'Featured Tournament'}
                  </Badge>
                </div>
              )}
              
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {getCategoryBadge(tournament.category, tournament.is_international)}
                {getOrganizerBadge(tournament.organizer)}
                {getCountryBadge(tournament.country)}
                {isPast && (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    {t('tournaments.past')}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 leading-tight">{getName(tournament)}</h1>

              {/* Key Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{language === 'ja' ? '開催日' : 'Date'}</p>
                    <p className="font-semibold text-sm">{formatDateRange(tournament.date_start, tournament.date_end)}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{language === 'ja' ? '開催地' : 'Location'}</p>
                    <p className="font-semibold text-sm">{getLocation(tournament)}</p>
                  </div>
                </div>

                {/* Venue */}
                {getVenue(tournament) && (
                  tournament.venue_id ? (
                    <Link 
                      to={`/venue/${tournament.venue_id}`}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group"
                    >
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? '会場' : 'Venue'}</p>
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{getVenue(tournament)}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? '会場' : 'Venue'}</p>
                        <p className="font-semibold text-sm">{getVenue(tournament)}</p>
                      </div>
                    </div>
                  )
                )}

                {/* Organizer */}
                <Link 
                  to={`/organization/${tournament.organizer.toLowerCase()}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group"
                >
                  <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{language === 'ja' ? '主催' : 'Organizer'}</p>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{tournament.organizer}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>

              {/* Registration Deadline Alert */}
              {tournament.registration_deadline && !isPast && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                  isBefore(parseISO(tournament.registration_deadline), now)
                    ? 'bg-muted/50 text-muted-foreground'
                    : 'bg-orange-500/10 border border-orange-500/30'
                }`}>
                  <Clock className={`h-5 w-5 shrink-0 ${
                    isBefore(parseISO(tournament.registration_deadline), now) ? 'text-muted-foreground' : 'text-orange-500'
                  }`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('tournaments.registrationDeadline')}</p>
                    <p className={`font-semibold text-sm ${
                      isBefore(parseISO(tournament.registration_deadline), now) 
                        ? 'line-through' 
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {format(parseISO(tournament.registration_deadline), language === 'ja' ? 'M月d日(E)' : 'MMM d (EEE)', { locale: getLocale() })}
                      {!isBefore(parseISO(tournament.registration_deadline), now) && (
                        <span className="ml-2 text-xs font-normal">
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

              {/* Google Calendar Button */}
              {!isPast && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    const calendarUrl = generateGoogleCalendarUrl({
                      title: getName(tournament),
                      startDate: tournament.date_start,
                      endDate: tournament.date_end,
                      location: `${getVenue(tournament) || ''} ${getLocation(tournament)}`.trim(),
                      description: [
                        tournament.registration_url ? `${language === 'ja' ? 'エントリー: ' : 'Registration: '}${tournament.registration_url}` : '',
                        getDescription(tournament) || '',
                      ].filter(Boolean).join('\n\n'),
                    });
                    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <img src="/images/google-calendar-logo.png" alt="Google Calendar" className="h-5 w-5 mr-2" />
                  {language === 'ja' ? 'Googleカレンダーに追加' : 'Add to Google Calendar'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Description & Notes Card */}
          {(getDescription(tournament) || getNotes(tournament)) && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                {/* Description */}
                {getDescription(tournament) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">{t('tournaments.about')}</h3>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{getDescription(tournament)}</p>
                  </div>
                )}

                {/* Notes - Collapsible */}
                {getNotes(tournament) && (
                  <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-muted-foreground flex-1 text-left">
                        {language === 'ja' ? '詳細情報' : 'Details'}
                      </span>
                      {notesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground whitespace-pre-line">
                        {getNotes(tournament)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details Grid Card */}
          {(getEntryFee(tournament) || getRules(tournament) || getVenueAddress(tournament) || getVenueAccess(tournament)) && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Entry Fee */}
                  {getEntryFee(tournament) && (
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <DollarSign className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? '参加費' : 'Entry Fee'}</p>
                        <p className="text-sm font-semibold">{getEntryFee(tournament)}</p>
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {getRules(tournament) && (
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <ScrollText className="h-5 w-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? 'ルール' : 'Rules'}</p>
                        <p className="text-sm">{getRules(tournament)}</p>
                      </div>
                    </div>
                  )}

                  {/* Venue Address */}
                  {getVenueAddress(tournament) && (
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? '住所' : 'Address'}</p>
                        <p className="text-sm">{getVenueAddress(tournament)}</p>
                      </div>
                    </div>
                  )}

                  {/* Access Info */}
                  {getVenueAccess(tournament) && (
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Train className="h-5 w-5 text-purple-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ja' ? 'アクセス' : 'Access'}</p>
                        <p className="text-sm">{getVenueAccess(tournament)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight Classes Card - Collapsible */}
          {tournament.weight_classes && tournament.weight_classes.length > 0 && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Collapsible open={weightClassesOpen} onOpenChange={setWeightClassesOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full">
                    <Scale className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-sm flex-1 text-left">
                      {language === 'ja' ? '階級・体重一覧' : 'Weight Classes'}
                    </span>
                    <Badge variant="secondary" className="mr-2">{tournament.weight_classes.length}</Badge>
                    {weightClassesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {tournament.weight_classes.map((wc, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted/50 rounded border border-border/50">
                          {wc}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}

          {/* Contact & Related Card */}
          {(tournament.contact_email || tournament.contact_url || relatedTournament) && (
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Contact Info */}
                {(tournament.contact_email || tournament.contact_url) && (
                  <div>
                    <p className="font-medium text-xs text-muted-foreground mb-2">
                      {language === 'ja' ? 'お問い合わせ' : 'Contact'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {tournament.contact_email && (
                        <a 
                          href={`mailto:${tournament.contact_email}`}
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline px-3 py-1.5 bg-primary/5 rounded-full"
                        >
                          <Mail className="h-4 w-4" />
                          {tournament.contact_email}
                        </a>
                      )}
                      {tournament.contact_url && (
                        <a 
                          href={tournament.contact_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline px-3 py-1.5 bg-primary/5 rounded-full"
                        >
                          <LinkIcon className="h-4 w-4" />
                          {language === 'ja' ? '公式サイト' : 'Official Site'}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Related Tournament Link */}
                {relatedTournament && (
                  <div className="pt-3 border-t">
                    <p className="font-medium text-xs text-muted-foreground mb-2">
                      {language === 'ja' ? '関連大会' : 'Related Tournament'}
                    </p>
                    <Link 
                      to={`/tournaments/${relatedTournament.date_start?.substring(0, 4)}/${relatedTournament.slug}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline p-2 bg-secondary/30 rounded-lg"
                    >
                      <Calendar className="h-4 w-4" />
                      {language === 'ja' && relatedTournament.name_ja ? relatedTournament.name_ja : relatedTournament.name}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Participation Card */}
          {!isPast && (
            <Card className="border-primary/20">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{language === 'ja' ? '参加予定' : 'Participation'}</h3>
                </div>
                
                {user ? (
                  isParticipating ? (
                    <div className="space-y-3">
                    <button
                      onClick={() => participationStatus === 'registered' ? setCancelDialogOpen(true) : leaveMutation.mutate()}
                      className={`w-full flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                        participationStatus === 'registered' 
                          ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                          : 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                        {participationStatus === 'registered' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <CircleDashed className="h-5 w-5 text-amber-500" />
                        )}
                        <span className={`font-medium ${
                          participationStatus === 'registered' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          {participationStatus === 'registered' 
                            ? (language === 'ja' ? 'エントリー済み' : 'Registered')
                            : (language === 'ja' ? 'エントリー予定' : 'Planning to Enter')}
                        </span>
                      </button>
                      <p className="text-xs text-muted-foreground text-center">
                        {language === 'ja' ? 'クリックして変更' : 'Click to change'}
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setParticipationDialogOpen(true)}
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
                    <Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {language === 'ja' 
                        ? 'これは公式エントリーではありません。実際のエントリーは大会の公式サイトから行ってください。'
                        : 'This is NOT official registration. Please register through the official tournament website.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants Section */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">
                  {t('tournaments.participants')}
                </h3>
                {user && <Badge variant="secondary">{participants?.length || 0}</Badge>}
              </div>

              {user ? (
                participants && participants.length > 0 ? (
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <Link
                        key={participant.id}
                        to={participant.profiles?.username ? `/${participant.profiles.username}` : '#'}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {participant.profiles?.display_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {participant.profiles?.display_name || t('tournaments.anonymous')}
                          </p>
                          {participant.weight_class && (
                            <p className="text-xs text-muted-foreground">{participant.weight_class}</p>
                          )}
                        </div>
                        {participant.status === 'registered' && (
                          <Badge variant="default" className="bg-green-500 text-xs">
                            {t('tournaments.registered')}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {t('tournaments.noParticipants')}
                  </p>
                )
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">
                    {language === 'ja' ? '参加予定者を確認するにはログインしてください' : 'Login to see participants'}
                  </p>
                  <Button variant="outline" asChild size="sm">
                    <Link to="/login">
                      {language === 'ja' ? 'ログイン' : 'Login'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Participation Status Dialog */}
      <Dialog open={participationDialogOpen} onOpenChange={setParticipationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {language === 'ja' ? '参加予定に追加' : 'Add to Plan'}
            </DialogTitle>
            <DialogDescription className="text-left">
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mt-2">
                <Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {language === 'ja' 
                    ? 'これは公式エントリーではありません。実際のエントリーは大会の公式サイトから行ってください。'
                    : 'This is NOT official registration. Please register through the official tournament website.'}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Privacy toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {isPublicParticipation ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <UserMinus className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {language === 'ja' ? '参加を公開する' : 'Make participation public'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPublicParticipation 
                      ? (language === 'ja' ? '参加者一覧に表示されます' : 'Visible in participants list')
                      : (language === 'ja' ? '他のユーザーには表示されません' : 'Hidden from other users')}
                  </p>
                </div>
              </div>
              <Switch 
                checked={isPublicParticipation} 
                onCheckedChange={setIsPublicParticipation} 
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {language === 'ja' ? 'エントリー状況を教えてください：' : 'What is your entry status?'}
            </p>
            <Button
              className="w-full justify-start gap-3 h-auto py-3 bg-green-500 hover:bg-green-600"
              onClick={() => joinMutation.mutate({ status: 'registered', isPublic: isPublicParticipation })}
              disabled={joinMutation.isPending}
            >
              <CheckCircle2 className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">{language === 'ja' ? 'すでにエントリー済み' : 'Already Registered'}</p>
                <p className="text-xs opacity-80">{language === 'ja' ? '公式サイトでエントリー完了している' : 'Completed registration on official site'}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={() => joinMutation.mutate({ status: 'planning', isPublic: isPublicParticipation })}
              disabled={joinMutation.isPending}
            >
              <CircleDashed className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">{language === 'ja' ? 'これからエントリー予定' : 'Planning to Register'}</p>
                <p className="text-xs opacity-80">{language === 'ja' ? 'まだエントリーしていない' : 'Not yet registered'}</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Registered Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {language === 'ja' ? 'エントリー済み' : 'Already Registered'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ja' 
                ? 'この大会にエントリー済みとして登録されています。'
                : 'You are registered as entered for this tournament.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ja' ? '参加予定リストから削除しますか？' : 'Remove from your participation list?'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelDialogOpen(false)}
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  leaveMutation.mutate();
                  setCancelDialogOpen(false);
                }}
                disabled={leaveMutation.isPending}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {language === 'ja' ? '削除する' : 'Remove'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Venue Image Edit Dialog (Admin only) */}
      <Dialog open={venueImageDialogOpen} onOpenChange={setVenueImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {language === 'ja' ? '施設画像を変更' : 'Change Venue Image'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ja' 
                ? '画像のURLを入力してください（/images/venues/xxx.jpg または https://...）'
                : 'Enter the image URL (/images/venues/xxx.jpg or https://...)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="venue-image-url">
                {language === 'ja' ? '画像URL' : 'Image URL'}
              </Label>
              <Input
                id="venue-image-url"
                value={newVenueImageUrl}
                onChange={(e) => setNewVenueImageUrl(e.target.value)}
                placeholder="/images/venues/venue-name.jpg"
              />
            </div>
            {newVenueImageUrl && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={newVenueImageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setVenueImageDialogOpen(false)}
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={() => updateVenueImageMutation.mutate(newVenueImageUrl)}
                disabled={updateVenueImageMutation.isPending || !newVenueImageUrl}
              >
                {updateVenueImageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {language === 'ja' ? '保存' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default TournamentDetail;
