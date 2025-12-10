import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Menu, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
import { CommunityManagement } from "@/components/admin/CommunityManagement";
import { WeeklyTopicsManagement } from "@/components/admin/WeeklyTopicsManagement";
import { TournamentsManagement } from "@/components/admin/TournamentsManagement";
import { VenuesManagement } from "@/components/admin/VenuesManagement";
import VideoListsManagement from "@/components/admin/VideoListsManagement";
import { ApiManagement } from "@/components/admin/ApiManagement";

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("techniques");

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full flex bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-4 md:px-6 justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 md:gap-4">
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
                  <div className="p-4 border-b">
                    <Link to="/admin/dashboard" className="flex items-center gap-2 text-foreground hover:text-primary">
                      <BarChart3 className="h-5 w-5" />
                      <span>統計ダッシュボード</span>
                    </Link>
                  </div>
                  <div className="p-3 border-b">
                    <p className="text-xs text-muted-foreground mb-2">管理メニュー</p>
                    <div className="space-y-1">
                      {[
                        { id: "techniques", label: "テクニック管理" },
                        { id: "video-lists", label: "動画リスト" },
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
                        { id: "tournaments", label: "大会管理" },
                        { id: "venues", label: "施設管理" },
                        { id: "events", label: "イベント管理" },
                        { id: "user-videos", label: "ユーザー動画" },
                        { id: "brothers", label: "Brothers申請" },
                        { id: "printful", label: "商品管理" },
                        { id: "contacts", label: "お問い合わせ" },
                        { id: "logs", label: "ログ" },
                        { id: "tips", label: "投げ銭" },
                        { id: "music", label: "音楽管理" },
                        { id: "community", label: "オープンマット" },
                        { id: "weekly-topics", label: "週間お題" },
                        { id: "api", label: "API管理" },
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
              <h1 className="text-lg md:text-2xl font-light">管理画面</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/dashboard" className="hidden md:flex">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  統計
                </Button>
              </Link>
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
              <div className="space-y-6">
                {activeTab === "techniques" && <TechniquesManagement />}
                {activeTab === "video-lists" && <VideoListsManagement />}
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
                {activeTab === "tournaments" && <TournamentsManagement />}
                {activeTab === "venues" && <VenuesManagement />}
                {activeTab === "events" && <EventsManagement />}
                {activeTab === "user-videos" && <UserVideosManagement />}
                {activeTab === "brothers" && <BrothersApplicationsManagement />}
                {activeTab === "printful" && <PrintfulManagement />}
                {activeTab === "contacts" && <ContactsManagement />}
                {activeTab === "logs" && <LogsTab />}
                {activeTab === "tips" && <TipsManagement />}
                {activeTab === "music" && <MusicManagement />}
                {activeTab === "community" && <CommunityManagement />}
                {activeTab === "weekly-topics" && <WeeklyTopicsManagement />}
                {activeTab === "api" && <ApiManagement />}
                {activeTab === "settings" && <SettingsManagement />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;