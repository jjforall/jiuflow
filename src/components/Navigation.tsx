import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { prefetchRoute } from "@/utils/routePrefetch";
import { Button } from "@/components/ui/button";
import { Menu, LogIn, User, LogOut, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);

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
    { to: "/", label: t.nav.home },
    { to: "/map", label: t.nav.map },
    { to: "/about", label: t.nav.about },
    { to: "/join", label: t.nav.join },
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
            jiuflow
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
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-6 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={`text-lg font-light transition-smooth ${
                      location.pathname === link.to
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onTouchStart={() => prefetchRoute(link.to)}
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className="border-t border-border pt-6 space-y-3">
                  {user ? (
                    <>
                      <Link to="/mypage" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full gap-2">
                          <User className="h-4 w-4" />
                          {t.nav.myPage || (language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page")}
                        </Button>
                      </Link>
                      {canAccessAdmin && (
                        <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                          <Button variant="outline" className="w-full gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            {t.nav.adminDashboard || (language === "ja" ? "管理画面" : language === "pt" ? "Painel de Administração" : "Admin Dashboard")}
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        {t.nav.logout || (language === "ja" ? "ログアウト" : language === "pt" ? "Sair" : "Logout")}
                      </Button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full gap-2">
                        <LogIn className="h-4 w-4" />
                        {t.nav.login}
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
