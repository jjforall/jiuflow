import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Footer = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

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
    <footer className="border-t border-border bg-background pb-20">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Main Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8">
          {/* Brand - Full width on mobile */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1 mb-4 lg:mb-0">
            <h3 className="font-light mb-3 text-lg">
              <span className={theme === "dark" ? "text-white" : "text-foreground"}>
                jiuF<span className="text-red-500">l</span>ow
              </span>
            </h3>
            <p className="text-sm text-muted-foreground font-light max-w-[200px]">
              {t("home.hero.subtitle", "Learn Jiu-Jitsu Systematically.")}
            </p>
          </div>
          
          {/* Navigation 1 */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">
              {language === "ja" ? "ナビゲーション" : language === "pt" ? "Navegação" : "Navigation"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "ホーム" : language === "pt" ? "Início" : "Home"}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "私たちについて" : language === "pt" ? "Sobre Nós" : "About"}
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "料金" : language === "pt" ? "Planos" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link to="/map" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "マップ" : language === "pt" ? "Mapa" : "Map"}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation 2 */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">
              {language === "ja" ? "コンテンツ" : language === "pt" ? "Conteúdo" : "Content"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/map" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "教則動画" : language === "pt" ? "Vídeos" : "Videos"}
                </Link>
              </li>
              <li>
                <Link to="/dojos" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "道場" : language === "pt" ? "Academias" : "Dojos"}
                </Link>
              </li>
              <li>
                <Link to="/athletes" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "選手" : language === "pt" ? "Atletas" : "Athletes"}
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "大会" : language === "pt" ? "Torneios" : "Tournaments"}
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "ショップ" : language === "pt" ? "Loja" : "Shop"}
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">
              {language === "ja" ? "法的情報" : language === "pt" ? "Legal" : "Legal"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "プライバシー" : language === "pt" ? "Privacidade" : "Privacy"}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === "ja" ? "利用規約" : language === "pt" ? "Termos" : "Terms"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">
              {language === "ja" ? "ソーシャル" : language === "pt" ? "Social" : "Social"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://instagram.com/jiuFlowArt" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
              &copy; 2025 jiuf<span className="text-red-500">l</span>ow. All rights reserved.
            </p>
            
            <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 gap-1 sm:gap-2">
                    <span className="text-base">{languages.find(l => l.code === language)?.label}</span>
                    <span className="text-xs hidden sm:inline">{languages.find(l => l.code === language)?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-[300px] overflow-y-auto">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 px-2 sm:px-3 gap-1 sm:gap-2"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-xs hidden sm:inline">
                  {theme === "dark" 
                    ? (language === "ja" ? "白帯" : language === "pt" ? "Faixa Branca" : "White Belt")
                    : (language === "ja" ? "黒帯" : language === "pt" ? "Faixa Preta" : "Black Belt")
                  }
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
