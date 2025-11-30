import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Plus, Globe, Instagram, Facebook, Phone, Mail } from "lucide-react";
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
}

export default function Dojos() {
  const { language } = useLanguage();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [filteredDojos, setFilteredDojos] = useState<Dojo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadDojos();
    checkAuth();
  }, []);

  useEffect(() => {
    filterDojos();
  }, [searchQuery, dojos]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const loadDojos = async () => {
    try {
      const { data, error } = await supabase
        .from('dojos')
        .select('*')
        .order('is_verified', { ascending: false })
        .order('name');

      if (error) throw error;
      
      // Priority dojos: Yawara, Sweep, Overlimit Sapporo
      const priorityNames = ['ヤワラ', 'スウィープ', 'オーバーリミット札幌'];
      const priorityDojos = (data || []).filter(dojo => 
        priorityNames.some(name => dojo.name_ja.includes(name))
      );
      const otherDojos = (data || []).filter(dojo => 
        !priorityNames.some(name => dojo.name_ja.includes(name))
      );
      
      const sortedDojos = [...priorityDojos, ...otherDojos];
      setDojos(sortedDojos);
      setFilteredDojos(sortedDojos);
    } catch (error) {
      console.error('Error loading dojos:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojos");
    } finally {
      setLoading(false);
    }
  };

  const filterDojos = () => {
    if (!searchQuery.trim()) {
      setFilteredDojos(dojos);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = dojos.filter(dojo => {
      const name = language === "ja" ? dojo.name_ja : language === "pt" ? dojo.name_pt : dojo.name;
      const location = dojo.location || "";
      return name.toLowerCase().includes(query) || location.toLowerCase().includes(query);
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
      <main className="flex-grow pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-4">
              {language === "ja" ? "道場一覧" : language === "pt" ? "Lista de Dojos" : "Dojos"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {language === "ja" 
                ? "全国の柔術道場を探す" 
                : language === "pt"
                ? "Encontre academias de Jiu-Jitsu"
                : "Find Jiu-Jitsu academies"}
            </p>
          </div>

          {/* Search and Add */}
          <div className="flex gap-4 mb-8 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "ja" ? "道場名、場所で検索..." : "Search by name, location..."}
                className="pl-10"
              />
            </div>
            {isAuthenticated && (
              <Link to="/dojos/new">
                <Button className="gap-2 w-full md:w-auto">
                  <Plus className="w-4 h-4" />
                  {language === "ja" ? "道場を登録" : language === "pt" ? "Adicionar Dojo" : "Add Dojo"}
                </Button>
              </Link>
            )}
          </div>

          {/* Dojos Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-48 bg-muted rounded mb-4" />
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDojos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  {language === "ja" ? "道場が見つかりませんでした" : "No dojos found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDojos.map((dojo) => (
                <Link key={dojo.id} to={`/dojo/${dojo.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {/* Cover Image - Only show if exists */}
                      {dojo.cover_image_url && (
                        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                          <img
                            src={dojo.cover_image_url}
                            alt={getDojoName(dojo)}
                            className="w-full h-full object-cover"
                          />
                          {dojo.is_verified && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                              {language === "ja" ? "公認" : "Verified"}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6">
                        {!dojo.cover_image_url && dojo.is_verified && (
                          <div className="mb-3">
                            <Badge variant="default" className="text-xs">
                              {language === "ja" ? "公認" : "Verified"}
                            </Badge>
                          </div>
                        )}
                        <h3 className="text-xl font-bold mb-2">{getDojoName(dojo)}</h3>
                        
                        {dojo.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <MapPin className="w-4 h-4" />
                            {dojo.location}
                          </div>
                        )}

                        {getDojoDescription(dojo) && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {getDojoDescription(dojo)}
                          </p>
                        )}

                        {/* Social Links */}
                        <div className="flex gap-2 flex-wrap">
                          {dojo.website && (
                            <div className="p-2 bg-muted/50 rounded">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {dojo.instagram && (
                            <div className="p-2 bg-muted/50 rounded">
                              <Instagram className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {dojo.facebook && (
                            <div className="p-2 bg-muted/50 rounded">
                              <Facebook className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {dojo.phone && (
                            <div className="p-2 bg-muted/50 rounded">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {dojo.email && (
                            <div className="p-2 bg-muted/50 rounded">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </div>
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
