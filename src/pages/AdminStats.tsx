import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, DollarSign, UserCheck, Home, Eye, EyeOff, ChevronDown, Play, TrendingUp, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface TopVideo {
  id: string;
  name: string;
  name_ja: string;
  category: string;
  thumbnail_url: string | null;
  total_views: number;
}

interface TopViewer {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_views: number;
  videos_watched: number;
}

const AdminStats = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    paidMembers: 0,
    trialMembers: 0,
    monthlyRevenue: 0,
    trialRevenue: 0,
    loading: true,
  });
  const [showMembersChart, setShowMembersChart] = useState(false);
  const [chartData, setChartData] = useState<Array<{date: string; totalMembers: number; paidMembers: number; trialMembers: number}>>([]);
  const [hideNumbers, setHideNumbers] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  const [videoStatsOpen, setVideoStatsOpen] = useState(true);
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [topViewers, setTopViewers] = useState<TopViewer[]>([]);
  const [videoStatsLoading, setVideoStatsLoading] = useState(true);
  const [viewersLimit, setViewersLimit] = useState(10);

  useEffect(() => {
    fetchStats();
    fetchVideoStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: totalMembers, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) throw profilesError;

      const { data: subscriptionsData, error: subsError } = await supabase.functions.invoke("list-subscriptions");

      if (subsError) throw subsError;

      const subscriptions = subscriptionsData?.subscriptions || [];
      const activeSubscriptions = subscriptions.filter((sub: any) => 
        sub.status === 'active' && !sub.is_trialing
      );
      const trialSubscriptions = subscriptions.filter((sub: any) => 
        sub.is_trialing
      );
      
      const monthlyRevenue = activeSubscriptions.reduce((total: number, sub: any) => {
        if (sub.interval === 'month') {
          return total + sub.amount;
        }
        return total;
      }, 0);

      const trialRevenue = trialSubscriptions.reduce((total: number, sub: any) => {
        if (sub.interval === 'month') {
          return total + sub.amount;
        }
        return total;
      }, 0);

      setStats({
        totalMembers: totalMembers || 0,
        paidMembers: activeSubscriptions.length,
        trialMembers: trialSubscriptions.length,
        monthlyRevenue,
        trialRevenue,
        loading: false,
      });
    } catch (error) {
      console.error('統計情報の取得エラー:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchVideoStats = async () => {
    try {
      setVideoStatsLoading(true);
      
      // Calculate start of this week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Fetch video views from this week only
      const { data: videoViews, error: viewsError } = await supabase
        .from('video_views')
        .select('video_id, view_count, user_id, last_viewed_at')
        .gte('last_viewed_at', startOfWeek.toISOString());

      if (viewsError) throw viewsError;

      // Get all techniques
      const { data: techniques, error: techError } = await supabase
        .from('techniques')
        .select('id, name, name_ja, category, thumbnail_url');

      if (techError) throw techError;

      // Get all profiles for viewers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url');

      if (profilesError) throw profilesError;

      // Calculate top videos
      const videoViewCounts = new Map<string, number>();
      videoViews?.forEach(view => {
        const current = videoViewCounts.get(view.video_id) || 0;
        videoViewCounts.set(view.video_id, current + view.view_count);
      });

      const topVideosData: TopVideo[] = [];
      videoViewCounts.forEach((totalViews, videoId) => {
        const technique = techniques?.find(t => t.id === videoId);
        if (technique) {
          topVideosData.push({
            id: videoId,
            name: technique.name,
            name_ja: technique.name_ja,
            category: technique.category,
            thumbnail_url: technique.thumbnail_url,
            total_views: totalViews,
          });
        }
      });

      topVideosData.sort((a, b) => b.total_views - a.total_views);
      setTopVideos(topVideosData.slice(0, 10));

      // Calculate top viewers
      const viewerStats = new Map<string, { total_views: number; videos_watched: Set<string> }>();
      videoViews?.forEach(view => {
        const current = viewerStats.get(view.user_id) || { total_views: 0, videos_watched: new Set() };
        current.total_views += view.view_count;
        current.videos_watched.add(view.video_id);
        viewerStats.set(view.user_id, current);
      });

      const topViewersData: TopViewer[] = [];
      viewerStats.forEach((stats, userId) => {
        const profile = profiles?.find(p => p.id === userId);
        topViewersData.push({
          user_id: userId,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          total_views: stats.total_views,
          videos_watched: stats.videos_watched.size,
        });
      });

      topViewersData.sort((a, b) => b.total_views - a.total_views);
      setTopViewers(topViewersData);

      setVideoStatsLoading(false);
    } catch (error) {
      console.error('動画統計の取得エラー:', error);
      setVideoStatsLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      const { data: subscriptionsData, error: subsError } = await supabase.functions.invoke("list-subscriptions");
      if (subsError) throw subsError;

      const subscriptions = subscriptionsData?.subscriptions || [];

      const dateMap = new Map<string, { total: number; paid: number; trial: number }>();
      
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, { total: 0, paid: 0, trial: 0 });
      }

      profiles?.forEach(profile => {
        const createdDate = new Date(profile.created_at);
        dateMap.forEach((value, dateStr) => {
          const targetDate = new Date(dateStr);
          targetDate.setHours(23, 59, 59, 999); // End of day
          if (createdDate <= targetDate) {
            value.total++;
          }
        });
      });

      subscriptions.forEach((sub: any) => {
        if (sub.created) {
          const createdDate = new Date(sub.created);
          const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
          
          dateMap.forEach((value, dateStr) => {
            const targetDate = new Date(dateStr);
            targetDate.setHours(23, 59, 59, 999); // End of day
            
            // Only count if subscription was created on or before target date
            if (createdDate <= targetDate) {
              // Check if subscription was in trial on the target date
              const wasInTrial = trialEnd && targetDate < trialEnd;
              
              if (wasInTrial) {
                value.trial++;
              } else if (sub.status === 'active' || sub.status === 'trialing') {
                // Subscription exists and trial has ended (or no trial) = paid
                value.paid++;
              }
            }
          });
        }
      });

      const chartArray = Array.from(dateMap.entries()).map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
        totalMembers: counts.total,
        paidMembers: counts.paid,
        trialMembers: counts.trial,
      }));

      setChartData(chartArray);
    } catch (error) {
      console.error('グラフデータ取得エラー:', error);
      toast.error('グラフデータの取得に失敗しました');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleMembersCardClick = async () => {
    setShowMembersChart(true);
    if (chartData.length === 0) {
      await fetchChartData();
    }
  };

  const handleTabChange = (tab: string) => {
    setMobileMenuOpen(false);
    navigate('/admin/techniques');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: tab }));
    }, 100);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full flex bg-background">
        <AdminSidebar activeTab="dashboard" onTabChange={handleTabChange} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center px-4 md:px-6 justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              {/* モバイルメニュー */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <AdminSidebar activeTab="dashboard" onTabChange={handleTabChange} embedded />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg md:text-2xl font-light">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  ホーム
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </header>

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 会員統計 */}
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <div className="flex items-center justify-between mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${statsOpen ? '' : '-rotate-90'}`} />
                  統計情報
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHideNumbers(!hideNumbers)}
                className="text-muted-foreground"
              >
                {hideNumbers ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {hideNumbers ? "表示" : "非表示"}
              </Button>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={handleMembersCardClick}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">総会員数</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.loading ? "..." : hideNumbers ? "***" : stats.totalMembers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">登録ユーザー総数（クリックでグラフ表示）</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">有料会員数</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.loading ? "..." : hideNumbers ? "***" : stats.paidMembers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">アクティブなサブスク</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={handleMembersCardClick}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">トライアル会員数</CardTitle>
                    <UserCheck className="h-4 w-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.loading ? "..." : hideNumbers ? "***" : stats.trialMembers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">無料トライアル中（クリックでグラフ表示）</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">月次収入（実際）</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.loading ? "..." : hideNumbers ? "¥***" : `¥${stats.monthlyRevenue.toLocaleString()}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">有料会員の月額合計</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">月次収入（トライアル）</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.loading ? "..." : hideNumbers ? "¥***" : `¥${stats.trialRevenue.toLocaleString()}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">トライアル終了後の見込み</p>
                  </CardContent>
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 動画統計 */}
          <Collapsible open={videoStatsOpen} onOpenChange={setVideoStatsOpen}>
            <div className="flex items-center justify-between mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${videoStatsOpen ? '' : '-rotate-90'}`} />
                  動画視聴統計（今週）
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 人気動画ランキング */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      人気動画 TOP 10
                    </CardTitle>
                    <Badge variant="secondary">{topVideos.length} 動画</Badge>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      {videoStatsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-12 w-20 rounded" />
                              <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                              <Skeleton className="h-6 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : topVideos.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">視聴データがありません</p>
                      ) : (
                        <div className="space-y-3">
                          {topVideos.map((video, index) => (
                            <div 
                              key={video.id} 
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                                index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                                index === 1 ? 'bg-gray-300/30 text-gray-600' :
                                index === 2 ? 'bg-amber-600/20 text-amber-700' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              {video.thumbnail_url ? (
                                <img 
                                  src={video.thumbnail_url} 
                                  alt={video.name_ja}
                                  className="w-20 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                                  <Play className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{video.name_ja}</p>
                                <p className="text-xs text-muted-foreground">{video.category}</p>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {hideNumbers ? "***" : video.total_views.toLocaleString()} 回
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* アクティブ視聴者ランキング */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      アクティブ視聴者 TOP {viewersLimit}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <select 
                        value={viewersLimit} 
                        onChange={(e) => setViewersLimit(Number(e.target.value))}
                        className="text-xs border rounded px-2 py-1 bg-background"
                      >
                        <option value={10}>10件</option>
                        <option value={20}>20件</option>
                        <option value={50}>50件</option>
                        <option value={100}>100件</option>
                      </select>
                      <Badge variant="secondary">{Math.min(topViewers.length, viewersLimit)} / {topViewers.length} ユーザー</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      {videoStatsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                              </div>
                              <Skeleton className="h-6 w-20" />
                            </div>
                          ))}
                        </div>
                      ) : topViewers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">視聴データがありません</p>
                      ) : (
                        <div className="space-y-3">
                          {topViewers.slice(0, viewersLimit).map((viewer, index) => (
                            <div 
                              key={viewer.user_id} 
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                                index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                                index === 1 ? 'bg-gray-300/30 text-gray-600' :
                                index === 2 ? 'bg-amber-600/20 text-amber-700' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={viewer.avatar_url || undefined} />
                                <AvatarFallback>
                                  {viewer.display_name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {hideNumbers ? "***" : (viewer.display_name || 'Unknown')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {hideNumbers ? "***" : `${viewer.videos_watched} 動画視聴`}
                                </p>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {hideNumbers ? "***" : viewer.total_views.toLocaleString()} 回
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* 視聴数棒グラフ */}
              {!videoStatsLoading && topVideos.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base font-medium">人気動画の視聴回数比較</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={topVideos.slice(0, 5).map(v => ({
                            name: v.name_ja.length > 10 ? v.name_ja.slice(0, 10) + '...' : v.name_ja,
                            views: hideNumbers ? 0 : v.total_views,
                          }))}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
          </main>

          <Dialog open={showMembersChart} onOpenChange={setShowMembersChart}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>会員数の推移（過去30日間）</DialogTitle>
              </DialogHeader>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalMembers" 
                      stroke="hsl(var(--primary))" 
                      name="総会員数"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="paidMembers" 
                      stroke="hsl(var(--chart-2))" 
                      name="有料会員数"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="trialMembers" 
                      stroke="#22c55e"
                      name="トライアル会員数"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminStats;
