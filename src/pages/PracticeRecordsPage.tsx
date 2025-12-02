import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Eye, Repeat, Play, Clock, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

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
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("week");

  const t = {
    ja: {
      title: "練習記録",
      recentTab: "最近見た",
      unwatchedTab: "未視聴",
      reviewTab: "復習タイミング",
      chartTab: "グラフ",
      noVideos: "動画がありません",
      noReviewNeeded: "復習が必要な動画はありません",
      views: "回視聴",
      practices: "回練習",
      urgent: "今すぐ復習",
      soon: "もうすぐ",
      ok: "定着中",
      daysAgo: "日前",
    },
    en: {
      title: "Practice Records",
      recentTab: "Recent",
      unwatchedTab: "Unwatched",
      reviewTab: "Review Timing",
      chartTab: "Graph",
      noVideos: "No videos",
      noReviewNeeded: "No videos need review",
      views: "views",
      practices: "practices",
      urgent: "Review Now",
      soon: "Soon",
      ok: "Retaining",
      daysAgo: "days ago",
    },
    pt: {
      title: "Registros de Prática",
      recentTab: "Recentes",
      unwatchedTab: "Não Assistidos",
      reviewTab: "Revisão",
      chartTab: "Gráfico",
      noVideos: "Nenhum vídeo",
      noReviewNeeded: "Nenhum vídeo precisa de revisão",
      views: "visualizações",
      practices: "práticas",
      urgent: "Revisar Agora",
      soon: "Em Breve",
      ok: "Retendo",
      daysAgo: "dias atrás",
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
        supabase.from("techniques").select("id, name, name_ja, name_pt, category, thumbnail_url, series_name, series_prefix, series_order"),
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
    // series_prefix + series_order (B1-3など) を優先表示
    if (technique.series_prefix && technique.series_order) {
      return `${technique.series_prefix}-${technique.series_order}`;
    }
    return technique.series_prefix || technique.series_name || technique.category;
  };

  const getViewCount = (techniqueId: string) => {
    const view = videoViews.find(v => v.video_id === techniqueId);
    return view?.view_count || 0;
  };

  const getPracticeCount = (techniqueId: string) => {
    return practiceRecords.filter(r => r.technique_id === techniqueId).reduce((sum, r) => sum + (r.repetition_count || 1), 0);
  };

  // 最近見た動画（視聴履歴がある）
  const recentVideos = techniques
    .filter(t => videoViews.some(v => v.video_id === t.id))
    .sort((a, b) => {
      const viewA = videoViews.find(v => v.video_id === a.id);
      const viewB = videoViews.find(v => v.video_id === b.id);
      return new Date(viewB?.last_viewed_at || 0).getTime() - new Date(viewA?.last_viewed_at || 0).getTime();
    });

  // 未視聴の動画（視聴履歴がない）
  const unwatchedVideos = techniques.filter(t => !videoViews.some(v => v.video_id === t.id));

  // 忘却曲線に基づく復習タイミング計算
  // エビングハウスの忘却曲線: 1日後, 3日後, 7日後, 14日後, 30日後に復習
  type ReviewStatus = "urgent" | "soon" | "ok";
  
  const getReviewStatus = (lastViewedAt: string): { status: ReviewStatus; daysAgo: number } => {
    const daysAgo = differenceInDays(new Date(), new Date(lastViewedAt));
    
    // 復習間隔: 1, 3, 7, 14, 30日
    // 次の復習ポイントを過ぎたらurgent、近づいたらsoon
    if (daysAgo >= 7) return { status: "urgent", daysAgo };
    if (daysAgo >= 3) return { status: "soon", daysAgo };
    return { status: "ok", daysAgo };
  };

  // 復習が必要な動画（視聴済みで復習タイミングに達している）
  const reviewVideos = recentVideos
    .map(technique => {
      const view = videoViews.find(v => v.video_id === technique.id);
      const reviewInfo = view ? getReviewStatus(view.last_viewed_at) : null;
      return { technique, reviewInfo };
    })
    .filter(item => item.reviewInfo && item.reviewInfo.status !== "ok")
    .sort((a, b) => {
      // urgent を先に、次に soon、日数が多い順
      if (a.reviewInfo!.status === "urgent" && b.reviewInfo!.status !== "urgent") return -1;
      if (a.reviewInfo!.status !== "urgent" && b.reviewInfo!.status === "urgent") return 1;
      return b.reviewInfo!.daysAgo - a.reviewInfo!.daysAgo;
    });

  // グラフデータ
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

      const periodRecords = practiceRecords.filter(record => {
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

  const VideoCard = ({ technique }: { technique: Technique }) => {
    const viewCount = getViewCount(technique.id);
    const practiceCount = getPracticeCount(technique.id);
    const seriesLabel = getSeriesLabel(technique);

    return (
      <Link to={`/video/${technique.id}`} className="group">
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
          <div className="relative aspect-video bg-muted">
            {technique.thumbnail_url ? (
              <img
                src={technique.thumbnail_url}
                alt={getTechniqueName(technique)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            {/* シリーズラベル */}
            <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium">
              {seriesLabel}
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {getTechniqueName(technique)}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{viewCount}{texts.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                <span>{practiceCount}{texts.practices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const ReviewVideoCard = ({ technique, reviewInfo }: { technique: Technique; reviewInfo: { status: ReviewStatus; daysAgo: number } }) => {
    const viewCount = getViewCount(technique.id);
    const practiceCount = getPracticeCount(technique.id);
    const seriesLabel = getSeriesLabel(technique);

    const statusConfig = {
      urgent: {
        icon: AlertCircle,
        bg: "bg-red-500/90",
        text: texts.urgent,
        border: "ring-2 ring-red-500/50",
      },
      soon: {
        icon: AlertTriangle,
        bg: "bg-yellow-500/90",
        text: texts.soon,
        border: "ring-2 ring-yellow-500/50",
      },
      ok: {
        icon: CheckCircle,
        bg: "bg-green-500/90",
        text: texts.ok,
        border: "",
      },
    };

    const config = statusConfig[reviewInfo.status];
    const StatusIcon = config.icon;

    return (
      <Link to={`/video/${technique.id}`} className="group">
        <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 h-full ${config.border}`}>
          <div className="relative aspect-video bg-muted">
            {technique.thumbnail_url ? (
              <img
                src={technique.thumbnail_url}
                alt={getTechniqueName(technique)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            {/* シリーズラベル */}
            <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium">
              {seriesLabel}
            </div>
            {/* 復習ステータスバッジ */}
            <div className={`absolute top-2 left-2 ${config.bg} text-white text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {reviewInfo.daysAgo}{texts.daysAgo}
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {getTechniqueName(technique)}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{viewCount}{texts.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                <span>{practiceCount}{texts.practices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
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
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold mb-2">{texts.title}</h1>
          </div>

          <Tabs defaultValue="review" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-4 gap-1 p-1.5 bg-muted/50 rounded-lg">
              <TabsTrigger 
                value="review" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {texts.reviewTab}
              </TabsTrigger>
              <TabsTrigger 
                value="recent" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {texts.recentTab}
              </TabsTrigger>
              <TabsTrigger 
                value="unwatched" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {texts.unwatchedTab}
              </TabsTrigger>
              <TabsTrigger 
                value="chart" 
                className="text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {texts.chartTab}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="space-y-4">
              {reviewVideos.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    {texts.noReviewNeeded}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {reviewVideos.map(({ technique, reviewInfo }) => (
                    <ReviewVideoCard key={technique.id} technique={technique} reviewInfo={reviewInfo!} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              {recentVideos.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noVideos}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {recentVideos.map((technique) => (
                    <VideoCard key={technique.id} technique={technique} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unwatched" className="space-y-4">
              {unwatchedVideos.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {texts.noVideos}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {unwatchedVideos.map((technique) => (
                    <VideoCard key={technique.id} technique={technique} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <CardTitle className="text-base sm:text-xl">
                      {language === "ja" ? "練習推移グラフ" : language === "pt" ? "Gráfico de Progresso" : "Progress Graph"}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={chartPeriod === "day" ? "default" : "outline"}
                        onClick={() => setChartPeriod("day")}
                        className="text-xs"
                      >
                        {language === "ja" ? "日別" : language === "pt" ? "Diário" : "Daily"}
                      </Button>
                      <Button
                        size="sm"
                        variant={chartPeriod === "week" ? "default" : "outline"}
                        onClick={() => setChartPeriod("week")}
                        className="text-xs"
                      >
                        {language === "ja" ? "週別" : language === "pt" ? "Semanal" : "Weekly"}
                      </Button>
                      <Button
                        size="sm"
                        variant={chartPeriod === "month" ? "default" : "outline"}
                        onClick={() => setChartPeriod("month")}
                        className="text-xs"
                      >
                        {language === "ja" ? "月別" : language === "pt" ? "Mensal" : "Monthly"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  {practiceRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {language === "ja" ? "練習記録がありません" : language === "pt" ? "Nenhum registro" : "No records"}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium mb-3">
                          {language === "ja" ? "練習回数（セッション数）" : language === "pt" ? "Sessões de Prática" : "Practice Sessions"}
                        </h3>
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
                              name={language === "ja" ? "練習回数" : language === "pt" ? "Sessões" : "Sessions"}
                              dot={{ fill: 'hsl(var(--primary))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-3">
                          {language === "ja" ? "累計練習回数（レップス）" : language === "pt" ? "Total de Repetições" : "Total Reps"}
                        </h3>
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
                              name={language === "ja" ? "累計回数" : language === "pt" ? "Repetições" : "Reps"}
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
      <Footer />
    </div>
  );
};

export default PracticeRecordsPage;
