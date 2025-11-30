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
  { id: "celebrity", label: "有名人申請", icon: Star },
  { id: "contacts", label: "お問い合わせ", icon: Mail },
  { id: "logs", label: "ログ", icon: FileText },
  { id: "tips", label: "投げ銭", icon: Gift },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(true);
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b">
        <SidebarTrigger className="ml-auto" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>管理メニュー</span>
            {!isCollapsed && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:bg-muted/50 rounded p-1"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
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
                      className={`hover:bg-muted/50 ${
                        activeTab === item.id
                          ? "bg-muted text-primary font-medium"
                          : ""
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
