import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Users, DollarSign, UserCheck, Home, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// Import tab components
import { TechniquesManagement } from "@/components/admin/TechniquesManagement";
import { UsersTab } from "@/components/admin/UsersTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { PointsManagement } from "@/components/admin/PointsManagement";
import { BeltsManagement } from "@/components/admin/BeltsManagement";
import DojosManagement from "@/components/admin/DojosManagement";
import { LogsTab } from "@/components/admin/LogsTab";
import { TipsManagement } from "@/components/admin/TipsManagement";
import { ContactsManagement } from "@/components/admin/ContactsManagement";
import { CelebrityApplicationsManagement } from "@/components/admin/CelebrityApplicationsManagement";
import { CelebritiesManagement } from "@/components/admin/CelebritiesManagement";
import { LineageManagement } from "@/components/admin/LineageManagement";
import { CelebrityEditRequestsManagement } from "@/components/admin/CelebrityEditRequestsManagement";
import { EventsManagement } from "@/components/admin/EventsManagement";
import { UserVideosManagement } from "@/components/admin/UserVideosManagement";
import { BrothersApplicationsManagement } from "@/components/admin/BrothersApplicationsManagement";
import { SettingsManagement } from "@/components/admin/SettingsManagement";
import MusicManagement from "@/components/admin/MusicManagement";
import { PrintfulManagement } from "@/components/admin/PrintfulManagement";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("techniques");
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 総会員数を取得
      const { count: totalMembers, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) throw profilesError;

      // サブスクリプション情報を取得
      const { data: subscriptionsData, error: subsError } = await supabase.functions.invoke("list-subscriptions");

      if (subsError) throw subsError;

      const subscriptions = subscriptionsData?.subscriptions || [];
      const activeSubscriptions = subscriptions.filter((sub: any) => 
        sub.status === 'active' && !sub.is_trialing
      );
      const trialSubscriptions = subscriptions.filter((sub: any) => 
        sub.is_trialing
      );
      
      // アクティブな月次収入を計算（月額プランのみ）
      const monthlyRevenue = activeSubscriptions.reduce((total: number, sub: any) => {
        if (sub.interval === 'month') {
          return total + sub.amount;
        }
        return total;
      }, 0);

      // トライアル中の月次収入を計算（月額プランのみ）
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

  const fetchChartData = async () => {
    try {
      // 全プロフィールを取得（作成日付順）
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // サブスクリプション情報を取得
      const { data: subscriptionsData, error: subsError } = await supabase.functions.invoke("list-subscriptions");
      if (subsError) throw subsError;

      const subscriptions = subscriptionsData?.subscriptions || [];

      // 日付ごとにデータを集計
      const dateMap = new Map<string, { total: number; paid: number; trial: number }>();
      
      // 過去30日分のデータを準備
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, { total: 0, paid: 0, trial: 0 });
      }

      // 各日付までの累計会員数を計算
      profiles?.forEach(profile => {
        const createdDate = new Date(profile.created_at);
        dateMap.forEach((value, dateStr) => {
          const targetDate = new Date(dateStr);
          if (createdDate <= targetDate) {
            value.total++;
          }
        });
      });

      // 各日付までの累計有料会員数とトライアル会員数を計算
      subscriptions.forEach((sub: any) => {
        if (sub.created_at) {
          const createdDate = new Date(sub.created_at);
          dateMap.forEach((value, dateStr) => {
            const targetDate = new Date(dateStr);
            if (createdDate <= targetDate) {
              if (sub.status === 'active' && !sub.is_trialing) {
                value.paid++;
              } else if (sub.is_trialing) {
                value.trial++;
              }
            }
          });
        }
      });

      // グラフ用のデータに変換
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

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full flex bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-4 md:px-6 justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="hidden md:flex" />
              {/* Mobile Navigation Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-background overflow-y-auto">
                  <div className="p-4 border-b">
                    <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary">
                      <Home className="h-5 w-5" />
                      <span>ホームに戻る</span>
                    </Link>
                  </div>
                  <div className="p-3 border-b">
                    <p className="text-xs text-muted-foreground mb-2">管理メニュー</p>
                    <div className="space-y-1">
                      {[
                        { id: "techniques", label: "テクニック管理" },
                        { id: "users", label: "会員管理" },
                        { id: "dojos", label: "道場管理" },
                        { id: "subscriptions", label: "サブスク管理" },
                        { id: "plans", label: "プラン管理" },
                        { id: "points", label: "ポイント管理" },
                        { id: "belts", label: "帯管理" },
                        { id: "celebrities", label: "有名選手" },
                        { id: "lineage", label: "系統管理" },
                        { id: "edit-requests", label: "編集リクエスト" },
                        { id: "celebrity", label: "有名人申請" },
                        { id: "events", label: "イベント管理" },
                        { id: "user-videos", label: "ユーザー動画" },
                        { id: "brothers", label: "Brothers申請" },
                        { id: "printful", label: "商品管理" },
                        { id: "contacts", label: "お問い合わせ" },
                        { id: "logs", label: "ログ" },
                        { id: "tips", label: "投げ銭" },
                        { id: "music", label: "音楽管理" },
                        { id: "settings", label: "設定" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full text-left px-3 py-2 rounded text-sm ${
                            activeTab === item.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <Button variant="outline" onClick={handleLogout} className="w-full">
                      ログアウト
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg md:text-2xl font-light">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="hidden md:flex">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  ホーム
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout} className="hidden md:flex">
                Logout
              </Button>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 overflow-auto">
            <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                  {stats.loading ? "..." : stats.totalMembers.toLocaleString()}
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
                  {stats.loading ? "..." : stats.paidMembers.toLocaleString()}
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
                  {stats.loading ? "..." : stats.trialMembers.toLocaleString()}
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
                  {stats.loading ? "..." : `¥${stats.monthlyRevenue.toLocaleString()}`}
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
                  {stats.loading ? "..." : `¥${stats.trialRevenue.toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">トライアル終了後の見込み</p>
              </CardContent>
            </Card>
          </div>

              <div className="space-y-6">
                {activeTab === "techniques" && <TechniquesManagement />}
                {activeTab === "users" && <UsersTab />}
                {activeTab === "dojos" && <DojosManagement />}
                {activeTab === "subscriptions" && <SubscriptionsTab />}
                {activeTab === "plans" && <PlansTab />}
                {activeTab === "points" && <PointsManagement />}
                {activeTab === "belts" && <BeltsManagement />}
                {activeTab === "celebrities" && <CelebritiesManagement />}
                {activeTab === "lineage" && <LineageManagement />}
                {activeTab === "edit-requests" && <CelebrityEditRequestsManagement />}
                {activeTab === "celebrity" && <CelebrityApplicationsManagement />}
                {activeTab === "events" && <EventsManagement />}
                {activeTab === "user-videos" && <UserVideosManagement />}
                {activeTab === "brothers" && <BrothersApplicationsManagement />}
                {activeTab === "printful" && <PrintfulManagement />}
                {activeTab === "contacts" && <ContactsManagement />}
                {activeTab === "logs" && <LogsTab />}
                {activeTab === "tips" && <TipsManagement />}
                {activeTab === "music" && <MusicManagement />}
                {activeTab === "settings" && <SettingsManagement />}
              </div>
            </div>
          </main>
        </div>
      </div>

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
                  stroke="hsl(var(--secondary))" 
                  name="トライアル会員数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminDashboard;