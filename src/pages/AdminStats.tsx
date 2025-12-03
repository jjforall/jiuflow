import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, DollarSign, UserCheck, Home, Grid3X3, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AdminStats = () => {
  const { signOut } = useAuth();
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

  useEffect(() => {
    fetchStats();
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
          if (createdDate <= targetDate) {
            value.total++;
          }
        });
      });

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
    <div className="min-h-screen w-full bg-background">
      <header className="h-16 border-b flex items-center px-4 md:px-6 justify-between sticky top-0 bg-background z-10">
        <h1 className="text-lg md:text-2xl font-light">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link to="/admin/techniques">
            <Button variant="ghost" size="sm">
              <Grid3X3 className="h-4 w-4 mr-2" />
              管理
            </Button>
          </Link>
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
        <div className="max-w-7xl mx-auto">
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen} className="mb-8">
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
                  stroke="hsl(var(--secondary))" 
                  name="トライアル会員数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStats;
