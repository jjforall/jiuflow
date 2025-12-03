import { useState } from "react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "techniques", label: "テクニック管理", icon: Grid3X3 },
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
  { id: "events", label: "イベント管理", icon: Calendar },
  { id: "user-videos", label: "ユーザー動画", icon: Video },
  { id: "brothers", label: "Brothers申請", icon: Award },
  { id: "printful", label: "商品管理", icon: ShoppingBag },
  { id: "contacts", label: "お問い合わせ", icon: Mail },
  { id: "logs", label: "ログ", icon: FileText },
  { id: "tips", label: "投げ銭", icon: Gift },
  { id: "music", label: "音楽管理", icon: Music },
  { id: "settings", label: "設定", icon: Settings },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(true);
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-background border-r">
      <div className="p-4 border-b flex items-center justify-end bg-background">
        <SidebarTrigger />
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
                      {!isCollapsed && <span>{item.label}</span>}
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
