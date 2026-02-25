import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { prefetchRoute } from "@/utils/routePrefetch";
import { Button } from "@/components/ui/button";
import { Menu, LogIn, User, LogOut, ShieldCheck, Moon, Sun, Home, Map, Info, UserPlus, ClipboardList, Users, Bell, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, isAdmin, isStaff, signOut } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const [showOpenMatBadge, setShowOpenMatBadge] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false); // Will be true when there are actual notifications

  const canAccessAdmin = isAdmin || isStaff;

  // Check if user has seen the Open Mat notification
  useEffect(() => {
    const hasSeenOpenMat = localStorage.getItem('hasSeenOpenMatNotification');
    if (!hasSeenOpenMat) {
      setShowOpenMatBadge(true);
    }
  }, []);

  const handleOpenMatClick = useCallback(() => {
    localStorage.setItem('hasSeenOpenMatNotification', 'true');
    setShowOpenMatBadge(false);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(t.nav.logoutError || "ログアウトに失敗しました");
    }
  };

  const links = [
    { to: "/", label: t.nav.home, icon: Home },
    { to: "/curriculum", label: language === 'ja' ? 'カリキュラム' : language === 'pt' ? 'Curriculo' : 'Curriculum', icon: ClipboardList },
    { to: "/map", label: t.nav.map, icon: Map },
    { to: "/about", label: t.nav.about, icon: Info },
    // Only show Join link when subscription check is complete and user is not subscribed
    ...(!subscriptionLoading && !subscribed ? [{ to: "/join", label: t.nav.join, icon: UserPlus }] : []),
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-light tracking-tight">
            <span className={theme === "dark" ? "text-white" : "text-foreground"}>
              JiuF<span className="text-red-500">l</span>ow
            </span>
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
              <>
                {/* Notification Bell Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => {
                    // TODO: Navigate to notifications page or open notifications dropdown
                    setHasUnreadNotifications(false);
                    toast.info(language === "ja" ? "通知はありません" : language === "pt" ? "Sem notificações" : "No notifications");
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {hasUnreadNotifications && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </Button>
                
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
                <DropdownMenuItem onClick={() => navigate("/practice-records")} className="gap-2 cursor-pointer">
                  <ClipboardList className="h-4 w-4" />
                  {language === "ja" ? "練習記録" : language === "pt" ? "Registros de Prática" : "Practice Records"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigate("/open-mat"); handleOpenMatClick(); }} className="gap-2 cursor-pointer relative">
                  <Users className="h-4 w-4" />
                  {language === "ja" ? "オープンマット" : language === "pt" ? "Open Mat" : "Open Mat"}
                  {showOpenMatBadge && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/tournaments")} className="gap-2 cursor-pointer">
                  <Trophy className="h-4 w-4" />
                  {language === "ja" ? "大会一覧" : language === "pt" ? "Torneios" : "Tournaments"}
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
              </>
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
            {/* Mobile Notification Bell - only when logged in */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  setHasUnreadNotifications(false);
                  toast.info(language === "ja" ? "通知はありません" : language === "pt" ? "Sem notificações" : "No notifications");
                }}
              >
                <Bell className="h-5 w-5" />
                {hasUnreadNotifications && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Button>
            )}

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
              className="w-[85vw] max-w-[400px] p-0 flex flex-col data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right"
            >
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-2xl font-light">Menu</SheetTitle>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <div className="space-y-2">
                  {links.map((link, index) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.to;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => setIsOpen(false), 100);
                        }}
                        onTouchStart={() => prefetchRoute(link.to)}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={`
                          flex items-center gap-4 px-4 py-3.5 rounded-lg
                          transition-all duration-150 ease-out group animate-fade-in
                          active:scale-95 active:opacity-70
                          ${isActive 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-muted/50 active:bg-muted"
                          }
                        `}
                      >
                        <Icon className={`h-5 w-5 transition-transform duration-150 group-active:scale-90 ${
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
                      <Link 
                        to="/mypage" 
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => setIsOpen(false), 100);
                        }}
                      >
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:scale-95 active:opacity-70 transition-all duration-150"
                        >
                          <User className="h-5 w-5" />
                          <span className="text-base">
                            {t.nav.myPage || (language === "ja" ? "マイページ" : language === "pt" ? "Minha Página" : "My Page")}
                          </span>
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:scale-95 active:opacity-70 transition-all duration-150"
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => {
                            navigate("/practice-records");
                            setIsOpen(false);
                          }, 100);
                        }}
                      >
                        <ClipboardList className="h-5 w-5" />
                        <span className="text-base">
                          {language === "ja" ? "練習記録" : language === "pt" ? "Registros de Prática" : "Practice Records"}
                        </span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:scale-95 active:opacity-70 transition-all duration-150 relative"
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => {
                            navigate("/open-mat");
                            handleOpenMatClick();
                            setIsOpen(false);
                          }, 100);
                        }}
                      >
                        <Users className="h-5 w-5" />
                        <span className="text-base">
                          {language === "ja" ? "オープンマット" : language === "pt" ? "Open Mat" : "Open Mat"}
                        </span>
                        {showOpenMatBadge && (
                          <span className="absolute top-2 left-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:scale-95 active:opacity-70 transition-all duration-150"
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => {
                            navigate("/tournaments");
                            setIsOpen(false);
                          }, 100);
                        }}
                      >
                        <Trophy className="h-5 w-5" />
                        <span className="text-base">
                          {language === "ja" ? "大会一覧" : language === "pt" ? "Torneios" : "Tournaments"}
                        </span>
                      </Button>
                      {canAccessAdmin && (
                        <Link 
                          to="/admin/dashboard" 
                          onClick={(e) => {
                            e.currentTarget.classList.add('scale-95', 'opacity-70');
                            setTimeout(() => setIsOpen(false), 100);
                          }}
                        >
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 h-12 hover:bg-muted/50 active:scale-95 active:opacity-70 transition-all duration-150"
                          >
                            <ShieldCheck className="h-5 w-5" />
                            <span className="text-base">
                              {t.nav.adminDashboard || (language === "ja" ? "管理画面" : language === "pt" ? "Painel de Administração" : "Admin Dashboard")}
                            </span>
                          </Button>
                        </Link>
                      )}
                      
                      <Separator className="my-4" />
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 hover:bg-destructive/10 text-destructive active:scale-95 active:opacity-70 transition-all duration-150"
                        onClick={(e) => {
                          e.currentTarget.classList.add('scale-95', 'opacity-70');
                          setTimeout(() => {
                            handleLogout();
                            setIsOpen(false);
                          }, 100);
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-base">
                          {t.nav.logout || (language === "ja" ? "ログアウト" : language === "pt" ? "Sair" : "Logout")}
                        </span>
                      </Button>
                    </>
                  ) : (
                    <Link 
                      to="/login" 
                      onClick={(e) => {
                        e.currentTarget.classList.add('scale-95', 'opacity-70');
                        setTimeout(() => setIsOpen(false), 100);
                      }}
                    >
                      <Button 
                        variant="default" 
                        className="w-full justify-start gap-3 h-12 active:scale-95 active:opacity-70 transition-all duration-150"
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
