import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Grid3X3,
  Users,
  Building2,
  CreditCard,
  ShieldCheck,
  Award,
  Mail,
  FileText,
  Gift,
  ChevronDown,
  Star,
  Calendar,
  Video,
  Settings,
  Music,
  ShoppingBag,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Trophy,
  ListVideo,
  Key,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "techniques", label: "テクニック管理", icon: Grid3X3 },
  { id: "video-lists", label: "動画リスト", icon: ListVideo },
  { id: "users", label: "会員管理", icon: Users },
  { id: "dojos", label: "道場管理", icon: Building2 },
  { id: "subscriptions", label: "サブスク管理", icon: CreditCard },
  { id: "plans", label: "プラン管理", icon: ShieldCheck },
  { id: "points", label: "ポイント管理", icon: Award },
  { id: "belts", label: "帯管理", icon: Award },
  { id: "celebrities", label: "有名選手", icon: Star },
  { id: "lineage", label: "系統管理", icon: Star },
  { id: "edit-requests", label: "編集リクエスト", icon: Star },
  { id: "celebrity", label: "有名人申請", icon: Star },
  { id: "tournaments", label: "大会管理", icon: Trophy },
  { id: "events", label: "イベント管理", icon: Calendar },
  { id: "user-videos", label: "ユーザー動画", icon: Video },
  { id: "brothers", label: "Brothers申請", icon: Award },
  { id: "printful", label: "商品管理", icon: ShoppingBag },
  { id: "contacts", label: "お問い合わせ", icon: Mail, showBadge: true },
  { id: "logs", label: "ログ", icon: FileText },
  { id: "tips", label: "投げ銭", icon: Gift },
  { id: "music", label: "音楽管理", icon: Music },
  { id: "community", label: "オープンマット", icon: MessageSquare },
  { id: "weekly-topics", label: "週間お題", icon: Trophy },
  { id: "api", label: "API管理", icon: Key },
  { id: "settings", label: "設定", icon: Settings },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadContactCount, setUnreadContactCount] = useState(0);
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread");

      if (!error && count !== null) {
        setUnreadContactCount(count);
      }
    };

    fetchUnreadCount();

    // Refresh every 5 minutes
    const interval = setInterval(fetchUnreadCount, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon" className="bg-background border-r">
      <div className="p-4 border-b flex items-center justify-between bg-background">
        {!isCollapsed && (
          <Link to="/admin/stats" className="text-xl font-light tracking-tight animate-fade-in hover:opacity-80 transition-opacity">
            JiuF<span className="text-red-500">l</span>ow
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="hover:bg-muted rounded p-1 transition-colors"
        >
          {isCollapsed ? (
            <PanelLeft className="h-5 w-5 text-foreground" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-foreground/70">
            <span>管理メニュー</span>
            {!isCollapsed && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:bg-muted rounded p-1"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform text-foreground ${isExpanded ? "" : "-rotate-90"}`}
                />
              </button>
            )}
          </SidebarGroupLabel>

          {isExpanded && (
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={`hover:bg-muted text-foreground ${
                        activeTab === item.id
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                          : "hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.showBadge && unreadContactCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadContactCount}
                            </Badge>
                          )}
                        </span>
                      )}
                      {isCollapsed && item.showBadge && unreadContactCount > 0 && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
