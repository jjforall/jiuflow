import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission";
  video_url: string | null;
  display_order: number;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin } = useAuth();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadTechnique = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login page if not authenticated
        navigate("/login", { 
          state: { from: { pathname: `/video/${id}` } },
          replace: true 
        });
        return;
      }

      setIsCheckingAuth(false);
      
      if (id) {
        loadTechnique();
      }
    };

    checkAuthAndLoadTechnique();
  }, [id, navigate]);

  const loadTechnique = async () => {
    if (!id) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast.error("Error loading technique", {
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    setTechnique(data as Technique);
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

  if (isCheckingAuth || isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-32 pb-20 px-6 animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!subscribed && !isAdmin) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-32 pb-20 px-6">
          <div className="max-w-md mx-auto text-center animate-fade-up">
            <div className="bg-muted/50 border border-border p-8 rounded-lg">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-light mb-4">
                {language === "ja" 
                  ? "プレミアムコンテンツ" 
                  : language === "pt" 
                  ? "Conteúdo Premium" 
                  : "Premium Content"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {language === "ja" 
                  ? "この動画を視聴するには、サブスクリプションへの登録が必要です。" 
                  : language === "pt" 
                  ? "Para assistir este vídeo, você precisa de uma assinatura ativa." 
                  : "To watch this video, you need an active subscription."}
              </p>
              <div className="space-y-3">
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
                <Button 
                  variant="outline"
                  onClick={() => navigate("/map")}
                  className="w-full"
                >
                  {t.video.backToMap}
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!technique) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-32 text-center">
          <h1 className="text-4xl font-light mb-4">{t.video.notFound}</h1>
          <Link to="/map">
            <Button variant="outline">{t.video.backToMap}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-20">
        {/* Video Player */}
        <div className="w-full bg-muted">
          <div className="max-w-6xl mx-auto">
            {technique.video_url ? (
              <VideoPlayer videoUrl={technique.video_url} autoPlay />
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">▶</div>
                  <div className="text-sm">
                    {language === "ja" ? "動画なし" : language === "pt" ? "Sem vídeo" : "No video"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technique Info */}
        <div className="max-w-4xl mx-auto px-6 mt-12">
          <div className="mb-8 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-light mb-2">{getTechniqueName(technique)}</h1>
            <span className="inline-block px-3 py-1 text-xs border border-border">
              {technique.category}
            </span>
          </div>

          {getTechniqueDescription(technique) && (
            <div className="mb-12 animate-fade-up">
              <p className="text-lg font-light text-muted-foreground leading-relaxed">
                {getTechniqueDescription(technique)}
              </p>
            </div>
          )}

          <div className="mt-12 text-center">
            <Link to="/map">
              <Button variant="outline" size="lg">
                {t.video.backToMap}
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Video;
