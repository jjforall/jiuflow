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
import { CalendarIcon, Edit2, Trash2, Clock, Star } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const PracticeRecordsPage = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null);
  const [formData, setFormData] = useState({
    practice_date: new Date(),
    proficiency_level: "1",
    repetition_count: "30",
    notes: "",
  });

  const t = {
    ja: {
      title: "練習記録",
      allRecordsTab: "すべての記録",
      noRecords: "練習記録がありません",
      editRecord: "記録を編集",
      practiceDate: "練習日",
      difficulty: "難易度",
      success: "達成度",
      proficiency: "熟練度",
      repetitions: "練習回数",
      notes: "メモ",
      save: "保存",
      cancel: "キャンセル",
      deleteConfirm: "この記録を削除しますか？",
      other: "その他",
      reps: "回",
    },
    en: {
      title: "Practice Records",
      allRecordsTab: "All Records",
      noRecords: "No practice records",
      editRecord: "Edit Record",
      practiceDate: "Practice Date",
      difficulty: "Difficulty",
      success: "Success Rate",
      proficiency: "Proficiency Level",
      repetitions: "Repetitions",
      notes: "Notes",
      save: "Save",
      cancel: "Cancel",
      deleteConfirm: "Delete this record?",
      other: "Other",
      reps: "reps",
    },
    pt: {
      title: "Registros de Prática",
      allRecordsTab: "Todos os Registros",
      noRecords: "Nenhum registro de prática",
      editRecord: "Editar Registro",
      practiceDate: "Data da Prática",
      difficulty: "Dificuldade",
      success: "Taxa de Sucesso",
      proficiency: "Nível de Proficiência",
      repetitions: "Repetições",
      notes: "Notas",
      save: "Salvar",
      cancel: "Cancelar",
      deleteConfirm: "Excluir este registro?",
      other: "Outro",
      reps: "reps",
    },
  };

  const texts = t[language as keyof typeof t] || t.ja;

  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await loadRecords();
    } finally {
      setLoading(false);
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

  const openDialog = (record?: PracticeRecord) => {
    setEditingRecord(record || null);
    setFormData({
      practice_date: record ? new Date(record.practice_date) : new Date(),
      proficiency_level: record?.proficiency_level?.toString() || "1",
      repetition_count: record?.repetition_count?.toString() || "30",
      notes: record?.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      practice_date: new Date(),
      proficiency_level: "1",
      repetition_count: "30",
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
        technique_id: editingRecord?.technique_id || null,
        user_video_id: null,
        practice_date: format(formData.practice_date, "yyyy-MM-dd"),
        duration_minutes: null,
        difficulty_rating: null,
        success_rating: null,
        proficiency_level: parseInt(formData.proficiency_level),
        repetition_count: formData.repetition_count ? parseInt(formData.repetition_count) : 0,
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
            className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  // グラフデータを生成する関数
  const getChartData = () => {
    const now = new Date();
    let intervals: Date[] = [];
    let formatString = "";

    if (chartPeriod === "day") {
      const start = subDays(now, 30);
      intervals = eachDayOfInterval({ start, end: now });
      formatString = "MM/dd";
    } else if (chartPeriod === "week") {
      const start = subWeeks(now, 12);
      intervals = eachWeekOfInterval({ start, end: now });
      formatString = "MM/dd";
    } else {
      const start = subMonths(now, 12);
      intervals = eachMonthOfInterval({ start, end: now });
      formatString = "yyyy/MM";
    }

    return intervals.map(date => {
      let start: Date, end: Date;
      
      if (chartPeriod === "day") {
        start = startOfDay(date);
        end = endOfDay(date);
      } else if (chartPeriod === "week") {
        start = startOfWeek(date);
        end = endOfWeek(date);
      } else {
        start = startOfMonth(date);
        end = endOfMonth(date);
      }

      const periodRecords = records.filter(record => {
        const recordDate = new Date(record.practice_date);
        return recordDate >= start && recordDate <= end;
      });

      const totalSessions = periodRecords.length;
      const totalReps = periodRecords.reduce((sum, r) => sum + (r.repetition_count || 0), 0);

      return {
        date: format(date, formatString),
        sessions: totalSessions,
        reps: totalReps,
      };
    });
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
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          <div className="mb-4 sm:mb-8">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">{texts.title}</h1>
          </div>

          <Tabs defaultValue="all" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 p-1.5 bg-muted/50 rounded-lg">
              <TabsTrigger 
                value="all" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {texts.allRecordsTab}
              </TabsTrigger>
              <TabsTrigger 
                value="chart" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                グラフ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {records.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noRecords}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  {records.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-2 sm:p-4">
                        <div className="flex justify-between items-start gap-1 sm:gap-2 mb-2 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                              {format(new Date(record.practice_date), "yyyy年MM月dd日")}
                            </p>
                            {record.technique && (
                              <Link to={`/video/${record.technique_id}`} className="group">
                                <h3 className="font-semibold text-sm sm:text-lg break-words group-hover:text-primary transition-colors">
                                  {getTechniqueName(record.technique)}
                                </h3>
                              </Link>
                            )}
                            {record.user_video && (
                              <h3 className="font-semibold text-sm sm:text-lg break-words">{record.user_video.title}</h3>
                            )}
                            {!record.technique && !record.user_video && (
                              <h3 className="font-semibold text-sm sm:text-lg">{texts.other}</h3>
                            )}
                          </div>
                          <div className="flex gap-0.5 sm:gap-2 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openDialog(record)} className="h-7 w-7 sm:h-10 sm:w-10">
                              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive h-7 w-7 sm:h-10 sm:w-10"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                          {record.duration_minutes && (
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span>
                                {record.duration_minutes} {language === "ja" ? "分" : "min"}
                              </span>
                            </div>
                          )}
                          {typeof record.repetition_count === 'number' && (
                            <div className="text-xs sm:text-sm">
                              <span className="text-muted-foreground">{texts.repetitions}: </span>
                              <span className="font-semibold">{record.repetition_count}{texts.reps}</span>
                            </div>
                          )}
                          {record.proficiency_level && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{texts.proficiency}</p>
                              {renderStars(record.proficiency_level)}
                            </div>
                          )}
                          {record.difficulty_rating && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{texts.difficulty}</p>
                              {renderStars(record.difficulty_rating)}
                            </div>
                          )}
                          {record.success_rating && (
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{texts.success}</p>
                              {renderStars(record.success_rating)}
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">{record.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <CardTitle className="text-base sm:text-xl">練習推移グラフ</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={chartPeriod === "day" ? "default" : "outline"}
                        onClick={() => setChartPeriod("day")}
                        className="text-xs"
                      >
                        日別
                      </Button>
                      <Button
                        size="sm"
                        variant={chartPeriod === "week" ? "default" : "outline"}
                        onClick={() => setChartPeriod("week")}
                        className="text-xs"
                      >
                        週別
                      </Button>
                      <Button
                        size="sm"
                        variant={chartPeriod === "month" ? "default" : "outline"}
                        onClick={() => setChartPeriod("month")}
                        className="text-xs"
                      >
                        月別
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  {records.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      練習記録がありません
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium mb-3">練習回数（セッション数）</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="sessions" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              name="練習回数"
                              dot={{ fill: 'hsl(var(--primary))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-3">累計練習回数（レップス）</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="reps" 
                              fill="hsl(var(--primary))"
                              name="累計回数"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{texts.editRecord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-xs sm:text-sm font-medium">{texts.practiceDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 text-xs sm:text-sm h-9 sm:h-10">
                    <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {format(formData.practice_date, "yyyy年MM月dd日")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.practice_date}
                    onSelect={(date) => date && setFormData({ ...formData, practice_date: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium">{texts.proficiency} *</Label>
              <Select
                value={formData.proficiency_level}
                onValueChange={(value) => setFormData({ ...formData, proficiency_level: value })}
              >
                <SelectTrigger className="mt-1 text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder={language === "ja" ? "選択してください" : "Select"} />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="1" className="text-xs sm:text-sm">⭐ - {language === "ja" ? "初級" : language === "pt" ? "Iniciante" : "Beginner"}</SelectItem>
                  <SelectItem value="2" className="text-xs sm:text-sm">⭐⭐ - {language === "ja" ? "初中級" : language === "pt" ? "Básico" : "Basic"}</SelectItem>
                  <SelectItem value="3" className="text-xs sm:text-sm">⭐⭐⭐ - {language === "ja" ? "中級" : language === "pt" ? "Intermediário" : "Intermediate"}</SelectItem>
                  <SelectItem value="4" className="text-xs sm:text-sm">⭐⭐⭐⭐ - {language === "ja" ? "上級" : language === "pt" ? "Avançado" : "Advanced"}</SelectItem>
                  <SelectItem value="5" className="text-xs sm:text-sm">⭐⭐⭐⭐⭐ - {language === "ja" ? "熟練" : language === "pt" ? "Especialista" : "Expert"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium">{texts.repetitions}</Label>
              <Input
                type="number"
                placeholder="30"
                value={formData.repetition_count}
                onChange={(e) => setFormData({ ...formData, repetition_count: e.target.value })}
                min="0"
                max="999"
                className="mt-1 text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium">{texts.notes}</Label>
              <Textarea
                placeholder={language === "ja" ? "メモを入力..." : "Add notes..."}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                maxLength={500}
                className="mt-1 text-xs sm:text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1 sm:pt-2">
              <Button onClick={handleSubmit} className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
                {texts.save}
              </Button>
              <Button onClick={closeDialog} variant="outline" className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
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
