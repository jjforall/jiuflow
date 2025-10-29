import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/map", label: t.nav.map },
    { to: "/about", label: t.nav.about },
    { to: "/join", label: t.nav.join },
  ];

  const languages: Array<{ code: "ja" | "en" | "pt"; label: string }> = [
    { code: "ja", label: "日本語" },
    { code: "en", label: "EN" },
    { code: "pt", label: "PT" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-light tracking-tight">
            Brotherhood Jiu-Jitsu
          </Link>
          
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-light transition-smooth ${
                  location.pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="flex items-center gap-2 border-l border-border pl-6">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`text-xs font-light px-2 py-1 transition-smooth ${
                    language === lang.code
                      ? "text-foreground border-b border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
