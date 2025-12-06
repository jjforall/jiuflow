import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Plus, Globe, Instagram, Facebook, Phone, Mail, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Dojo {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean;
  created_at: string;
  is_favorite?: boolean;
}

export default function Dojos() {
  const { language } = useLanguage();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [filteredDojos, setFilteredDojos] = useState<Dojo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const titles = {
      ja: "道場一覧 | jiuflow",
      en: "Dojos | jiuflow",
      pt: "Academias | jiuflow"
    };
    
    const descriptions = {
      ja: "世界中のブラジリアン柔術道場を検索。道場の情報、場所、連絡先を確認できます。",
      en: "Find Brazilian Jiu-Jitsu dojos worldwide. View gym information, locations, and contact details.",
      pt: "Encontre academias de Jiu-Jitsu Brasileiro em todo o mundo. Veja informações, localizações e contatos."
    };
    
    document.title = titles[language] || titles.ja;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptions[language] || descriptions.ja);
    }
  }, [language]);

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);
      
      // Load dojos and favorites in parallel
      const promises = [loadDojos()];
      if (user?.id) {
        promises.push(loadFavorites(user.id));
      }
      await Promise.all(promises);
    };
    
    initPage();
  }, []);

  useEffect(() => {
    filterDojos();
  }, [searchQuery, dojos, favorites]);

  const loadFavorites = async (userIdParam?: string) => {
    const id = userIdParam || userId;
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_dojos')
        .select('dojo_id')
        .eq('user_id', id);

      if (error) throw error;
      
      const favoriteIds = new Set((data || []).map(f => f.dojo_id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (dojoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast.error(language === "ja" ? "ログインが必要です" : "Login required");
      return;
    }

    const isFavorite = favorites.has(dojoId);
    
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_dojos')
          .delete()
          .eq('user_id', userId)
          .eq('dojo_id', dojoId);

        if (error) throw error;
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(dojoId);
          return newSet;
        });
        
        toast.success(language === "ja" ? "お気に入りから削除しました" : "Removed from favorites");
      } else {
        const { error } = await supabase
          .from('favorite_dojos')
          .insert({ user_id: userId, dojo_id: dojoId });

        if (error) throw error;
        
        setFavorites(prev => new Set(prev).add(dojoId));
        
        toast.success(language === "ja" ? "お気に入りに追加しました" : "Added to favorites");
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(language === "ja" ? "エラーが発生しました" : "An error occurred");
    }
  };

  const loadDojos = async () => {
    try {
      // Use public_dojos view which hides email/phone from unauthenticated users
      const { data, error } = await supabase
        .from('public_dojos' as any)
        .select('*')
        .order('is_verified', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error loading from public_dojos view:', error);
        // Fallback to dojos table if view doesn't work
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('dojos')
          .select('id, name, name_ja, name_pt, description, description_ja, description_pt, location, website, instagram, facebook, logo_url, cover_image_url, is_verified, created_at, email, phone')
          .order('is_verified', { ascending: false })
          .order('name');
        
        if (fallbackError) throw fallbackError;
        setDojos((fallbackData || []) as Dojo[]);
        setFilteredDojos((fallbackData || []) as Dojo[]);
        return;
      }
      
      setDojos((data as unknown as Dojo[]) || []);
      setFilteredDojos((data as unknown as Dojo[]) || []);
    } catch (error) {
      console.error('Error loading dojos:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojos");
    } finally {
      setLoading(false);
    }
  };

  const filterDojos = () => {
    let filtered = [...dojos];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dojo => {
        const name = language === "ja" ? dojo.name_ja : language === "pt" ? dojo.name_pt : dojo.name;
        const location = dojo.location || "";
        return name.toLowerCase().includes(query) || location.toLowerCase().includes(query);
      });
    }
    
    // Sort: favorites first, then with photo, then verified, then by name
    filtered.sort((a, b) => {
      const aFav = favorites.has(a.id);
      const bFav = favorites.has(b.id);
      
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Prioritize dojos with cover images (photos)
      const aHasPhoto = !!a.cover_image_url;
      const bHasPhoto = !!b.cover_image_url;
      
      if (aHasPhoto && !bHasPhoto) return -1;
      if (!aHasPhoto && bHasPhoto) return 1;
      
      if (a.is_verified && !b.is_verified) return -1;
      if (!a.is_verified && b.is_verified) return 1;
      
      const aName = language === "ja" ? a.name_ja : language === "pt" ? a.name_pt : a.name;
      const bName = language === "ja" ? b.name_ja : language === "pt" ? b.name_pt : b.name;
      return aName.localeCompare(bName);
    });
    
    setFilteredDojos(filtered);
  };

  const getDojoName = (dojo: Dojo) => {
    if (language === "ja") return dojo.name_ja;
    if (language === "pt") return dojo.name_pt;
    return dojo.name;
  };

  const getDojoDescription = (dojo: Dojo) => {
    if (language === "ja") return dojo.description_ja;
    if (language === "pt") return dojo.description_pt;
    return dojo.description;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6 sm:mb-10 md:mb-12 text-center animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-2 sm:mb-4">
              {language === "ja" ? "道場一覧" : language === "pt" ? "Lista de Dojos" : "Dojos"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              {language === "ja" 
                ? "全国の柔術道場を探す" 
                : language === "pt"
                ? "Encontre academias de Jiu-Jitsu"
                : "Find Jiu-Jitsu academies"}
            </p>
          </div>

          {/* Search and Add */}
          <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8 flex-col sm:flex-row animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "ja" ? "道場名、場所で検索..." : "Search by name, location..."}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
                disabled={loading}
              />
            </div>
            {isAuthenticated && (
              <Link to="/dojos/new">
                <Button className="gap-1.5 sm:gap-2 w-full sm:w-auto h-10 sm:h-11 text-sm active:scale-[0.98]">
                  <Plus className="w-4 h-4" />
                  {language === "ja" ? "道場を登録" : language === "pt" ? "Adicionar" : "Add Dojo"}
                </Button>
              </Link>
            )}
          </div>

          {/* Dojos Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 animate-fade-in">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-32 sm:h-40 md:h-48 bg-muted animate-pulse" />
                  <CardContent className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3">
                    <div className="h-5 sm:h-6 bg-muted rounded animate-pulse" />
                    <div className="h-3 sm:h-4 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-3 sm:h-4 bg-muted rounded w-1/2 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDojos.length === 0 ? (
            <Card>
              <CardContent className="p-8 sm:p-12 text-center">
                <p className="text-muted-foreground text-sm sm:text-base">
                  {language === "ja" ? "道場が見つかりませんでした" : "No dojos found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {filteredDojos.map((dojo) => (
                <Link key={dojo.id} to={`/dojo/${dojo.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow relative active:scale-[0.99]">
                    {/* Favorite button */}
                    {isAuthenticated && (
                      <button
                        onClick={(e) => toggleFavorite(dojo.id, e)}
                        className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 z-10 p-1.5 sm:p-2 bg-background/80 backdrop-blur-sm rounded-full border border-border hover:bg-background active:scale-95 transition-all"
                      >
                        <Heart 
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${favorites.has(dojo.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                        />
                      </button>
                    )}
                    <CardContent className="p-0">
                      {/* Cover Image */}
                      {dojo.cover_image_url && (
                        <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                          <img
                            src={dojo.cover_image_url}
                            alt={getDojoName(dojo)}
                            className="w-full h-full object-cover"
                          />
                          {dojo.is_verified && (
                            <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 bg-muted/80 text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs">
                              PR
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-3 sm:p-4 md:p-6">
                        {!dojo.cover_image_url && dojo.is_verified && (
                          <div className="mb-2 sm:mb-3">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs opacity-60">
                              PR
                            </Badge>
                          </div>
                        )}
                        <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1.5 sm:mb-2 line-clamp-1">{getDojoName(dojo)}</h3>
                        
                        {dojo.location && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{dojo.location}</span>
                          </div>
                        )}

                        {getDojoDescription(dojo) && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                            {getDojoDescription(dojo)}
                          </p>
                        )}

                        {/* Social Links */}
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                          {dojo.website && (
                            <a
                              href={dojo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 sm:p-2 bg-muted/50 rounded hover:bg-muted active:scale-95 transition-all"
                              title={language === "ja" ? "ウェブサイト" : "Website"}
                            >
                              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                            </a>
                          )}
                          {dojo.instagram && (
                            <a
                              href={`https://instagram.com/${dojo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('instagram.com/', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 sm:p-2 bg-muted/50 rounded hover:bg-muted active:scale-95 transition-all"
                              title="Instagram"
                            >
                              <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                            </a>
                          )}
                          {dojo.facebook && (
                            <a
                              href={dojo.facebook.startsWith('http') ? dojo.facebook : `https://facebook.com/${dojo.facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 sm:p-2 bg-muted/50 rounded hover:bg-muted active:scale-95 transition-all"
                              title="Facebook"
                            >
                              <Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                            </a>
                          )}
                          {dojo.phone && (
                            <a
                              href={`tel:${dojo.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 sm:p-2 bg-muted/50 rounded hover:bg-muted active:scale-95 transition-all"
                              title={language === "ja" ? "電話" : "Phone"}
                            >
                              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                            </a>
                          )}
                          {dojo.email && (
                            <a
                              href={`mailto:${dojo.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 sm:p-2 bg-muted/50 rounded hover:bg-muted active:scale-95 transition-all"
                              title={language === "ja" ? "メール" : "Email"}
                            >
                              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
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
}
