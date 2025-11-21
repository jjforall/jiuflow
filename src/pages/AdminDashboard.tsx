import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShieldCheck, Grid3X3, DollarSign, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Import tab components
import { TechniquesManagement } from "@/components/admin/TechniquesManagement";
import { UsersTab } from "@/components/admin/UsersTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    paidMembers: 0,
    monthlyRevenue: 0,
    loading: true,
  });

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
      const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
      
      // 月次収入を計算（月額プランのみ）
      const monthlyRevenue = activeSubscriptions.reduce((total: number, sub: any) => {
        if (sub.interval === 'month') {
          return total + sub.amount;
        }
        return total;
      }, 0);

      setStats({
        totalMembers: totalMembers || 0,
        paidMembers: activeSubscriptions.length,
        monthlyRevenue,
        loading: false,
      });
    } catch (error) {
      console.error('統計情報の取得エラー:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-light">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総会員数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.loading ? "..." : stats.totalMembers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">登録ユーザー総数</p>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">月次収入</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.loading ? "..." : `¥${stats.monthlyRevenue.toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">月額プランの合計</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="techniques" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="techniques" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                テクニック管理
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                会員管理
              </TabsTrigger>
              <TabsTrigger value="subscriptions">
                サブスク管理
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                プラン管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="techniques" className="space-y-6">
              <TechniquesManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UsersTab />
            </TabsContent>

            <TabsContent value="subscriptions">
              <SubscriptionsTab />
            </TabsContent>

            <TabsContent value="plans" className="space-y-6">
              <PlansTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;