import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Globe, Users, ChevronLeft, ChevronRight, CalendarDays, List, ExternalLink, Clock, ChevronsLeft, ChevronsRight, UserPlus, UserMinus, Loader2, CheckCircle2, CircleDashed, Info } from "lucide-react";
import { format, parseISO, isAfter, isBefore, addMonths, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, getDay } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  registration_url: string | null;
  registration_deadline: string | null;
  slug: string | null;
  venue_id: string | null;
  venues: Venue | null;
}

const PAGE_SIZE = 30;

const Tournaments = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Initialize state from URL params
  const [showPastTournaments, setShowPastTournaments] = useState(() => searchParams.get('past') === 'true');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || "all");
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(() => searchParams.get('org'));
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => (searchParams.get('view') as 'list' | 'calendar') || 'list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(() => parseInt(searchParams.get('page') || '1', 10));
  const [participationDialog, setParticipationDialog] = useState<{ open: boolean; tournamentId: string | null }>({ open: false, tournamentId: null });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; tournamentId: string | null }>({ open: false, tournamentId: null });

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (showPastTournaments) params.set('past', 'true');
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (selectedOrganizer) params.set('org', selectedOrganizer);
    if (viewMode !== 'list') params.set('view', viewMode);
    if (currentPage > 1) params.set('page', currentPage.toString());
    setSearchParams(params, { replace: true });
  }, [showPastTournaments, activeTab, selectedOrganizer, viewMode, currentPage, setSearchParams]);
  
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
      // Swipe right from left edge to go back
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

  // Scroll to top helper
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Pagination with scroll to top
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    scrollToTop();
  }, [scrollToTop]);

  // Reset page when filters change
  const handleOrganizerChange = (org: string | null) => {
    setSelectedOrganizer(org);
    setCurrentPage(1);
  };
  
  const handlePastToggle = (checked: boolean) => {
    setShowPastTournaments(checked);
    setCurrentPage(1);
  };

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venues(id, name, name_ja, image_url)')
        .order('date_start', { ascending: true });
      
      if (error) throw error;
      return data as Tournament[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // User's participations with status
  const { data: userParticipations } = useQuery({
    queryKey: ['user-tournament-participations', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('tournament_id, status')
        .eq('user_id', user.id)
        .neq('status', 'canceled');
      
      if (error) throw error;
      const result: Record<string, string> = {};
      data?.forEach(p => {
        result[p.tournament_id] = p.status;
      });
      return result;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const joinMutation = useMutation({
    mutationFn: async ({ tournamentId, status }: { tournamentId: string; status: 'registered' | 'planning' }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          status: status
        });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['user-tournament-participations'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-participant-counts'] });
      setParticipationDialog({ open: false, tournamentId: null });
      toast.success(
        status === 'registered' 
          ? (language === 'ja' ? 'エントリー済みとして登録しました' : 'Registered as entered')
          : (language === 'ja' ? 'エントリー予定として登録しました' : 'Registered as planning to enter')
      );
    },
    onError: () => {
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tournament-participations'] });
      queryClient.invalidateQueries({ queryKey: ['tournament-participant-counts'] });
      toast.success(language === 'ja' ? '参加予定から削除しました' : 'Removed from your plan');
    },
    onError: () => {
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  });

  const { data: participantCounts } = useQuery({
    queryKey: ['tournament-participant-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .neq('status', 'canceled');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 2 * 60 * 1000,
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

  const now = new Date();
  const threeMonthsLater = addMonths(now, 3);

  const organizerData = Array.from(new Set(tournaments?.map(t => t.organizer) || []))
    .map(org => ({ name: org, count: tournaments?.filter(t => t.organizer === org).length || 0 }))
    .sort((a, b) => b.count - a.count);
  
  const organizers = organizerData.map(o => o.name);
  const organizerCounts = Object.fromEntries(organizerData.map(o => [o.name, o.count]));

  const filterByOrganizer = (list: Tournament[] | undefined) => {
    if (!selectedOrganizer || !list) return list;
    return list.filter(t => t.organizer === selectedOrganizer);
  };

  const filterByDate = (list: Tournament[] | undefined) => {
    if (!list) return list;
    if (showPastTournaments) return list;
    return list.filter(t => isAfter(parseISO(t.date_start), now));
  };

  const upcomingTournaments = filterByOrganizer(tournaments?.filter(t => isAfter(parseISO(t.date_start), now) && isBefore(parseISO(t.date_start), threeMonthsLater)));
  
  const tournamentsByCountry = tournaments?.reduce((acc, t) => {
    const country = t.country || 'OTHER';
    if (!acc[country]) acc[country] = [];
    acc[country].push(t);
    return acc;
  }, {} as Record<string, Tournament[]>) || {};
  
  const countries = Object.keys(tournamentsByCountry).sort((a, b) => {
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

  const getOrganizerColor = (organizer: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'ASJJF': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
      'JBJJF': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
      'IBJJF': { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
      'ADCC': { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
      'AJP': { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
      'SJJIF': { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' },
    };
    return colors[organizer] || { bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-500' };
  };

  const getOrganizerBadge = (organizer: string) => {
    const color = getOrganizerColor(organizer);
    return <Badge variant="outline" className={`${color.bg}/10 ${color.text} ${color.border}/30`}>{organizer}</Badge>;
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'JP': '🇯🇵', 'US': '🇺🇸', 'PT': '🇵🇹', 'PL': '🇵🇱', 'IT': '🇮🇹',
      'AE': '🇦🇪', 'GB': '🇬🇧', 'TW': '🇹🇼', 'BR': '🇧🇷', 'IE': '🇮🇪',
    };
    return flags[country] || '🌍';
  };

  const getTournamentUrl = (tournament: Tournament) => {
    const year = new Date(tournament.date_start).getFullYear();
    return `/tournaments/${year}/${tournament.slug}`;
  };

  // Calendar logic
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days for the start of the week
    const startDay = getDay(start);
    const paddingStart = Array.from({ length: startDay }, (_, i) => addDays(start, -(startDay - i)));
    
    // Add padding days for the end of the week
    const endDay = getDay(end);
    const paddingEnd = Array.from({ length: 6 - endDay }, (_, i) => addDays(end, i + 1));
    
    return [...paddingStart, ...days, ...paddingEnd];
  }, [currentMonth]);

  const getTournamentsForDay = (day: Date) => {
    return tournaments?.filter(t => {
      const start = parseISO(t.date_start);
      const end = t.date_end ? parseISO(t.date_end) : start;
      return (isSameDay(day, start) || isSameDay(day, end) || (isAfter(day, start) && isBefore(day, end)));
    }) || [];
  };

  const TournamentCard = ({ tournament, compact = false }: { tournament: Tournament; compact?: boolean }) => {
    const tournamentDate = parseISO(tournament.date_start);
    const isPast = isBefore(tournamentDate, now);
    const daysUntil = differenceInDays(tournamentDate, now);
    const showDaysLeft = !isPast && daysUntil >= 0 && daysUntil <= 14;
    const participantCount = participantCounts?.[tournament.id] || 0;
    const color = getOrganizerColor(tournament.organizer);
    const participationStatus = userParticipations?.[tournament.id];
    const isParticipating = !!participationStatus;
    const isMutating = joinMutation.isPending || leaveMutation.isPending;
    
    // Registration deadline logic
    const deadlineDate = tournament.registration_deadline ? parseISO(tournament.registration_deadline) : null;
    const isDeadlineSoon = deadlineDate && !isPast && differenceInDays(deadlineDate, now) >= 0 && differenceInDays(deadlineDate, now) <= 7;
    const isDeadlinePassed = deadlineDate && isBefore(deadlineDate, now);
    
    const handleParticipationToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        toast.error(language === 'ja' ? 'ログインが必要です' : 'Please login first');
        return;
      }
      if (isParticipating) {
        if (participationStatus === 'registered') {
          setCancelDialog({ open: true, tournamentId: tournament.id });
        } else {
          leaveMutation.mutate(tournament.id);
        }
      } else {
        setParticipationDialog({ open: true, tournamentId: tournament.id });
      }
    };
    
    const getStatusDisplay = () => {
      if (participationStatus === 'registered') {
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          text: language === 'ja' ? 'エントリー済' : 'Entered',
          className: 'bg-green-500 hover:bg-green-600'
        };
      }
      return {
        icon: <CircleDashed className="h-3 w-3" />,
        text: language === 'ja' ? 'エントリー予定' : 'Planning',
        className: 'bg-amber-500 hover:bg-amber-600'
      };
    };
    
    if (compact) {
      return (
        <Link to={getTournamentUrl(tournament)} className="block">
          <div className={`p-2 rounded-lg ${color.bg}/10 hover:${color.bg}/20 transition-colors border-l-2 ${color.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{getCountryFlag(tournament.country)}</span>
              <span className="text-xs font-medium truncate flex-1">{getName(tournament)}</span>
            </div>
          </div>
        </Link>
      );
    }
    
    const venueImageUrl = tournament.venues?.image_url || '/images/venues/default-venue.jpg';
    const [imageError, setImageError] = useState(false);
    
    return (
      <Link to={getTournamentUrl(tournament)}>
        <Card className={`group hover:shadow-xl transition-all duration-300 border-l-4 ${color.border} hover:scale-[1.02] cursor-pointer h-full overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
          {/* Venue image or gradient header */}
          {!imageError ? (
            <div className="relative h-24 w-full overflow-hidden">
              <img 
                src={venueImageUrl} 
                alt={tournament.venues?.name_ja || tournament.venues?.name || 'JiuFlow'} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
              {tournament.venues && (
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-[10px] text-foreground/80 bg-background/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {language === 'ja' ? tournament.venues?.name_ja : tournament.venues?.name}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className={`h-1.5 ${color.bg}`} />
          )}
          
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Header with badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {getOrganizerBadge(tournament.organizer)}
                    {isPast && (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        {language === 'ja' ? '終了' : 'Past'}
                      </Badge>
                    )}
                    {showDaysLeft && (
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs border-0 animate-pulse">
                        {daysUntil === 0 
                          ? (language === 'ja' ? '今日!' : 'Today!') 
                          : daysUntil === 1 
                            ? (language === 'ja' ? '明日!' : 'Tomorrow!')
                            : (language === 'ja' ? `あと${daysUntil}日` : `${daysUntil}d`)}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {getName(tournament)}
                  </h3>
                </div>
                <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{getCountryFlag(tournament.country)}</span>
              </div>
              
              {/* Info grid */}
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <div className={`p-1.5 rounded-md ${color.bg}/10`}>
                    <Calendar className={`h-3.5 w-3.5 ${color.text}`} />
                  </div>
                  <span className="font-medium">
                    {formatDateRange(tournament.date_start, tournament.date_end)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-1.5 rounded-md bg-muted/50">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="line-clamp-1">{getLocation(tournament)}</span>
                </div>
                {participantCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${color.bg}/10`}>
                      <Users className={`h-3.5 w-3.5 ${color.text}`} />
                    </div>
                    <span className={`font-medium ${color.text}`}>
                      {participantCount} {language === 'ja' ? '人参加予定' : 'planning'}
                    </span>
                  </div>
                )}
                {/* Registration deadline */}
                {deadlineDate && !isPast && (
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${isDeadlinePassed ? 'bg-muted/50' : isDeadlineSoon ? 'bg-orange-500/10' : 'bg-muted/50'}`}>
                      <Clock className={`h-3.5 w-3.5 ${isDeadlinePassed ? 'text-muted-foreground' : isDeadlineSoon ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-xs ${isDeadlinePassed ? 'text-muted-foreground line-through' : isDeadlineSoon ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                      {language === 'ja' ? '締切: ' : 'Deadline: '}
                      {format(deadlineDate, language === 'ja' ? 'M/d' : 'MMM d', { locale: getLocale() })}
                      {isDeadlineSoon && !isDeadlinePassed && (
                        <span className="ml-1">
                          ({differenceInDays(deadlineDate, now) === 0 
                            ? (language === 'ja' ? '今日!' : 'Today!') 
                            : (language === 'ja' ? `あと${differenceInDays(deadlineDate, now)}日` : `${differenceInDays(deadlineDate, now)}d left`)})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isPast && (
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  {tournament.registration_url && (
                    <a 
                      href={tournament.registration_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${color.text} hover:underline`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {language === 'ja' ? 'エントリー' : 'Register'}
                    </a>
                  )}
                  <Button
                    variant={isParticipating ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs gap-1 ${isParticipating ? getStatusDisplay().className : ''}`}
                    onClick={handleParticipationToggle}
                    disabled={isMutating}
                  >
                    {isMutating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isParticipating ? (
                      <>
                        <UserMinus className="h-3 w-3" />
                        {getStatusDisplay().text}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3" />
                        {language === 'ja' ? '参加予定' : 'Plan'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const TournamentSkeleton = () => (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TournamentSection = ({ title, tournaments, icon, loading = false, paginated = false }: { title: string; tournaments: Tournament[] | undefined; icon: React.ReactNode; loading?: boolean; paginated?: boolean }) => {
    const totalItems = tournaments?.length || 0;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const paginatedTournaments = paginated && tournaments 
      ? tournaments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : tournaments;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold">{title}</h2>
          {!loading && <Badge variant="secondary" className="ml-2 font-mono">{totalItems}</Badge>}
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <TournamentSkeleton key={i} />
            ))}
          </div>
        ) : paginatedTournaments && paginatedTournaments.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedTournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
            {paginated && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {language === 'ja' 
                    ? `${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(currentPage * PAGE_SIZE, totalItems)} / ${totalItems} 件`
                    : `${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(currentPage * PAGE_SIZE, totalItems)} of ${totalItems}`}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              {language === 'ja' ? '大会がありません' : 'No tournaments found'}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const CalendarView = () => {
    const weekDays = language === 'ja' 
      ? ['日', '月', '火', '水', '木', '金', '土']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-bold">
            {format(currentMonth, language === 'ja' ? 'yyyy年M月' : 'MMMM yyyy', { locale: getLocale() })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Week day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map((day, i) => (
              <div key={day} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayTournaments = getTournamentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, now);
              const dayOfWeek = getDay(day);

              return (
                <div 
                  key={i} 
                  className={`min-h-[80px] sm:min-h-[100px] p-1 border-t border-r ${
                    !isCurrentMonth ? 'bg-muted/30' : ''
                  } ${isToday ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    !isCurrentMonth ? 'text-muted-foreground/50' : 
                    dayOfWeek === 0 ? 'text-red-500' : 
                    dayOfWeek === 6 ? 'text-blue-500' : 
                    'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayTournaments.slice(0, 2).map((t) => (
                      <TournamentCard key={t.id} tournament={t} compact />
                    ))}
                    {dayTournaments.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayTournaments.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {language === 'ja' ? '大会スケジュール' : 'Tournament Schedule'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ja' 
              ? '2025年〜2026年の柔術大会スケジュール'
              : 'BJJ tournament schedule 2025-2026'}
          </p>
        </div>

        {/* View mode toggle & Filters */}
        <div className="mb-6 space-y-4">
          {/* View mode & past toggle */}
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="show-past"
                checked={showPastTournaments}
                onCheckedChange={handlePastToggle}
              />
              <Label htmlFor="show-past" className="text-sm text-muted-foreground cursor-pointer">
                {language === 'ja' ? '過去の大会も表示' : 'Show past'}
              </Label>
            </div>
            
            {/* View mode buttons */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-1.5"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'ja' ? 'リスト' : 'List'}</span>
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="gap-1.5"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'ja' ? 'カレンダー' : 'Calendar'}</span>
              </Button>
            </div>
          </div>

          {/* Organizer Filter */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <div className="flex gap-1.5 min-w-max">
              <Badge 
                variant={selectedOrganizer === null ? "default" : "outline"}
                className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                onClick={() => handleOrganizerChange(null)}
              >
                {language === 'ja' ? 'すべて' : 'All'}
              </Badge>
              {organizers.map((org) => {
                const color = getOrganizerColor(org);
                const count = organizerCounts[org] || 0;
                return (
                  <Badge 
                    key={org}
                    variant={selectedOrganizer === org ? "default" : "outline"}
                    className={`cursor-pointer hover:opacity-80 transition-opacity text-xs ${
                      selectedOrganizer === org ? '' : `${color.bg}/10 ${color.text} ${color.border}/30`
                    }`}
                    onClick={() => handleOrganizerChange(org)}
                  >
                    {org} <span className="ml-1 opacity-70">({count})</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && <CalendarView />}

        {/* List View with Tabs */}
        {viewMode === 'list' && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto -mx-4 px-4 pb-2">
              <TabsList className="inline-flex h-auto gap-1 min-w-max bg-muted/50 p-1">
                <TabsTrigger value="upcoming" className="gap-1.5 text-xs sm:text-sm px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Calendar className="h-4 w-4" />
                  {language === 'ja' ? '直近' : 'Upcoming'}
                </TabsTrigger>
                {countries.slice(0, 6).map((countryCode) => (
                  <TabsTrigger key={countryCode} value={`country-${countryCode}`} className="gap-1 text-xs sm:text-sm px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    {getCountryFlag(countryCode)}
                    <span className="text-xs text-muted-foreground">({tournamentsByCountry[countryCode]?.length})</span>
                  </TabsTrigger>
                ))}
                <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Globe className="h-4 w-4" />
                  {language === 'ja' ? '全部' : 'All'}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming">
              <TournamentSection 
                title={language === 'ja' ? '直近3ヶ月の大会' : 'Next 3 Months'}
                tournaments={upcomingTournaments}
                icon={<Calendar className="h-5 w-5 text-primary" />}
                loading={isLoading}
              />
            </TabsContent>

            {countries.map((countryCode) => (
              <TabsContent key={countryCode} value={`country-${countryCode}`}>
                <TournamentSection 
                  title={`${getCountryFlag(countryCode)} ${getCountryName(countryCode)}`}
                  tournaments={filterByOrganizer(filterByDate(tournamentsByCountry[countryCode]))}
                  icon={<span className="text-xl">{getCountryFlag(countryCode)}</span>}
                  loading={isLoading}
                />
              </TabsContent>
            ))}

            <TabsContent value="all">
              <TournamentSection 
                title={language === 'ja' ? 'すべての大会' : 'All Tournaments'}
                tournaments={filterByOrganizer(filterByDate(tournaments))}
                icon={<Globe className="h-5 w-5 text-primary" />}
                loading={isLoading}
                paginated
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Participation Status Dialog */}
      <Dialog 
        open={participationDialog.open} 
        onOpenChange={(open) => setParticipationDialog({ open, tournamentId: open ? participationDialog.tournamentId : null })}
      >
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
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ja' ? 'エントリー状況を教えてください：' : 'What is your entry status?'}
            </p>
            <Button
              className="w-full justify-start gap-3 h-auto py-3 bg-green-500 hover:bg-green-600"
              onClick={() => participationDialog.tournamentId && joinMutation.mutate({ tournamentId: participationDialog.tournamentId, status: 'registered' })}
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
              onClick={() => participationDialog.tournamentId && joinMutation.mutate({ tournamentId: participationDialog.tournamentId, status: 'planning' })}
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
      <Dialog 
        open={cancelDialog.open} 
        onOpenChange={(open) => setCancelDialog({ open, tournamentId: open ? cancelDialog.tournamentId : null })}
      >
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
                onClick={() => setCancelDialog({ open: false, tournamentId: null })}
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (cancelDialog.tournamentId) {
                    leaveMutation.mutate(cancelDialog.tournamentId);
                    setCancelDialog({ open: false, tournamentId: null });
                  }
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

      <Footer />
    </div>
  );
};

export default Tournaments;
