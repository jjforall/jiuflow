import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { prefetchRoute } from "@/utils/routePrefetch";
import { Button } from "@/components/ui/button";
import { Menu, LogIn, User, LogOut, ShieldCheck, Moon, Sun, Home, Map, Info, UserPlus, Mail, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { Separator } from "@/components/ui/separator";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const { subscribed } = useSubscription();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setCanAccessAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "staff"]);

    if (error) {
      console.error("Error checking admin/staff status:", error);
      setCanAccessAdmin(false);
      return;
    }
    setCanAccessAdmin(!!data && data.length > 0);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== "Session not found") {
        toast.error(t.nav.logoutError || "ログアウトに失敗しました");
        return;
      }
      toast.success(t.nav.logoutSuccess || "ログアウトしました");
      navigate("/");
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(t.nav.logoutError || "ログアウトに失敗しました");
    }
  };

  const links = [
    { to: "/", label: t.nav.home, icon: Home },
    { to: "/map", label: t.nav.map, icon: Map },
    { to: "/about", label: t.nav.about, icon: Info },
    ...(!subscribed ? [{ to: "/join", label: t.nav.join, icon: UserPlus }] : []),
    { to: "/contact", label: t.nav.contact, icon: Mail },
  ];

  const languages: Array<{ code: "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi"; label: string; name: string }> = [
    { code: "ja", label: "🇯🇵", name: "日本語" },
    { code: "en", label: "🇺🇸", name: "English" },
    { code: "pt", label: "🇧🇷", name: "Português" },
    { code: "es", label: "🇪🇸", name: "Español" },
    { code: "fr", label: "🇫🇷", name: "Français" },
    { code: "de", label: "🇩🇪", name: "Deutsch" },
    { code: "zh", label: "🇨🇳", name: "中文" },
    { code: "ko", label: "🇰🇷", name: "한국어" },
    { code: "it", label: "🇮🇹", name: "Italiano" },
    { code: "ru", label: "🇷🇺", name: "Русский" },
    { code: "ar", label: "🇸🇦", name: "العربية" },
    { code: "hi", label: "🇮🇳", name: "हिन्दी" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-light tracking-tight">
            <span className={theme === "dark" ? "filter invert" : ""}>JiuFlow</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-light transition-smooth ${
                  location.pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onMouseEnter={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
              >
                {link.label}
              </Link>
            ))}
            
            <span className="text-muted-foreground">|</span>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {t.nav.myPage || (language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/mypage")} className="gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    {t.nav.myPage || (language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page")}
                  </DropdownMenuItem>
                  {canAccessAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="gap-2 cursor-pointer">
                      <ShieldCheck className="h-4 w-4" />
                      {t.nav.adminDashboard || (language === "ja" ? "管理画面" : language === "pt" ? "Painel de Administração" : "Admin Dashboard")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    {t.nav.logout || (language === "ja" ? "ログアウト" : language === "pt" ? "Sair" : "Logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  {t.nav.login}
                </Button>
              </Link>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-2"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-xs hidden lg:inline">
                {theme === "dark" 
                  ? (language === "ja" ? "白帯" : language === "pt" ? "Faixa Branca" : "White Belt")
                  : (language === "ja" ? "黒帯" : language === "pt" ? "Faixa Preta" : "Black Belt")
                }
              </span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {languages.find(l => l.code === language)?.label}
                  <span className="text-xs">{languages.find(l => l.code === language)?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`cursor-pointer gap-2 ${language === lang.code ? 'bg-muted' : ''}`}
                  >
                    <span>{lang.label}</span>
                    <span className="text-sm">{lang.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Language Switcher + Hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 px-2">
                  {languages.find(l => l.code === language)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`cursor-pointer gap-2 ${language === lang.code ? 'bg-muted' : ''}`}
                  >
                    <span>{lang.label}</span>
                    <span className="text-sm">{lang.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          {/* Mobile Hamburger Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative hover:bg-primary/10 transition-all"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[85vw] max-w-[400px] p-0 flex flex-col"
            >
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-2xl font-light">Menu</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <div className="space-y-2">
                  {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.to;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        onTouchStart={() => prefetchRoute(link.to)}
                        className={`
                          flex items-center gap-4 px-4 py-3.5 rounded-lg
                          transition-all duration-200 group
                          ${isActive 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-muted/50 active:bg-muted"
                          }
                        `}
                      >
                        <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                          isActive ? "" : "text-muted-foreground"
                        }`} />
                        <span className={`text-base font-medium ${
                          isActive ? "" : "text-foreground"
                        }`}>
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <Separator className="my-6" />
                
                <div className="space-y-2">
                  {user ? (
                    <>
                      <Link to="/mypage" onClick={() => setIsOpen(false)}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:bg-muted"
                        >
                          <User className="h-5 w-5" />
                          <span className="text-base">
                            {t.nav.myPage || (language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page")}
                          </span>
                        </Button>
                      </Link>
                      {canAccessAdmin && (
                        <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:bg-muted"
                          >
                            <ShieldCheck className="h-5 w-5" />
                            <span className="text-base">
                              {t.nav.adminDashboard || (language === "ja" ? "管理画面" : language === "pt" ? "Painel de Administração" : "Admin Dashboard")}
                            </span>
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-base">
                          {t.nav.logout || (language === "ja" ? "ログアウト" : language === "pt" ? "Sair" : "Logout")}
                        </span>
                      </Button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button 
                        variant="default" 
                        className="w-full justify-start gap-3 h-12"
                      >
                        <LogIn className="h-5 w-5" />
                        <span className="text-base">{t.nav.login}</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
