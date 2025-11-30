import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Star, MapPin, Trophy, Edit, Instagram, Twitter, Youtube, Globe, Languages } from "lucide-react";

interface Celebrity {
  id: string;
  user_id: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  belt_history: any;
  titles: any;
  home_dojo: string | null;
  featured: boolean;
  sort_order: number;
  organization: {
    name: string;
    name_ja: string;
    name_pt: string;
  } | null;
  social_links: any;
  stats: any;
}

const Athlete = () => {
  const { slugOrUsername } = useParams<{ slugOrUsername: string }>();
  const { language } = useLanguage();
  const { translateText } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    loadCelebrity();
  }, [slugOrUsername]);

  const loadCelebrity = async () => {
    if (!slugOrUsername) return;
    
    setIsLoading(true);
    try {
      // Try to find celebrity by user_id first
      let { data, error } = await supabase
        .from('celebrities')
        .select('*, organization:organizations(name, name_ja, name_pt)')
        .eq('user_id', slugOrUsername)
        .maybeSingle();

      // If not found by user_id, try by id
      if (!data && !error) {
        const result = await supabase
          .from('celebrities')
          .select('*, organization:organizations(name, name_ja, name_pt)')
          .eq('id', slugOrUsername)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      if (data) {
        setCelebrity(data);
        setIsOwner(user?.id === data.user_id);
      }
    } catch (error) {
      console.error('Error loading celebrity:', error);
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

  const handleTranslateBio = async () => {
    if (!celebrity?.bio || isTranslating) return;
    
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(celebrity.bio, 'en');
      setTranslatedBio(translated);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">
              {language === "ja" ? "選手が見つかりません" : language === "pt" ? "Atleta não encontrado" : "Athlete not found"}
            </h2>
            <Button asChild>
              <Link to="/athletes">
                {language === "ja" ? "選手一覧に戻る" : language === "pt" ? "Voltar para atletas" : "Back to Athletes"}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentBelt = getBeltName(celebrity.belt_history);
  const orgName = getOrganizationName(celebrity.organization);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 md:pt-24 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <Avatar className="h-32 w-32 border-4 border-border">
                <AvatarImage src={celebrity.avatar_url || undefined} />
                <AvatarFallback className="text-4xl">
                  {celebrity.display_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-light tracking-tight">
                    {celebrity.display_name}
                  </h1>
                  {celebrity.featured && (
                    <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  {currentBelt && <BeltBadge belt={currentBelt} />}
                  {orgName && (
                    <Badge variant="outline" className="text-base">
                      {orgName}
                    </Badge>
                  )}
                </div>

                {celebrity.bio && (
                  <div className="mb-4">
                    <p className="text-lg text-muted-foreground mb-2">
                      {translatedBio || celebrity.bio}
                    </p>
                    {language !== 'en' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTranslateBio}
                        disabled={isTranslating}
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {isTranslating 
                          ? (language === 'ja' ? '翻訳中...' : 'Traduzindo...') 
                          : translatedBio
                          ? (language === 'ja' ? '原文を表示' : 'Mostrar original')
                          : (language === 'ja' ? '英語に翻訳' : 'Traduzir para inglês')}
                      </Button>
                    )}
                  </div>
                )}

                {isOwner && (
                  <Button onClick={() => navigate('/mypage')} className="gap-2">
                    <Edit className="h-4 w-4" />
                    {language === "ja" ? "プロフィール編集" : language === "pt" ? "Editar Perfil" : "Edit Profile"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {celebrity.home_dojo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {language === "ja" ? "所属道場" : language === "pt" ? "Academia" : "Home Gym"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{celebrity.home_dojo}</p>
                </CardContent>
              </Card>
            )}

            {celebrity.titles && celebrity.titles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {language === "ja" ? "タイトル" : language === "pt" ? "Títulos" : "Titles"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {celebrity.titles.map((title: any, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{title.title || title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Belt History */}
          {celebrity.belt_history && celebrity.belt_history.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>
                  {language === "ja" ? "帯の履歴" : language === "pt" ? "Histórico de Faixas" : "Belt History"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {celebrity.belt_history.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-4">
                      <BeltBadge belt={item.belt} />
                      {item.date && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.date).getFullYear()}
                        </span>
                      )}
                      {item.instructor && (
                        <span className="text-sm text-muted-foreground">
                          {language === "ja" ? "指導者:" : language === "pt" ? "Instrutor:" : "Instructor:"} {item.instructor}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Links */}
          {celebrity.social_links && Object.keys(celebrity.social_links).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ja" ? "ソーシャルメディア" : language === "pt" ? "Redes Sociais" : "Social Media"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {celebrity.social_links.instagram && (
                    <Button variant="outline" asChild>
                      <a href={celebrity.social_links.instagram} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    </Button>
                  )}
                  {celebrity.social_links.twitter && (
                    <Button variant="outline" asChild>
                      <a href={celebrity.social_links.twitter} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </a>
                    </Button>
                  )}
                  {celebrity.social_links.youtube && (
                    <Button variant="outline" asChild>
                      <a href={celebrity.social_links.youtube} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </a>
                    </Button>
                  )}
                  {celebrity.social_links.website && (
                    <Button variant="outline" asChild>
                      <a href={celebrity.social_links.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Athlete;
