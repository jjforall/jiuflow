import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Star, Languages, Heart, GitBranch } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Celebrity {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  belt_history: any;
  titles: any;
  home_dojo: string | null;
  featured: boolean;
  sort_order: number;
  user_id: string | null;
  organization: {
    name: string;
    name_ja: string;
    name_pt: string;
  } | null;
}

const Athletes = () => {
  const { language } = useLanguage();
  const { translateText } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [translatedBios, setTranslatedBios] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [followedCelebrities, setFollowedCelebrities] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCelebrities();
    if (user) {
      loadFollowedCelebrities();
    }
  }, [user]);

  useEffect(() => {
    const titles = {
      ja: "有名選手 | jiuflow",
      en: "Famous Athletes | jiuflow",
      pt: "Atletas Famosos | jiuflow"
    };
    
    const descriptions = {
      ja: "世界で活躍するトップブラジリアン柔術選手たち。選手のプロフィール、実績、系譜を確認できます。",
      en: "Elite Brazilian Jiu-Jitsu athletes from around the world. View profiles, achievements, and lineage.",
      pt: "Atletas de elite de Jiu-Jitsu Brasileiro do mundo todo. Veja perfis, conquistas e linhagem."
    };
    
    document.title = titles[language] || titles.ja;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptions[language] || descriptions.ja);
    }
  }, [language]);

  const loadCelebrities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*, organization:organizations(name, name_ja, name_pt)')
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error) {
      console.error('Error loading celebrities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort celebrities to show followed ones first
  const sortedCelebrities = [...celebrities].sort((a, b) => {
    const aFollowed = followedCelebrities.has(a.id);
    const bFollowed = followedCelebrities.has(b.id);
    
    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;
    return 0;
  });

  const getBeltName = (beltHistory: any[]) => {
    if (!beltHistory || beltHistory.length === 0) return null;
    const latestBelt = beltHistory[beltHistory.length - 1];
    return latestBelt?.belt;
  };

  const getOrganizationName = (org: Celebrity['organization']) => {
    if (!org) return null;
    switch (language) {
      case 'ja': return org.name_ja;
      case 'pt': return org.name_pt;
      default: return org.name;
    }
  };

  const handleTranslateBio = async (celebrityId: string, bio: string) => {
    if (translatingIds.has(celebrityId)) return;
    
    setTranslatingIds(prev => new Set(prev).add(celebrityId));
    try {
      const translated = await translateText(bio, 'en');
      setTranslatedBios(prev => ({ ...prev, [celebrityId]: translated }));
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(celebrityId);
        return next;
      });
    }
  };

  const getBioText = (celebrity: Celebrity) => {
    if (translatedBios[celebrity.id]) {
      return translatedBios[celebrity.id];
    }
    return celebrity.bio;
  };

  const loadFollowedCelebrities = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('celebrity_follows')
        .select('celebrity_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const followedIds = new Set(data.map(f => f.celebrity_id));
      setFollowedCelebrities(followedIds);
    } catch (error) {
      console.error('Error loading followed celebrities:', error);
    }
  };

  const handleToggleFollow = async (celebrityId: string) => {
    if (!user) {
      toast.error(
        language === "ja" 
          ? "お気に入りに追加するにはログインが必要です" 
          : language === "pt" 
          ? "Faça login para favoritar" 
          : "Please login to favorite"
      );
      navigate('/login');
      return;
    }

    const isFollowing = followedCelebrities.has(celebrityId);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('celebrity_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('celebrity_id', celebrityId);

        if (error) throw error;

        setFollowedCelebrities(prev => {
          const next = new Set(prev);
          next.delete(celebrityId);
          return next;
        });

        toast.success(
          language === "ja" 
            ? "お気に入りから削除しました" 
            : language === "pt" 
            ? "Removido dos favoritos" 
            : "Removed from favorites"
        );
      } else {
        const { error } = await supabase
          .from('celebrity_follows')
          .insert({
            user_id: user.id,
            celebrity_id: celebrityId
          });

        if (error) throw error;

        setFollowedCelebrities(prev => new Set(prev).add(celebrityId));

        toast.success(
          language === "ja" 
            ? "お気に入りに追加しました" 
            : language === "pt" 
            ? "Adicionado aos favoritos" 
            : "Added to favorites"
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error(
        language === "ja" 
          ? "エラーが発生しました" 
          : language === "pt" 
          ? "Ocorreu um erro" 
          : "An error occurred"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header - Always show immediately */}
          <div className="mb-12 text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-4">
              {language === "ja" ? "有名選手" : language === "pt" ? "Atletas Famosos" : "Famous Athletes"}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              {language === "ja" 
                ? "世界で活躍するトップ選手たち" 
                : language === "pt" 
                ? "Atletas de elite do mundo" 
                : "Elite athletes from around the world"}
            </p>
            <Button
              onClick={() => navigate('/lineage-tree')}
              variant="outline"
              className="gap-2"
            >
              <GitBranch className="h-4 w-4" />
              {language === "ja" ? "系統図を見る" : language === "pt" ? "Ver Linhagem" : "View Lineage Tree"}
            </Button>
          </div>

          {/* Athletes Grid */}
          <div className="w-full">
              {/* Loading State */}
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-20 w-20 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : celebrities.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground">
                    {language === "ja" 
                      ? "選手が登録されていません" 
                      : language === "pt" 
                      ? "Nenhum atleta registrado" 
                      : "No athletes registered"}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {sortedCelebrities.map((celebrity) => (
                <div key={celebrity.id} className="group">
                  <Link
                    to={`/athlete/${celebrity.user_id || celebrity.id}`}
                    className="block h-full"
                  >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] h-full flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-24 w-24 border-2 border-border group-hover:border-primary transition-colors flex-shrink-0">
                          <AvatarImage src={celebrity.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl">
                            {celebrity.display_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <h3 className="text-xl font-semibold line-clamp-1 group-hover:text-primary transition-colors flex-1">
                              {celebrity.display_name}
                            </h3>
                            {celebrity.featured && (
                              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          {getBeltName(celebrity.belt_history) && (
                            <Badge variant="secondary" className="mb-2 text-xs">
                              {getBeltName(celebrity.belt_history)}
                            </Badge>
                          )}
                          {getOrganizationName(celebrity.organization) && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {getOrganizationName(celebrity.organization)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleFollow(celebrity.id);
                          }}
                          className="p-2 h-9 w-9 flex-shrink-0"
                        >
                          <Heart 
                            className={`h-5 w-5 transition-colors ${
                              followedCelebrities.has(celebrity.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-muted-foreground hover:text-red-500'
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col space-y-3 pt-0">
                      {celebrity.bio && (
                        <div className="space-y-2 flex-1">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {getBioText(celebrity)}
                          </p>
                          {language !== 'en' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleTranslateBio(celebrity.id, celebrity.bio!);
                              }}
                              disabled={translatingIds.has(celebrity.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Languages className="h-3 w-3 mr-1" />
                              {translatingIds.has(celebrity.id) 
                                ? (language === 'ja' ? '翻訳中...' : 'Traduzindo...') 
                                : translatedBios[celebrity.id]
                                ? (language === 'ja' ? '原文' : 'Original')
                                : (language === 'ja' ? '翻訳' : 'Traduzir')}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        {celebrity.home_dojo && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {language === "ja" ? "所属:" : language === "pt" ? "Academia:" : "Gym:"}
                            </span>
                            <span className="font-medium truncate">{celebrity.home_dojo}</span>
                          </div>
                        )}
                        
                        {celebrity.titles && celebrity.titles.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">🏆</span>
                            <span className="font-medium">
                              {celebrity.titles.length} {language === "ja" ? "タイトル" : language === "pt" ? "títulos" : "titles"}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Athletes;
