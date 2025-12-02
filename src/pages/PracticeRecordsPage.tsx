import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Edit2, Trash2, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface PracticeRecord {
  id: string;
  user_id: string;
  technique_id: string | null;
  user_video_id: string | null;
  practice_date: string;
  duration_minutes: number | null;
  difficulty_rating: number | null;
  success_rating: number | null;
  proficiency_level: number | null;
  repetition_count: number | null;
  notes: string | null;
  created_at: string;
  technique?: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
    category: string;
  };
  user_video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

interface TechniqueStats {
  technique_id: string;
  technique_name: string;
  total_sessions: number;
  total_repetitions: number;
  avg_proficiency: number;
  latest_proficiency: number;
}

interface VideoView {
  id: string;
  video_id: string;
  last_viewed_at: string;
  view_count: number;
  video: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
    category: string;
    thumbnail_url: string | null;
  };
}

const PracticeRecordsPage = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoView | null>(null);
  const [formData, setFormData] = useState({
    practice_date: new Date(),
    proficiency_level: "",
    repetition_count: "1",
    notes: "",
  });

  const t = {
    ja: {
      title: "練習記録",
      recentVideosTab: "最近見た動画から記録",
      allRecordsTab: "すべての記録",
      otherPracticeTab: "その他の練習",
      statsTab: "技の統計",
      noRecentVideos: "最近見た動画がありません",
      noRecords: "練習記録がありません",
      addRecord: "記録を追加",
      addFromVideo: "この動画の練習を記録",
      editRecord: "記録を編集",
      practiceDate: "練習日",
      duration: "練習時間（分）",
      difficulty: "難易度",
      success: "達成度",
      proficiency: "熟練度",
      repetitions: "練習回数",
      notes: "メモ",
      save: "保存",
      cancel: "キャンセル",
      delete: "削除",
      deleteConfirm: "この記録を削除しますか？",
      lastViewed: "最後に視聴",
      viewCount: "回視聴",
      video: "動画",
      technique: "技術",
      other: "その他",
      totalSessions: "総練習回数",
      totalReps: "累計練習回数",
      avgProficiency: "平均熟練度",
      currentProficiency: "現在の熟練度",
      reps: "回",
      times: "回",
      goal: "目標達成",
      milestone: "マイルストーン",
      level: "レベル",
      beginner: "初心者",
      intermediate: "中級者",
      advanced: "上級者",
      expert: "エキスパート",
      master: "マスター",
      nextMilestone: "次の目標まで",
      keepGoing: "頑張りましょう！",
      almostThere: "もう少しです！",
      wellDone: "素晴らしい！",
      amazing: "すごい！",
      incredible: "信じられない！",
      legend: "レジェンド！",
    },
    en: {
      title: "Practice Records",
      recentVideosTab: "Record from Recent Videos",
      allRecordsTab: "All Records",
      otherPracticeTab: "Other Practice",
      statsTab: "Technique Stats",
      noRecentVideos: "No recent videos",
      noRecords: "No practice records",
      addRecord: "Add Record",
      addFromVideo: "Record practice for this video",
      editRecord: "Edit Record",
      practiceDate: "Practice Date",
      duration: "Duration (minutes)",
      difficulty: "Difficulty",
      success: "Success Rate",
      proficiency: "Proficiency Level",
      repetitions: "Repetitions",
      notes: "Notes",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      deleteConfirm: "Delete this record?",
      lastViewed: "Last viewed",
      viewCount: "views",
      video: "Video",
      technique: "Technique",
      other: "Other",
      totalSessions: "Total Sessions",
      totalReps: "Total Repetitions",
      avgProficiency: "Avg. Proficiency",
      currentProficiency: "Current Proficiency",
      reps: "reps",
      times: "times",
      goal: "Goal",
      milestone: "Milestone",
      level: "Level",
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
      master: "Master",
      nextMilestone: "Next milestone",
      keepGoing: "Keep going!",
      almostThere: "Almost there!",
      wellDone: "Well done!",
      amazing: "Amazing!",
      incredible: "Incredible!",
      legend: "Legend!",
    },
    pt: {
      title: "Registros de Prática",
      recentVideosTab: "Registrar de Vídeos Recentes",
      allRecordsTab: "Todos os Registros",
      otherPracticeTab: "Outras Práticas",
      statsTab: "Estatísticas de Técnicas",
      noRecentVideos: "Nenhum vídeo recente",
      noRecords: "Nenhum registro de prática",
      addRecord: "Adicionar Registro",
      addFromVideo: "Registrar prática para este vídeo",
      editRecord: "Editar Registro",
      practiceDate: "Data da Prática",
      duration: "Duração (minutos)",
      difficulty: "Dificuldade",
      success: "Taxa de Sucesso",
      proficiency: "Nível de Proficiência",
      repetitions: "Repetições",
      notes: "Notas",
      save: "Salvar",
      cancel: "Cancelar",
      delete: "Excluir",
      deleteConfirm: "Excluir este registro?",
      lastViewed: "Última visualização",
      viewCount: "visualizações",
      video: "Vídeo",
      technique: "Técnica",
      other: "Outro",
      totalSessions: "Sessões Totais",
      totalReps: "Repetições Totais",
      avgProficiency: "Proficiência Média",
      currentProficiency: "Proficiência Atual",
      reps: "reps",
      times: "vezes",
      goal: "Meta",
      milestone: "Marco",
      level: "Nível",
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
      expert: "Especialista",
      master: "Mestre",
      nextMilestone: "Próxima meta",
      keepGoing: "Continue!",
      almostThere: "Quase lá!",
      wellDone: "Muito bem!",
      amazing: "Incrível!",
      incredible: "Inacreditável!",
      legend: "Lendário!",
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
      await Promise.all([loadRecentVideos(), loadRecords()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentVideos = async () => {
    if (!user) return;

    try {
      const { data: views, error } = await supabase
        .from("video_views")
        .select("id, video_id, last_viewed_at, view_count")
        .eq("user_id", user.id)
        .order("last_viewed_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const videoIds = views?.map((v) => v.video_id) || [];
      if (videoIds.length === 0) {
        setRecentVideos([]);
        return;
      }

      const { data: techniques, error: techniquesError } = await supabase
        .from("techniques")
        .select("id, name, name_ja, name_pt, category, thumbnail_url")
        .in("id", videoIds);

      if (techniquesError) throw techniquesError;

      const videoViews: VideoView[] = (views || [])
        .map((view) => {
          const technique = techniques?.find((t) => t.id === view.video_id);
          if (!technique) return null;
          return {
            ...view,
            video: technique,
          };
        })
        .filter((v): v is VideoView => v !== null);

      setRecentVideos(videoViews);
    } catch (error) {
      console.error("Error loading recent videos:", error);
    }
  };

  const loadRecords = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("practice_records")
        .select(
          `
          *,
          technique:techniques(id, name, name_ja, name_pt, category),
          user_video:user_videos(id, title, thumbnail_url)
        `
        )
        .eq("user_id", user.id)
        .order("practice_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  const openDialog = (video?: VideoView, record?: PracticeRecord) => {
    setSelectedVideo(video || null);
    setEditingRecord(record || null);
    setFormData({
      practice_date: record ? new Date(record.practice_date) : new Date(),
      proficiency_level: record?.proficiency_level?.toString() || "",
      repetition_count: record?.repetition_count?.toString() || "1",
      notes: record?.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setSelectedVideo(null);
    setFormData({
      practice_date: new Date(),
      proficiency_level: "",
      repetition_count: "1",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!formData.proficiency_level) {
      toast.error(language === "ja" ? "熟練度を選択してください" : language === "pt" ? "Selecione o nível de proficiência" : "Please select proficiency level");
      return;
    }

    try {
      const recordData = {
        user_id: user.id,
        technique_id: selectedVideo?.video_id || editingRecord?.technique_id || null,
        user_video_id: null,
        practice_date: format(formData.practice_date, "yyyy-MM-dd"),
        duration_minutes: null,
        difficulty_rating: null,
        success_rating: null,
        proficiency_level: parseInt(formData.proficiency_level),
        repetition_count: parseInt(formData.repetition_count) || 1,
        notes: formData.notes.trim() || null,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from("practice_records")
          .update(recordData)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast.success(language === "ja" ? "記録を更新しました" : language === "pt" ? "Registro atualizado" : "Record updated");
      } else {
        const { error } = await supabase.from("practice_records").insert([recordData]);

        if (error) throw error;
        toast.success(language === "ja" ? "記録を追加しました" : language === "pt" ? "Registro adicionado" : "Record added");
      }

      await loadRecords();
      closeDialog();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error(language === "ja" ? "保存に失敗しました" : language === "pt" ? "Falha ao salvar" : "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(texts.deleteConfirm)) return;

    try {
      const { error } = await supabase.from("practice_records").delete().eq("id", id);

      if (error) throw error;
      toast.success(language === "ja" ? "記録を削除しました" : language === "pt" ? "Registro excluído" : "Record deleted");
      await loadRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error(language === "ja" ? "削除に失敗しました" : language === "pt" ? "Falha ao excluir" : "Failed to delete");
    }
  };

  const getTechniqueName = (technique: any) => {
    if (language === "ja") return technique.name_ja;
    if (language === "pt") return technique.name_pt;
    return technique.name;
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const calculateTechniqueStats = (): TechniqueStats[] => {
    const statsMap = new Map<string, TechniqueStats>();

    records.forEach((record) => {
      if (!record.technique_id || !record.technique) return;

      const existing = statsMap.get(record.technique_id);
      const reps = record.repetition_count || 0;
      const prof = record.proficiency_level || 0;

      if (existing) {
        existing.total_sessions += 1;
        existing.total_repetitions += reps;
        if (prof > 0) {
          existing.avg_proficiency = 
            (existing.avg_proficiency * (existing.total_sessions - 1) + prof) / existing.total_sessions;
        }
        if (new Date(record.practice_date) >= new Date(records.find(r => r.technique_id === record.technique_id)!.practice_date)) {
          existing.latest_proficiency = prof;
        }
      } else {
        statsMap.set(record.technique_id, {
          technique_id: record.technique_id,
          technique_name: getTechniqueName(record.technique),
          total_sessions: 1,
          total_repetitions: reps,
          avg_proficiency: prof,
          latest_proficiency: prof,
        });
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.total_sessions - a.total_sessions);
  };

  const getVideoStats = (videoId: string) => {
    const videoRecords = records.filter(r => r.technique_id === videoId);
    const totalSessions = videoRecords.length;
    const totalReps = videoRecords.reduce((sum, r) => sum + (r.repetition_count || 0), 0);
    const latestRecord = videoRecords[0]; // Already sorted by date desc
    return { totalSessions, totalReps, latestRecord };
  };

  const getLevel = (count: number) => {
    if (count >= 100) return { name: texts.master, color: "from-purple-500 to-pink-500", emoji: "👑" };
    if (count >= 75) return { name: texts.expert, color: "from-orange-500 to-red-500", emoji: "🔥" };
    if (count >= 50) return { name: texts.advanced, color: "from-blue-500 to-cyan-500", emoji: "⭐" };
    if (count >= 25) return { name: texts.intermediate, color: "from-green-500 to-emerald-500", emoji: "💪" };
    return { name: texts.beginner, color: "from-gray-500 to-slate-500", emoji: "🌱" };
  };

  const getMotivationMessage = (count: number, nextMilestone: number) => {
    const remaining = nextMilestone - count;
    if (count >= 100) return texts.legend;
    if (remaining <= 5) return texts.almostThere;
    if (count >= 50) return texts.amazing;
    if (count >= 25) return texts.wellDone;
    return texts.keepGoing;
  };

  const getNextMilestone = (count: number) => {
    if (count >= 100) return 100;
    if (count >= 75) return 100;
    if (count >= 50) return 75;
    if (count >= 25) return 50;
    if (count >= 10) return 25;
    return 10;
  };

  const getMilestoneBadges = (count: number) => {
    const milestones = [
      { value: 10, emoji: "🥉", color: "bg-amber-700" },
      { value: 25, emoji: "🥈", color: "bg-gray-400" },
      { value: 50, emoji: "🥇", color: "bg-yellow-500" },
      { value: 75, emoji: "💎", color: "bg-blue-500" },
      { value: 100, emoji: "👑", color: "bg-purple-500" },
    ];
    return milestones.filter(m => count >= m.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">{texts.title}</h1>
          </div>

          <Tabs defaultValue="recent" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
              <TabsTrigger value="recent" className="text-xs sm:text-sm whitespace-normal h-auto py-2">
                {texts.recentVideosTab}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-normal h-auto py-2">
                {texts.allRecordsTab}
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs sm:text-sm whitespace-normal h-auto py-2">
                {texts.statsTab}
              </TabsTrigger>
              <TabsTrigger value="other" className="text-xs sm:text-sm whitespace-normal h-auto py-2">
                {texts.otherPracticeTab}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              {recentVideos.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noRecentVideos}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recentVideos.map((video) => {
                    const stats = getVideoStats(video.video_id);
                    const level = getLevel(stats.totalSessions);
                    const nextMilestone = getNextMilestone(stats.totalSessions);
                    const progress = (stats.totalSessions / nextMilestone) * 100;
                    const badges = getMilestoneBadges(stats.totalSessions);
                    
                    return (
                      <Card key={video.id} className="overflow-hidden hover-scale transition-all duration-300 hover:shadow-lg">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="relative w-full sm:w-32 h-32 sm:h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              {video.video.thumbnail_url && (
                                <img
                                  src={video.video.thumbnail_url}
                                  alt={getTechniqueName(video.video)}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {stats.totalSessions > 0 && (
                                <div className={`absolute top-1 right-1 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${level.color} shadow-lg`}>
                                  {level.emoji} {stats.totalSessions}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-1 text-sm sm:text-base line-clamp-2">{getTechniqueName(video.video)}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mb-2">{video.video.category}</p>
                              
                              {stats.totalSessions > 0 ? (
                                <div className="space-y-2 mb-2">
                                  <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-primary">{level.name}</span>
                                      <span className="text-xs text-muted-foreground">{stats.totalSessions}/100</span>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full bg-gradient-to-r ${level.color} transition-all duration-500 ease-out`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      />
                                    </div>
                                    {stats.totalSessions < 100 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {texts.nextMilestone}: {nextMilestone - stats.totalSessions}{texts.times}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {badges.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {badges.map((badge) => (
                                        <div 
                                          key={badge.value}
                                          className={`${badge.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-scale-in`}
                                        >
                                          <span>{badge.emoji}</span>
                                          <span className="font-bold">{badge.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground mb-2">
                                  <span className="whitespace-nowrap">
                                    {texts.lastViewed}: {format(new Date(video.last_viewed_at), "yyyy/MM/dd")}
                                  </span>
                                  <span className="whitespace-nowrap">
                                    {video.view_count} {texts.viewCount}
                                  </span>
                                </div>
                              )}
                              
                              <Button 
                                size="sm" 
                                onClick={() => openDialog(video)} 
                                className="w-full text-xs sm:text-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="truncate">{texts.addFromVideo}</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {records.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noRecords}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {records.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                              {format(new Date(record.practice_date), "yyyy年MM月dd日")}
                            </p>
                            {record.technique && (
                              <h3 className="font-semibold text-base sm:text-lg break-words">{getTechniqueName(record.technique)}</h3>
                            )}
                            {record.user_video && (
                              <h3 className="font-semibold text-base sm:text-lg break-words">{record.user_video.title}</h3>
                            )}
                            {!record.technique && !record.user_video && (
                              <h3 className="font-semibold text-base sm:text-lg">{texts.other}</h3>
                            )}
                          </div>
                          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openDialog(undefined, record)} className="h-8 w-8 sm:h-10 sm:w-10">
                              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive h-8 w-8 sm:h-10 sm:w-10"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          {record.duration_minutes && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>
                                {record.duration_minutes} {language === "ja" ? "分" : "min"}
                              </span>
                            </div>
                          )}
                          {record.repetition_count && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">{texts.repetitions}: </span>
                              <span className="font-semibold">{record.repetition_count}{texts.reps}</span>
                            </div>
                          )}
                          {record.proficiency_level && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{texts.proficiency}</p>
                              {renderStars(record.proficiency_level)}
                            </div>
                          )}
                          {record.difficulty_rating && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{texts.difficulty}</p>
                              {renderStars(record.difficulty_rating)}
                            </div>
                          )}
                          {record.success_rating && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{texts.success}</p>
                              {renderStars(record.success_rating)}
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">{record.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {calculateTechniqueStats().length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noRecords}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {calculateTechniqueStats().map((stat) => {
                    const progressPercent = stat.latest_proficiency ? (stat.latest_proficiency / 5) * 100 : 0;
                    const level = getLevel(stat.total_sessions);
                    const nextMilestone = getNextMilestone(stat.total_sessions);
                    const milestoneProgress = (stat.total_sessions / 100) * 100;
                    const badges = getMilestoneBadges(stat.total_sessions);
                    const motivationMsg = getMotivationMessage(stat.total_sessions, nextMilestone);
                    
                    return (
                      <Card key={stat.technique_id} className="overflow-hidden hover-scale transition-all duration-300 hover:shadow-xl">
                        <div className={`h-2 bg-gradient-to-r ${level.color}`} />
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-base sm:text-lg break-words flex-1 line-clamp-2">{stat.technique_name}</h3>
                            <div className="flex-shrink-0 ml-2">
                              <div className={`text-2xl bg-gradient-to-br ${level.color} rounded-full w-10 h-10 flex items-center justify-center shadow-lg`}>
                                {level.emoji}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center mb-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                            <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-1">
                              {stat.total_sessions}
                            </div>
                            <div className="text-xs text-muted-foreground">{texts.totalSessions}</div>
                            <div className="text-sm font-semibold text-primary mt-1">{motivationMsg}</div>
                          </div>

                          <div className="relative mb-4">
                            <svg className="w-full h-3" viewBox="0 0 100 3">
                              <defs>
                                <linearGradient id={`gradient-${stat.technique_id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" className="text-primary" stopColor="currentColor" />
                                  <stop offset="100%" className="text-primary/60" stopColor="currentColor" />
                                </linearGradient>
                              </defs>
                              <rect width="100" height="3" rx="1.5" fill="hsl(var(--muted))" />
                              <rect 
                                width={Math.min(milestoneProgress, 100)} 
                                height="3" 
                                rx="1.5" 
                                fill={`url(#gradient-${stat.technique_id})`}
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <div className="absolute -top-1 left-0 w-full flex justify-between px-1">
                              {[10, 25, 50, 75, 100].map((milestone) => {
                                const isPassed = stat.total_sessions >= milestone;
                                return (
                                  <div 
                                    key={milestone}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                      isPassed 
                                        ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-110' 
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {isPassed ? '✓' : milestone}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {badges.length > 0 && (
                            <div className="flex gap-1 flex-wrap justify-center mb-3">
                              {badges.map((badge) => (
                                <div 
                                  key={badge.value}
                                  className={`${badge.color} text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 animate-scale-in shadow-md`}
                                >
                                  <span className="text-base">{badge.emoji}</span>
                                  <span className="font-bold">{badge.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground mb-1">{texts.totalReps}</p>
                              <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{stat.total_repetitions}</p>
                            </div>
                            {stat.latest_proficiency > 0 && (
                              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground mb-1">{texts.currentProficiency}</p>
                                <div className="flex justify-center">
                                  {renderStars(stat.latest_proficiency)}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                    <span className="text-base sm:text-lg">{texts.otherPracticeTab}</span>
                    <Button onClick={() => openDialog()} size="sm" className="w-full sm:w-auto">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">{texts.addRecord}</span>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {records.filter((r) => !r.technique_id && !r.user_video_id).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">{texts.noRecords}</p>
                    ) : (
                      records
                        .filter((r) => !r.technique_id && !r.user_video_id)
                        .map((record) => (
                          <Card key={record.id}>
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                    {format(new Date(record.practice_date), "yyyy年MM月dd日")}
                                  </p>
                                  <h3 className="font-semibold text-base sm:text-lg">{texts.other}</h3>
                                </div>
                                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                  <Button size="icon" variant="ghost" onClick={() => openDialog(undefined, record)} className="h-8 w-8 sm:h-10 sm:w-10">
                                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive h-8 w-8 sm:h-10 sm:w-10"
                                    onClick={() => handleDelete(record.id)}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                                {record.duration_minutes && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span>
                                      {record.duration_minutes} {language === "ja" ? "分" : "min"}
                                    </span>
                                  </div>
                                )}
                                {record.repetition_count && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">{texts.repetitions}: </span>
                                    <span className="font-semibold">{record.repetition_count}{texts.reps}</span>
                                  </div>
                                )}
                                {record.proficiency_level && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">{texts.proficiency}</p>
                                    {renderStars(record.proficiency_level)}
                                  </div>
                                )}
                                {record.difficulty_rating && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">{texts.difficulty}</p>
                                    {renderStars(record.difficulty_rating)}
                                  </div>
                                )}
                                {record.success_rating && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">{texts.success}</p>
                                    {renderStars(record.success_rating)}
                                  </div>
                                )}
                              </div>
                              {record.notes && (
                                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">{record.notes}</p>
                              )}
                            </CardContent>
                          </Card>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? texts.editRecord : texts.addRecord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVideo && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{getTechniqueName(selectedVideo.video)}</p>
                <p className="text-xs text-muted-foreground">{selectedVideo.video.category}</p>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">{texts.practiceDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.practice_date, "yyyy年MM月dd日")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.practice_date}
                    onSelect={(date) => date && setFormData({ ...formData, practice_date: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium">{texts.proficiency} *</Label>
              <Select
                value={formData.proficiency_level}
                onValueChange={(value) => setFormData({ ...formData, proficiency_level: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === "ja" ? "選択してください" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ - {language === "ja" ? "初級" : language === "pt" ? "Iniciante" : "Beginner"}</SelectItem>
                  <SelectItem value="2">⭐⭐ - {language === "ja" ? "初中級" : language === "pt" ? "Básico" : "Basic"}</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ - {language === "ja" ? "中級" : language === "pt" ? "Intermediário" : "Intermediate"}</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ - {language === "ja" ? "上級" : language === "pt" ? "Avançado" : "Advanced"}</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ - {language === "ja" ? "熟練" : language === "pt" ? "Especialista" : "Expert"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">{texts.repetitions}</Label>
              <Input
                type="number"
                placeholder="1"
                value={formData.repetition_count}
                onChange={(e) => setFormData({ ...formData, repetition_count: e.target.value })}
                min="1"
                max="999"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{texts.notes}</Label>
              <Textarea
                placeholder={language === "ja" ? "メモを入力..." : "Add notes..."}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                maxLength={500}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {texts.save}
              </Button>
              <Button onClick={closeDialog} variant="outline" className="flex-1">
                {texts.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PracticeRecordsPage;
