import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Star, Heart, GitBranch } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Celebrity {
  id: string;
  display_name: string;
  bio: string | null;
  bio_ja: string | null;
  bio_en: string | null;
  bio_pt: string | null;
  bio_es: string | null;
  bio_fr: string | null;
  bio_de: string | null;
  bio_zh: string | null;
  bio_ko: string | null;
  bio_it: string | null;
  bio_ru: string | null;
  bio_ar: string | null;
  bio_hi: string | null;
  avatar_url: string | null;
  belt_history: any;
  titles: any;
  home_dojo: string | null;
  featured: boolean;
  sort_order: number;
  user_id: string | null;
  organization_id?: string | null;
  organization: {
    name: string;
    name_ja: string;
    name_pt: string;
  } | null;
  instructors?: Array<{
    instructor: {
      display_name: string;
      id: string;
      avatar_url: string | null;
    };
  }>;
}

const Athletes = () => {
  const { language } = useLanguage();
  const { translateText } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      // First, load basic celebrity data (fast query)
      const { data, error } = await supabase
        .from('celebrities')
        .select(`
          id,
          display_name,
          bio_ja,
          bio_en,
          bio_pt,
          avatar_url,
          belt_history,
          featured,
          sort_order,
          user_id,
          organization_id
        `)
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      
      // Set initial data immediately for fast render
      const initialData = (data || []).map(c => ({
        ...c,
        bio: null,
        bio_es: null,
        bio_fr: null,
        bio_de: null,
        bio_zh: null,
        bio_ko: null,
        bio_it: null,
        bio_ru: null,
        bio_ar: null,
        bio_hi: null,
        titles: null,
        home_dojo: null,
        organization: null,
        instructors: []
      }));
      setCelebrities(initialData);
      setIsLoading(false);

      // Then load organizations in background
      const orgIds = [...new Set(data?.filter(c => c.organization_id).map(c => c.organization_id))];
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, name_ja, name_pt')
          .in('id', orgIds);
        
        if (orgs) {
          const orgMap = new Map(orgs.map(o => [o.id, o]));
          setCelebrities(prev => prev.map(c => ({
            ...c,
            organization: c.organization_id ? orgMap.get(c.organization_id) || null : null
          })));
        }
      }

      // Load instructors in background (lazy)
      const { data: lineages } = await supabase
        .from('celebrity_lineage')
        .select(`
          student_id,
          instructor:celebrities!celebrity_lineage_instructor_id_fkey(
            id,
            display_name,
            avatar_url
          )
        `);
      
      if (lineages) {
        const instructorMap = new Map<string, any[]>();
        lineages.forEach(l => {
          if (!instructorMap.has(l.student_id)) {
            instructorMap.set(l.student_id, []);
          }
          instructorMap.get(l.student_id)!.push({ instructor: l.instructor });
        });
        
        setCelebrities(prev => prev.map(c => ({
          ...c,
          instructors: instructorMap.get(c.id) || []
        })));
      }
    } catch (error) {
      console.error('Error loading celebrities:', error);
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
    const belt = latestBelt?.belt;
    if (!belt) return null;
    // 帯名を標準化（色のみを返す）
    const beltLower = belt.toLowerCase();
    if (beltLower.includes('white') || beltLower.includes('白')) return 'White';
    if (beltLower.includes('blue') || beltLower.includes('青')) return 'Blue';
    if (beltLower.includes('purple') || beltLower.includes('紫')) return 'Purple';
    if (beltLower.includes('brown') || beltLower.includes('茶')) return 'Brown';
    if (beltLower.includes('coral') || beltLower.includes('珊瑚')) return 'Coral';
    if (beltLower.includes('red') || beltLower.includes('赤')) return 'Red';
    if (beltLower.includes('black') || beltLower.includes('黒')) return 'Black';
    return belt;
  };

  const getOrganizationName = (org: Celebrity['organization']) => {
    if (!org) return null;
    switch (language) {
      case 'ja': return org.name_ja;
      case 'pt': return org.name_pt;
      default: return org.name;
    }
  };

  const getBioText = (celebrity: Celebrity) => {
    const bioMap: Record<string, string | null> = {
      ja: celebrity.bio_ja,
      en: celebrity.bio_en,
      pt: celebrity.bio_pt,
      es: celebrity.bio_es,
      fr: celebrity.bio_fr,
      de: celebrity.bio_de,
      zh: celebrity.bio_zh,
      ko: celebrity.bio_ko,
      it: celebrity.bio_it,
      ru: celebrity.bio_ru,
      ar: celebrity.bio_ar,
      hi: celebrity.bio_hi,
    };
    
    return bioMap[language] || celebrity.bio_ja || celebrity.bio || null;
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
      
      <main className="pt-20 md:pt-28 pb-12 md:pb-16 px-3 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-12 text-center animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-light tracking-tight mb-2 md:mb-4">
              {language === "ja" ? "有名選手" : language === "pt" ? "Atletas Famosos" : "Famous Athletes"}
            </h1>
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground mb-4 md:mb-6">
              {language === "ja" 
                ? "世界で活躍するトップ選手たち" 
                : language === "pt" 
                ? "Atletas de elite do mundo" 
                : "Elite athletes from around the world"}
            </p>
            <Button
              onClick={() => navigate('/lineage-tree')}
              variant="outline"
              size="sm"
              className="gap-2 text-xs md:text-sm"
            >
              <GitBranch className="h-3 w-3 md:h-4 md:w-4" />
              {language === "ja" ? "系統図を見る" : language === "pt" ? "Ver Linhagem" : "View Lineage Tree"}
            </Button>
          </div>

          {/* Athletes Grid */}
          <div className="w-full">
              {/* Loading State */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-fade-in">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader className="p-3 md:p-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-14 w-14 md:h-20 md:w-20 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : celebrities.length === 0 ? (
                <div className="text-center py-12 md:py-16">
                  <p className="text-base md:text-lg text-muted-foreground">
                    {language === "ja" 
                      ? "選手が登録されていません" 
                      : language === "pt" 
                      ? "Nenhum atleta registrado" 
                      : "No athletes registered"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-fade-in">
              {sortedCelebrities.map((celebrity) => (
                <div key={celebrity.id} className="group">
                  <Link
                    to={`/athlete/${celebrity.user_id || celebrity.id}`}
                    className="block h-full"
                  >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl active:scale-[0.98] md:hover:scale-[1.02] h-full flex flex-col">
                    <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                      <div className="flex items-start gap-3 md:gap-4">
                        <Avatar className="h-14 w-14 md:h-20 md:w-20 border-2 border-border group-hover:border-primary transition-colors flex-shrink-0">
                          <AvatarImage src={celebrity.avatar_url || undefined} />
                          <AvatarFallback className="text-lg md:text-2xl">
                            {celebrity.display_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-xl font-semibold group-hover:text-primary transition-colors break-words mb-1 md:mb-2">
                            {celebrity.display_name}
                          </h3>
                          {getBeltName(celebrity.belt_history) && (
                            <BeltBadge belt={getBeltName(celebrity.belt_history)!} className="mb-1 md:mb-2 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5" />
                          )}
                          {getOrganizationName(celebrity.organization) && (
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
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
                          className="p-1.5 md:p-2 h-8 w-8 md:h-9 md:w-9 flex-shrink-0"
                        >
                          <Heart 
                            className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${
                              followedCelebrities.has(celebrity.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-muted-foreground hover:text-red-500'
                            }`}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col space-y-2 md:space-y-3 p-3 pt-0 md:p-6 md:pt-0">
                      {getBioText(celebrity) && (
                        <div className="flex-1">
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
                            {getBioText(celebrity)}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-1 md:space-y-2 pt-2 border-t border-border/50">
                        {celebrity.instructors && celebrity.instructors.length > 0 && (
                          <div className="flex items-center gap-2 text-xs md:text-sm">
                            <span className="text-muted-foreground flex-shrink-0">
                              {language === "ja" ? "師匠:" : language === "pt" ? "Mestre:" : "Instructor:"}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {celebrity.instructors.map((i, idx) => (
                                <Link
                                  key={i.instructor.id}
                                  to={`/athlete/${i.instructor.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-primary transition-colors"
                                >
                                  <Avatar className="h-5 w-5 md:h-6 md:w-6 border border-border">
                                    <AvatarImage src={i.instructor.avatar_url || undefined} />
                                    <AvatarFallback className="text-[8px] md:text-[10px]">
                                      {i.instructor.display_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-xs">
                                    {i.instructor.display_name}
                                  </span>
                                  {idx < celebrity.instructors!.length - 1 && <span className="text-muted-foreground">,</span>}
                                </Link>
                              ))}
                            </div>
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
