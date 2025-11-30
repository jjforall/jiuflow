import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Users, DollarSign, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full flex bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6 justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-light">Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </header>

          <main className="flex-1 px-6 py-8 overflow-auto">
            <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                <CardTitle className="text-sm font-medium">トライアル会員数</CardTitle>
                <UserCheck className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.loading ? "..." : stats.trialMembers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">無料トライアル中</p>
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
                {activeTab === "contacts" && <ContactsManagement />}
                {activeTab === "logs" && <LogsTab />}
                {activeTab === "tips" && <TipsManagement />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;