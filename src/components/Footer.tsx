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
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-light mb-4">
              <span className={theme === "dark" ? "text-white" : "text-foreground"}>
                jiuF<span className="text-red-500">l</span>ow
              </span>
            </h3>
            <p className="text-sm text-muted-foreground font-light">
              {t("home.hero.subtitle", "Learn Jiu-Jitsu Systematically.")}
            </p>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.home", "Home")}
                </Link>
              </li>
              <li>
                <Link to="/map" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.map", "Map")}
                </Link>
              </li>
              <li>
                <Link to="/dojos" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.dojos", "Dojos")}
                </Link>
              </li>
              <li>
                <Link to="/athletes" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.athletes", "選手")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.about", "About")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.contact", "Contact")}
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.join", "Join")}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Social</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://instagram.com/jiuFlowArt" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Instagram: @jiuFlowArt
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2025 jiuflow. All rights reserved.</p>
            
            <div className="flex items-center gap-2">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="gap-2"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-xs">
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
