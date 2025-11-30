import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

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
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCelebrities();
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center animate-fade-up">
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-4">
              {language === "ja" ? "有名選手" : language === "pt" ? "Atletas Famosos" : "Famous Athletes"}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              {language === "ja" 
                ? "世界で活躍するトップ選手たち" 
                : language === "pt" 
                ? "Atletas de elite do mundo" 
                : "Elite athletes from around the world"}
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
              {celebrities.map((celebrity) => (
                <Link
                  key={celebrity.id}
                  to={celebrity.user_id ? `/${celebrity.user_id}` : `/athlete/${celebrity.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] h-full">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-20 border-2 border-border group-hover:border-primary transition-colors">
                          <AvatarImage src={celebrity.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl">
                            {celebrity.display_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold truncate group-hover:text-primary transition-colors">
                              {celebrity.display_name}
                            </h3>
                            {celebrity.featured && (
                              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          {getBeltName(celebrity.belt_history) && (
                            <Badge variant="secondary" className="mb-2">
                              {getBeltName(celebrity.belt_history)}
                            </Badge>
                          )}
                          {getOrganizationName(celebrity.organization) && (
                            <p className="text-sm text-muted-foreground truncate">
                              {getOrganizationName(celebrity.organization)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {celebrity.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {celebrity.bio}
                        </p>
                      )}
                      
                      {celebrity.home_dojo && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {language === "ja" ? "所属:" : language === "pt" ? "Academia:" : "Gym:"}
                          </span>
                          <span className="font-medium">{celebrity.home_dojo}</span>
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
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Athletes;
