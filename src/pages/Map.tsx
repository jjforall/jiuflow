import { useState, useEffect, useRef, useCallback } from "react";
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
import { Lock, Loader2, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";

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
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;


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

  const categoryLabels: Record<string, { en: string; ja: string; pt: string }> = {
    pull: { en: "Pull", ja: "引き込み", pt: "Puxada" },
    "guard-pass": { en: "Guard Pass", ja: "ガードパス", pt: "Passagem de Guarda" },
    control: { en: "Control", ja: "コントロール", pt: "Controle" },
    submission: { en: "Submission", ja: "極め技", pt: "Finalização" },
  };

  const getCategoryLabel = (category: string) => {
    const labels = categoryLabels[category];
    if (!labels) return category;
    
    switch (language) {
      case "ja":
        return labels.ja;
      case "pt":
        return labels.pt;
      default:
        return labels.en;
    }
  };

  const categoryColors: Record<string, string> = {
    pull: "bg-secondary/10 border-secondary hover:bg-secondary/20",
    "guard-pass": "bg-primary/10 border-primary hover:bg-primary/20",
    control: "bg-accent/10 border-accent hover:bg-accent/20",
    submission: "bg-destructive/10 border-destructive hover:bg-destructive/20",
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsCheckingAuth(false);
      
      if (!session && !isAdmin) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate, isAdmin]);

  // Fetch techniques
  const fetchTechniques = useCallback(async (pageNum: number) => {
    if (pageNum === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("techniques")
        .select("*")
        .order("display_order", { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (pageNum === 0) {
          setTechniques(data as Technique[]);
        } else {
          setTechniques((prev) => [...prev, ...(data as Technique[])]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error fetching techniques:", error);
      toast.error(
        language === "ja" 
          ? "技の読み込みに失敗しました" 
          : "Failed to load techniques"
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [language]);

  // Initial load
  useEffect(() => {
    if (!isCheckingAuth && (subscribed || isAdmin)) {
      fetchTechniques(0);
    }
  }, [isCheckingAuth, subscribed, isAdmin, fetchTechniques]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchTechniques(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, fetchTechniques]);

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
              <div className="max-w-2xl mx-auto space-y-8">
                {/* Main Lock Card */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 p-12 rounded-2xl shadow-xl">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="p-6 bg-primary/10 rounded-full">
                        <Lock className="w-16 h-16 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        {language === "ja" 
                          ? "プレミアム限定コンテンツ" 
                          : language === "pt" 
                          ? "Conteúdo Exclusivo Premium" 
                          : "Premium Exclusive Content"}
                      </h2>
                      <p className="text-lg text-muted-foreground">
                        {language === "ja" 
                          ? "200以上の技術動画にアクセスして、あなたの柔術を次のレベルへ" 
                          : language === "pt" 
                          ? "Acesse mais de 200 vídeos técnicos e leve seu Jiu-Jitsu ao próximo nível" 
                          : "Access 200+ technique videos and take your Jiu-Jitsu to the next level"}
                      </p>
                    </div>

                    {/* Benefits List */}
                    <div className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border border-border">
                      <ul className="space-y-3 text-left">
                        {[
                          language === "ja" ? "200以上のテクニック動画" : language === "pt" ? "Mais de 200 vídeos de técnicas" : "200+ technique videos",
                          language === "ja" ? "初心者から上級者まで対応" : language === "pt" ? "Do iniciante ao avançado" : "From beginner to advanced",
                          language === "ja" ? "新しいコンテンツを毎週追加" : language === "pt" ? "Novos conteúdos toda semana" : "New content added weekly",
                          language === "ja" ? "カテゴリー別に整理された動画" : language === "pt" ? "Vídeos organizados por categoria" : "Videos organized by category",
                        ].map((benefit, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            <span className="text-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3 pt-4">
                      <Button 
                        onClick={() => navigate("/join")}
                        size="lg"
                        className="w-full text-lg py-6"
                      >
                        {language === "ja" 
                          ? "今すぐプランを見る" 
                          : language === "pt" 
                          ? "Ver Planos Agora" 
                          : "View Plans Now"}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        {language === "ja" 
                          ? "7日間の無料トライアル付き" 
                          : language === "pt" 
                          ? "7 dias de teste grátis inclusos" 
                          : "7-day free trial included"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  {[
                    {
                      title: language === "ja" ? "いつでもキャンセル可能" : language === "pt" ? "Cancele quando quiser" : "Cancel Anytime",
                      desc: language === "ja" ? "違約金なし" : language === "pt" ? "Sem multas" : "No penalties"
                    },
                    {
                      title: language === "ja" ? "全デバイス対応" : language === "pt" ? "Todos os dispositivos" : "All Devices",
                      desc: language === "ja" ? "PC・スマホ・タブレット" : language === "pt" ? "PC, celular, tablet" : "PC, mobile, tablet"
                    },
                    {
                      title: language === "ja" ? "安全な決済" : language === "pt" ? "Pagamento seguro" : "Secure Payment",
                      desc: language === "ja" ? "Stripe決済" : language === "pt" ? "Via Stripe" : "Via Stripe"
                    }
                  ].map((item, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground text-xs">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : techniques.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{language === "ja" ? "テクニックがまだ追加されていません" : language === "pt" ? "Nenhuma técnica adicionada ainda" : "No techniques added yet"}</p>
            </div>
          ) : (
            <div className="animate-fade-up">
              {/* Techniques Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {techniques.map((tech) => (
                  <Link
                    key={tech.id}
                    to={`/video/${tech.id}`}
                    className={`group block border rounded-lg overflow-hidden transition-all ${
                      categoryColors[tech.category]
                    }`}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-muted/50 relative">
                      {tech.thumbnail_url ? (
                        <img 
                          src={tech.thumbnail_url} 
                          alt={getTechniqueName(tech)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><div class="text-muted-foreground text-4xl">▶</div></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-muted-foreground text-4xl">▶</div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="text-xs px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
                          {getCategoryLabel(tech.category)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4">
                      <h3 className="font-medium text-sm md:text-base mb-1 line-clamp-2">
                        {getTechniqueName(tech)}
                      </h3>
                      {getTechniqueDescription(tech) && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {getTechniqueDescription(tech)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Infinite Scroll Observer */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">
                        {language === "ja" ? "読み込み中..." : language === "pt" ? "Carregando..." : "Loading..."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!hasMore && techniques.length > 0 && (
                <div className="space-y-8 mt-12">
                  <div className="p-8 border-2 border-dashed border-border rounded-lg text-center space-y-4 bg-card">
                    <div className="max-w-2xl mx-auto space-y-3">
                      <h3 className="text-2xl font-bold text-foreground">
                        {language === "ja" ? "あなたの動画を投稿してみよう！" : language === "pt" ? "Publique seus vídeos!" : "Share Your Videos!"}
                      </h3>
                      <p className="text-muted-foreground">
                        {language === "ja" 
                          ? "試合動画、テクニック動画など、どんな動画でもお気軽に投稿してください。" 
                          : language === "pt" 
                          ? "Compartilhe vídeos de lutas, técnicas e muito mais!" 
                          : "Share match videos, technique videos, and more!"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ja" 
                          ? "※ テクニック動画の場合、一部使わせていただく可能性があります。" 
                          : language === "pt" 
                          ? "* Vídeos de técnicas podem ser parcialmente utilizados." 
                          : "* Technique videos may be partially used."}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {language === "ja" 
                          ? "再生数に応じた収益をお返しします。" 
                          : language === "pt" 
                          ? "Ganhe com base nas visualizações!" 
                          : "Earn revenue based on views!"}
                      </p>
                      <Button 
                        onClick={() => setShowUploadDialog(true)}
                        size="lg"
                        className="mt-4"
                      >
                        <Upload className="mr-2 h-5 w-5" />
                        {language === "ja" ? "動画を投稿する" : language === "pt" ? "Publicar vídeo" : "Upload Video"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <VideoUploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
      />
    </div>
  );
};

export default Map;
