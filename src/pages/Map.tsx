import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission" | "guard-pass";
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number;
}

const Map = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const navigate = useNavigate();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin } = useAuth();
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadTechniques = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login page if not authenticated
        navigate("/login", { 
          state: { from: { pathname: "/map" } },
          replace: true 
        });
        return;
      }

      setIsCheckingAuth(false);
      loadTechniques();
    };

    checkAuthAndLoadTechniques();
  }, [navigate]);

  const loadTechniques = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Error loading techniques", {
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    setTechniques((data as Technique[]) || []);
    setIsLoading(false);
  };

  const getTechniqueName = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.name_ja;
      case "pt":
        return tech.name_pt;
      default:
        return tech.name;
    }
  };

  const getTechniqueDescription = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.description_ja;
      case "pt":
        return tech.description_pt;
      default:
        return tech.description;
    }
  };

  const categoryColors = {
    pull: "border-secondary",
    "guard-pass": "border-primary",
    control: "border-accent",
    submission: "border-foreground",
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-20 animate-fade-up">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-light mb-4 md:mb-6">{t.map.title}</h1>
            <p className="text-base md:text-xl text-muted-foreground font-light">
              {t.map.subtitle}
            </p>
          </div>

          {isCheckingAuth || isLoading || subscriptionLoading ? (
            <div className="animate-fade-in space-y-8">
              <div className="space-y-4">
                <div className="h-12 w-1/3 bg-muted/50 animate-pulse rounded" />
                <div className="h-6 w-1/2 bg-muted/50 animate-pulse rounded" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-48 w-full bg-muted/50 animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
                    <div className="h-4 w-1/2 bg-muted/50 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : !subscribed && !isAdmin ? (
            <div className="text-center py-12 animate-fade-up">
              <div className="max-w-md mx-auto bg-muted/50 border border-border p-8 rounded-lg">
                <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-light mb-4">
                  {language === "ja" 
                    ? "プレミアムコンテンツ" 
                    : language === "pt" 
                    ? "Conteúdo Premium" 
                    : "Premium Content"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {language === "ja" 
                    ? "このコンテンツを閲覧するには、サブスクリプションへの登録が必要です。" 
                    : language === "pt" 
                    ? "Para visualizar este conteúdo, você precisa de uma assinatura ativa." 
                    : "To view this content, you need an active subscription."}
                </p>
                <Button 
                  onClick={() => navigate("/join")}
                  size="lg"
                  className="w-full"
                >
                  {language === "ja" 
                    ? "プランを見る" 
                    : language === "pt" 
                    ? "Ver Planos" 
                    : "View Plans"}
                </Button>
              </div>
            </div>
          ) : techniques.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{language === "ja" ? "テクニックがまだ追加されていません" : language === "pt" ? "Nenhuma técnica adicionada ainda" : "No techniques added yet"}</p>
            </div>
          ) : (
            <div className="animate-fade-up">

              {/* Techniques Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
                {["pull", "guard-pass", "control", "submission"].map((category) => (
                  <div key={category} className="space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg font-light border-b border-border pb-2">
                      {t.map[category as keyof typeof t.map] as string}
                    </h3>
                    {techniques
                      .filter((tech) => tech.category === category)
                      .map((tech) => (
                        <Link
                          key={tech.id}
                          to={`/video/${tech.id}`}
                          className={`block w-full text-left border ${
                            categoryColors[category as keyof typeof categoryColors]
                          } transition-smooth hover:bg-muted overflow-hidden`}
                        >
                          <div className="aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
                            {tech.thumbnail_url ? (
                              <img 
                                src={tech.thumbnail_url} 
                                alt={getTechniqueName(tech)}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="text-muted-foreground text-4xl">▶</div>';
                                }}
                              />
                            ) : (
                              <div className="text-muted-foreground text-4xl">▶</div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="font-light text-sm md:text-base">{getTechniqueName(tech)}</div>
                          </div>
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Map;
