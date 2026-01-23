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
  ChevronRight,
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
  MapPin,
  UserCheck,
  Layers,
  KeyRound,
  Store,
  Wrench,
  Megaphone,
  MessageCircle,
  Languages,
  FileText as FileTextIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    id: "content",
    label: "コンテンツ",
    icon: Layers,
    items: [
      { id: "techniques", label: "テクニック管理", icon: Grid3X3 },
      { id: "video-management", label: "動画管理", icon: ListVideo },
      { id: "user-videos", label: "ユーザー動画", icon: Video },
    ],
  },
  {
    id: "users",
    label: "ユーザー",
    icon: Users,
    items: [
      { id: "users", label: "会員管理", icon: Users },
      { id: "subscriptions", label: "サブスク管理", icon: CreditCard },
      { id: "plans", label: "プラン管理", icon: ShieldCheck },
      { id: "points", label: "ポイント管理", icon: Award },
      { id: "belts", label: "帯管理", icon: Award },
    ],
  },
  {
    id: "dojos-athletes",
    label: "道場・選手",
    icon: Building2,
    items: [
      { id: "dojos", label: "道場管理", icon: Building2 },
      { id: "celebrities", label: "有名選手", icon: Star },
      { id: "lineage", label: "系統管理", icon: Star },
    ],
  },
  {
    id: "events",
    label: "大会・イベント",
    icon: Trophy,
    items: [
      { id: "tournaments", label: "大会管理", icon: Trophy },
      { id: "venues", label: "施設管理", icon: MapPin },
      { id: "events", label: "イベント管理", icon: Calendar },
    ],
  },
  {
    id: "community",
    label: "コミュニティ",
    icon: MessageSquare,
    items: [
      { id: "community", label: "オープンマット", icon: MessageSquare },
      { id: "weekly-topics", label: "週間お題", icon: Trophy },
    ],
  },
  {
    id: "applications",
    label: "申請管理",
    icon: UserCheck,
    items: [
      { id: "edit-requests", label: "編集リクエスト", icon: Star },
      { id: "celebrity", label: "有名人申請", icon: Star },
      { id: "brothers", label: "Brothers申請", icon: Award },
    ],
  },
  {
    id: "shop",
    label: "ショップ",
    icon: Store,
    items: [
      { id: "printful", label: "商品管理", icon: ShoppingBag },
      { id: "tips", label: "投げ銭", icon: Gift },
    ],
  },
  {
    id: "marketing",
    label: "マーケティング",
    icon: Megaphone,
    items: [
      { id: "ads", label: "広告管理", icon: Megaphone },
    ],
  },
  {
    id: "system",
    label: "システム",
    icon: Wrench,
    items: [
      { id: "contacts", label: "お問い合わせ", icon: Mail, showBadge: true },
      { id: "logs", label: "ログ", icon: FileText },
      { id: "api", label: "API管理", icon: Key },
      { id: "oauth-clients", label: "OAuthクライアント", icon: KeyRound },
      { id: "line", label: "LINE連携", icon: MessageCircle },
      { id: "mcp-chat", label: "MCP チャット", icon: MessageSquare },
      { id: "music", label: "音楽管理", icon: Music },
      { id: "settings", label: "設定", icon: Settings },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Initially expand the group containing the active tab
    const activeGroup = menuGroups.find(g => g.items.some(i => i.id === activeTab));
    return activeGroup ? [activeGroup.id] : ["content"];
  });
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
    const interval = setInterval(fetchUnreadCount, 300000);
    return () => clearInterval(interval);
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    // Expand the group containing the selected tab
    const group = menuGroups.find(g => g.items.some(i => i.id === tabId));
    if (group && !expandedGroups.includes(group.id)) {
      setExpandedGroups(prev => [...prev, group.id]);
    }
  };

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
          <SidebarMenu>
            {menuGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              const hasActiveItem = group.items.some(item => item.id === activeTab);
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="mb-1">
                  {/* Group Header */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => !isCollapsed && toggleGroup(group.id)}
                      className={cn(
                        "hover:bg-muted text-foreground font-medium",
                        hasActiveItem && "text-primary"
                      )}
                    >
                      <GroupIcon className="h-4 w-4" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{group.label}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Group Items */}
                  {!isCollapsed && isExpanded && (
                    <SidebarGroupContent className="ml-2 border-l border-border/50 pl-2">
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <SidebarMenuItem key={item.id}>
                              <SidebarMenuButton
                                onClick={() => handleTabChange(item.id)}
                                className={cn(
                                  "hover:bg-muted text-foreground text-sm py-1.5",
                                  activeTab === item.id
                                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[9px] pl-[7px]"
                                    : "hover:text-foreground"
                                )}
                              >
                                <ItemIcon className="h-3.5 w-3.5" />
                                <span className="flex items-center gap-2">
                                  {item.label}
                                  {item.showBadge && unreadContactCount > 0 && (
                                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                      {unreadContactCount}
                                    </Badge>
                                  )}
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}

                  {/* Collapsed mode: show items directly */}
                  {isCollapsed && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <SidebarMenuItem key={item.id}>
                              <SidebarMenuButton
                                onClick={() => handleTabChange(item.id)}
                                className={cn(
                                  "hover:bg-muted text-foreground relative",
                                  activeTab === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "hover:text-foreground"
                                )}
                                title={item.label}
                              >
                                <ItemIcon className="h-4 w-4" />
                                {item.showBadge && unreadContactCount > 0 && (
                                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </div>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
