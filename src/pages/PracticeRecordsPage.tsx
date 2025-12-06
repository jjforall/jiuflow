import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, 
  addMonths, subMonths, isToday, isSameMonth, startOfWeek, endOfWeek
} from "date-fns";
import { ja, enUS, ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Play, Plus, Minus, Eye, Repeat, Calendar, X, ExternalLink 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SeriesBadge } from "@/components/ui/series-badge";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  category: string;
  thumbnail_url: string | null;
  series_name: string | null;
  series_prefix: string | null;
  series_order: number | null;
  video_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
}

interface VideoView {
  id: string;
  video_id: string;
  view_count: number;
  last_viewed_at: string;
}

interface PracticeRecord {
  id: string;
  technique_id: string | null;
  practice_date: string;
  repetition_count: number | null;
}

const PracticeRecordsPage = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [videoViews, setVideoViews] = useState<VideoView[]>([]);
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Pending changes for debounced saving
  const [pendingChanges, setPendingChanges] = useState<Map<string, { techniqueId: string; date: Date; count: number }>>(new Map());
  const saveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const locale = language === "ja" ? ja : language === "pt" ? ptBR : enUS;

  const t = {
    ja: {
      title: "練習記録",
      noRecords: "この日の記録はありません",
      watched: "視聴",
      practiced: "練習",
      addPractice: "練習回数を追加",
      times: "回",
      today: "今日",
      monthlyStats: "今月の統計",
      totalPractice: "総練習回数",
      totalViews: "総視聴回数",
      activeDays: "練習日数",
    },
    en: {
      title: "Practice Records",
      noRecords: "No records for this day",
      watched: "Watched",
      practiced: "Practiced",
      addPractice: "Add Practice",
      times: "times",
      today: "Today",
      monthlyStats: "Monthly Stats",
      totalPractice: "Total Practice",
      totalViews: "Total Views",
      activeDays: "Active Days",
    },
    pt: {
      title: "Registros de Prática",
      noRecords: "Nenhum registro para este dia",
      watched: "Assistido",
      practiced: "Praticado",
      addPractice: "Adicionar Prática",
      times: "vezes",
      today: "Hoje",
      monthlyStats: "Estatísticas do Mês",
      totalPractice: "Total de Práticas",
      totalViews: "Total de Visualizações",
      activeDays: "Dias Ativos",
    },
  };

  const texts = t[language as keyof typeof t] || t.ja;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [techniquesRes, viewsRes, recordsRes] = await Promise.all([
        supabase.from("techniques").select("id, name, name_ja, name_pt, category, thumbnail_url, series_name, series_prefix, series_order, video_url, video_url_ja, video_url_pt"),
        supabase.from("video_views").select("*").eq("user_id", user.id),
        supabase.from("practice_records").select("id, technique_id, practice_date, repetition_count").eq("user_id", user.id),
      ]);

      if (techniquesRes.data) setTechniques(techniquesRes.data);
      if (viewsRes.data) setVideoViews(viewsRes.data);
      if (recordsRes.data) setPracticeRecords(recordsRes.data);
    } finally {
      setLoading(false);
    }
  };

  const getTechniqueName = (technique: Technique) => {
    if (language === "ja") return technique.name_ja;
    if (language === "pt") return technique.name_pt;
    return technique.name;
  };

  const getSeriesLabel = (technique: Technique) => {
    if (technique.series_prefix && technique.series_order) {
      return `${technique.series_prefix}-${technique.series_order}`;
    }
    return technique.series_prefix || technique.series_name || technique.category;
  };

  const getVideoUrl = (technique: Technique) => {
    if (language === "ja" && technique.video_url_ja) return technique.video_url_ja;
    if (language === "pt" && technique.video_url_pt) return technique.video_url_pt;
    return technique.video_url;
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get data for a specific date
  const getDateData = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Views on this date
    const dayViews = videoViews.filter(v => 
      format(new Date(v.last_viewed_at), "yyyy-MM-dd") === dateStr
    );
    
    // Practice records on this date
    const dayPractice = practiceRecords.filter(r => r.practice_date === dateStr);
    
    const viewedTechniqueIds = dayViews.map(v => v.video_id);
    const practicedTechniqueIds = dayPractice.map(p => p.technique_id).filter(Boolean) as string[];
    
    const viewedTechniques = techniques.filter(t => viewedTechniqueIds.includes(t.id));
    const practicedTechniques = techniques.filter(t => practicedTechniqueIds.includes(t.id));
    
    const totalPracticeCount = dayPractice.reduce((sum, r) => sum + (r.repetition_count || 1), 0);
    
    return {
      views: dayViews,
      practice: dayPractice,
      viewedTechniques,
      practicedTechniques,
      totalPracticeCount,
      hasActivity: dayViews.length > 0 || dayPractice.length > 0,
    };
  };

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthViews = videoViews.filter(v => {
      const date = new Date(v.last_viewed_at);
      return date >= monthStart && date <= monthEnd;
    });
    
    const monthPractice = practiceRecords.filter(r => {
      const date = new Date(r.practice_date);
      return date >= monthStart && date <= monthEnd;
    });
    
    const activeDays = new Set([
      ...monthViews.map(v => format(new Date(v.last_viewed_at), "yyyy-MM-dd")),
      ...monthPractice.map(r => r.practice_date),
    ]).size;
    
    return {
      totalViews: monthViews.reduce((sum, v) => sum + v.view_count, 0),
      totalPractice: monthPractice.reduce((sum, r) => sum + (r.repetition_count || 1), 0),
      activeDays,
    };
  }, [currentMonth, videoViews, practiceRecords]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  // Save practice record to database
  const savePracticeRecord = useCallback(async (techniqueId: string, date: Date, count: number) => {
    if (!user) return;
    
    const dateStr = format(date, "yyyy-MM-dd");
    const existingRecord = practiceRecords.find(
      r => r.technique_id === techniqueId && r.practice_date === dateStr
    );
    
    try {
      if (count <= 0) {
        // Delete the record if count is 0 or less
        if (existingRecord) {
          const { error } = await supabase
            .from("practice_records")
            .delete()
            .eq("id", existingRecord.id);
          
          if (error) throw error;
          setPracticeRecords(prev => prev.filter(r => r.id !== existingRecord.id));
        }
      } else if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("practice_records")
          .update({ repetition_count: count })
          .eq("id", existingRecord.id);
        
        if (error) throw error;
        setPracticeRecords(prev => prev.map(r => 
          r.id === existingRecord.id 
            ? { ...r, repetition_count: count }
            : r
        ));
      } else {
        // Create new record
        const { data, error } = await supabase
          .from("practice_records")
          .insert({
            user_id: user.id,
            technique_id: techniqueId,
            practice_date: dateStr,
            repetition_count: count,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setPracticeRecords(prev => [...prev, data]);
        }
      }
      
      toast.success(language === "ja" ? "練習を記録しました" : "Practice recorded");
    } catch (error) {
      console.error("Error saving practice:", error);
      toast.error(language === "ja" ? "エラーが発生しました" : "Error occurred");
    }
  }, [user, practiceRecords, language]);

  // Get the current display count (including pending changes)
  const getDisplayCount = useCallback((techniqueId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${techniqueId}-${dateStr}`;
    
    // Check pending changes first
    const pending = pendingChanges.get(key);
    if (pending !== undefined) {
      return pending.count;
    }
    
    // Otherwise get from practice records
    const record = practiceRecords.find(
      r => r.technique_id === techniqueId && r.practice_date === dateStr
    );
    return record?.repetition_count || 0;
  }, [pendingChanges, practiceRecords]);

  // Handle practice count change with debounce
  const handlePracticeChange = useCallback((techniqueId: string, date: Date, delta: number) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${techniqueId}-${dateStr}`;
    
    // Get current count
    const currentCount = getDisplayCount(techniqueId, date);
    const newCount = Math.max(0, currentCount + delta);
    
    // Update pending changes immediately for UI
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(key, { techniqueId, date, count: newCount });
      return newMap;
    });
    
    // Clear existing timeout for this key
    const existingTimeout = saveTimeoutRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to save after 2 seconds
    const timeout = setTimeout(() => {
      savePracticeRecord(techniqueId, date, newCount);
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      saveTimeoutRef.current.delete(key);
    }, 2000);
    
    saveTimeoutRef.current.set(key, timeout);
  }, [getDisplayCount, savePracticeRecord]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      saveTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const handleAddPractice = (techniqueId: string, date: Date) => {
    handlePracticeChange(techniqueId, date, 10);
  };

  const handleRemovePractice = (techniqueId: string, date: Date) => {
    handlePracticeChange(techniqueId, date, -10);
  };

  const getPracticeCount = (techniqueId: string, date: Date) => {
    return getDisplayCount(techniqueId, date);
  };

  const handleOpenVideo = (technique: Technique) => {
    setSelectedTechnique(technique);
    setVideoModalOpen(true);
  };

  const weekDays = language === "ja" 
    ? ["日", "月", "火", "水", "木", "金", "土"]
    : language === "pt"
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          {loading ? (
            <>
              <Skeleton className="h-10 w-64 mb-8" />
              <Skeleton className="h-96 w-full rounded-lg" />
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                  {texts.title}
                </h1>
              </div>

              {/* Monthly Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{monthlyStats.totalPractice}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{texts.totalPractice}</div>
                </Card>
                <Card className="p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{monthlyStats.totalViews}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{texts.totalViews}</div>
                </Card>
                <Card className="p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{monthlyStats.activeDays}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{texts.activeDays}</div>
                </Card>
              </div>

              {/* Calendar */}
              <Card>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-lg sm:text-xl">
                      {format(currentMonth, language === "ja" ? "yyyy年 M月" : "MMMM yyyy", { locale })}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  {/* Week days header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day, i) => (
                      <div
                        key={day}
                        className={`text-center text-xs sm:text-sm font-medium py-2 ${
                          i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date) => {
                      const dateData = getDateData(date);
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const dayOfWeek = date.getDay();

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => handleDateClick(date)}
                          className={`
                            relative aspect-square p-1 rounded-lg transition-all
                            ${isCurrentMonth ? "hover:bg-accent" : "opacity-40"}
                            ${isToday(date) ? "ring-2 ring-primary" : ""}
                            ${dateData.hasActivity ? "bg-primary/10" : ""}
                          `}
                        >
                          <div className={`text-xs sm:text-sm font-medium ${
                            dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""
                          }`}>
                            {format(date, "d")}
                          </div>
                          
                          {/* Activity indicators */}
                          {dateData.hasActivity && (
                            <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
                              {dateData.views.length > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="視聴" />
                              )}
                              {dateData.practice.length > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="練習" />
                              )}
                            </div>
                          )}
                          
                          {/* Practice count badge */}
                          {dateData.totalPracticeCount > 0 && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold">
                              {dateData.totalPracticeCount}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{texts.watched}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{texts.practiced}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's quick action */}
              <Card className="mt-6">
                <CardHeader className="p-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    {texts.today}: {format(new Date(), language === "ja" ? "M月d日" : "MMM d", { locale })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {techniques.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{texts.noRecords}</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {videoViews
                        .filter(v => format(new Date(v.last_viewed_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
                        .slice(0, 5)
                        .map((view) => {
                          const technique = techniques.find(t => t.id === view.video_id);
                          if (!technique) return null;
                          const practiceCount = getPracticeCount(technique.id, new Date());
                          
                          return (
                            <div
                              key={view.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 overflow-hidden"
                            >
                              <button 
                                onClick={() => handleOpenVideo(technique)} 
                                className="flex-shrink-0 group relative"
                              >
                                <div className="w-14 h-9 sm:w-16 sm:h-10 rounded bg-muted overflow-hidden group-hover:ring-2 ring-primary transition-all">
                                  {technique.thumbnail_url ? (
                                    <img
                                      src={technique.thumbnail_url}
                                      alt={getTechniqueName(technique)}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Play className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </button>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleOpenVideo(technique)} className="hover:text-primary text-left truncate">
                                    <span className="text-xs sm:text-sm font-medium">{getTechniqueName(technique)}</span>
                                  </button>
                                  <Link to={`/video/${technique.id}`} className="flex-shrink-0 text-muted-foreground hover:text-primary">
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                                <SeriesBadge prefix={technique.series_prefix || ''} order={technique.series_order || undefined} className="text-[10px] h-5 min-w-0 px-1.5" />
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleRemovePractice(technique.id, new Date())}
                                  disabled={practiceCount === 0}
                                >
                                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <span className="w-6 sm:w-8 text-center font-bold text-sm sm:text-lg">{practiceCount}</span>
                                <Button
                                  size="icon"
                                  variant="default"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleAddPractice(technique.id, new Date())}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Date Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, language === "ja" ? "yyyy年M月d日" : "MMMM d, yyyy", { locale })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDate && (() => {
            const dateData = getDateData(selectedDate);
            
            return (
              <div className="space-y-4">
                {/* Viewed videos */}
                {dateData.viewedTechniques.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      {texts.watched}
                    </h3>
                    <div className="space-y-2">
                      {dateData.viewedTechniques.map((technique) => {
                        const practiceCount = getPracticeCount(technique.id, selectedDate);
                        
                        return (
                          <div
                            key={technique.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 overflow-hidden"
                          >
                            <button 
                              onClick={() => handleOpenVideo(technique)} 
                              className="flex-shrink-0 group relative"
                            >
                              <div className="w-14 h-9 sm:w-16 sm:h-10 rounded bg-muted overflow-hidden group-hover:ring-2 ring-primary transition-all">
                                {technique.thumbnail_url ? (
                                  <img
                                    src={technique.thumbnail_url}
                                    alt={getTechniqueName(technique)}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            </button>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenVideo(technique)} className="hover:text-primary text-left truncate">
                                  <span className="text-xs sm:text-sm font-medium">{getTechniqueName(technique)}</span>
                                </button>
                                <Link to={`/video/${technique.id}`} className="flex-shrink-0 text-muted-foreground hover:text-primary">
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                              <SeriesBadge prefix={technique.series_prefix || ''} order={technique.series_order || undefined} className="text-[10px] h-5 min-w-0 px-1.5" />
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleRemovePractice(technique.id, selectedDate)}
                                disabled={practiceCount === 0}
                              >
                                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-bold text-sm sm:text-lg">{practiceCount}</span>
                              <Button
                                size="icon"
                                variant="default"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleAddPractice(technique.id, selectedDate)}
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Practiced only (not viewed that day) */}
                {dateData.practicedTechniques.filter(
                  t => !dateData.viewedTechniques.some(v => v.id === t.id)
                ).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-green-500" />
                      {texts.practiced}
                    </h3>
                    <div className="space-y-2">
                      {dateData.practicedTechniques
                        .filter(t => !dateData.viewedTechniques.some(v => v.id === t.id))
                        .map((technique) => {
                          const practiceCount = getPracticeCount(technique.id, selectedDate);
                          
                          return (
                            <div
                              key={technique.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 overflow-hidden"
                            >
                              <button 
                                onClick={() => handleOpenVideo(technique)} 
                                className="flex-shrink-0 group relative"
                              >
                                <div className="w-14 h-9 sm:w-16 sm:h-10 rounded bg-muted overflow-hidden group-hover:ring-2 ring-primary transition-all">
                                  {technique.thumbnail_url ? (
                                    <img
                                      src={technique.thumbnail_url}
                                      alt={getTechniqueName(technique)}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Play className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </button>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleOpenVideo(technique)} className="hover:text-primary text-left truncate">
                                    <span className="text-xs sm:text-sm font-medium">{getTechniqueName(technique)}</span>
                                  </button>
                                  <Link to={`/video/${technique.id}`} className="flex-shrink-0 text-muted-foreground hover:text-primary">
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                                <SeriesBadge prefix={technique.series_prefix || ''} order={technique.series_order || undefined} className="text-[10px] h-5 min-w-0 px-1.5" />
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleRemovePractice(technique.id, selectedDate)}
                                  disabled={practiceCount === 0}
                                >
                                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <span className="w-6 sm:w-8 text-center font-bold text-sm sm:text-lg">{practiceCount}</span>
                                <Button
                                  size="icon"
                                  variant="default"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() => handleAddPractice(technique.id, selectedDate)}
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {!dateData.hasActivity && (
                  <p className="text-center text-muted-foreground py-8">{texts.noRecords}</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedTechnique ? getTechniqueName(selectedTechnique) : "Video"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setVideoModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            {selectedTechnique && getVideoUrl(selectedTechnique) && (
              <div className="aspect-video">
                <VideoPlayer
                  videoUrl={getVideoUrl(selectedTechnique)!}
                  autoPlay={true}
                  thumbnailUrl={selectedTechnique.thumbnail_url}
                />
              </div>
            )}
            {selectedTechnique && (
              <div className="p-4 bg-background flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{getTechniqueName(selectedTechnique)}</h3>
                  <SeriesBadge prefix={selectedTechnique.series_prefix || ''} order={selectedTechnique.series_order || undefined} className="mt-1" />
                </div>
                <Link 
                  to={`/video/${selectedTechnique.id}`} 
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">{language === "ja" ? "動画ページへ" : "Open page"}</span>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeRecordsPage;
