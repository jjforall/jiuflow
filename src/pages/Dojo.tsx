import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead, generateDojoStructuredData, generateBreadcrumbStructuredData } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Globe, Instagram, Facebook, Phone, Mail, Users, ExternalLink, Heart, 
  Calendar, Clock, Award, Shield, BookOpen, Target, Sparkles, CheckCircle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Dojo {
  id: string;
  slug?: string | null;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  mission: string | null;
  mission_ja: string | null;
  mission_pt: string | null;
  target_audience: string | null;
  target_audience_ja: string | null;
  target_audience_pt: string | null;
  features: any;
  classes: any;
  pricing: any;
  schedule: any;
  instructors: any;
  facilities: any;
  opening_hours: any;
  access_info: string | null;
  access_info_ja: string | null;
  access_info_pt: string | null;
  trial_info: any;
  faq: any;
  testimonials: any;
  gallery: any;
  news: any;
  rules: string | null;
  rules_ja: string | null;
  rules_pt: string | null;
  safety_measures: string | null;
  safety_measures_ja: string | null;
  safety_measures_pt: string | null;
  perks: any;
  media_coverage: any;
  online_resources: string | null;
  online_resources_ja: string | null;
  online_resources_pt: string | null;
  youtube: string | null;
  twitter: string | null;
  line: string | null;
  blog_url: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean;
}

interface Member {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  relationship_type: string;
}

export default function Dojo() {
  const params = useParams<{ id?: string; slugOrUsername?: string; lang?: string }>();
  const { language } = useLanguage();
  const [dojo, setDojo] = useState<Dojo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Determine if we're using an ID, slug, or lang param (when accessed via /:lang route)
  const identifier = params.id || params.slugOrUsername || params.lang;

  useEffect(() => {
    if (identifier) {
      loadDojo();
    }
  }, [identifier]);

  useEffect(() => {
    if (dojo?.id) {
      loadMembers();
      checkAuth();
    }
  }, [dojo?.id]);

  useEffect(() => {
    if (userId && dojo?.id) {
      checkFavorite();
    }
  }, [userId, dojo?.id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const checkFavorite = async () => {
    if (!userId || !dojo?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_dojos')
        .select('id')
        .eq('user_id', userId)
        .eq('dojo_id', dojo.id)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!userId || !dojo?.id) {
      toast.error(language === "ja" ? "ログインが必要です" : "Login required");
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_dojos')
          .delete()
          .eq('user_id', userId)
          .eq('dojo_id', dojo.id);

        if (error) throw error;
        
        setIsFavorite(false);
        toast.success(language === "ja" ? "お気に入りから削除しました" : "Removed from favorites");
      } else {
        const { error } = await supabase
          .from('favorite_dojos')
          .insert({ user_id: userId, dojo_id: dojo.id });

        if (error) throw error;
        
        setIsFavorite(true);
        toast.success(language === "ja" ? "お気に入りに追加しました" : "Added to favorites");
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(language === "ja" ? "エラーが発生しました" : "An error occurred");
    }
  };

  const loadDojo = async () => {
    if (!identifier) return;

    try {
      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      // Check if identifier is a UUID (ID) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      // Use public_dojos view which hides email/phone from unauthenticated users
      let query = supabase.from('public_dojos' as any).select('*');
      
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error loading from public_dojos view:', error);
        // Fallback to dojos table
        let fallbackQuery = supabase.from('dojos').select('*');
        if (isUUID) {
          fallbackQuery = fallbackQuery.eq('id', identifier);
        } else {
          fallbackQuery = fallbackQuery.eq('slug', identifier);
        }
        const { data: fallbackData, error: fallbackError } = await fallbackQuery.maybeSingle();
        
        if (fallbackError) throw fallbackError;
        if (!fallbackData) {
          toast.error(language === "ja" ? "道場が見つかりませんでした" : "Dojo not found");
        }
        setDojo(fallbackData as Dojo | null);
      } else {
        if (!data) {
          toast.error(language === "ja" ? "道場が見つかりませんでした" : "Dojo not found");
        }
        setDojo(data as unknown as Dojo | null);
      }
    } catch (error) {
      console.error('Error loading dojo:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojo");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!dojo?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_dojos')
        .select(`
          relationship_type,
          profiles:user_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('dojo_id', dojo.id);

      if (error) throw error;
      
      const formattedMembers = (data || []).map((item: any) => ({
        id: item.profiles.id,
        display_name: item.profiles.display_name,
        username: item.profiles.username,
        avatar_url: item.profiles.avatar_url,
        relationship_type: item.relationship_type
      }));
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
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

  const getMission = (dojo: Dojo) => {
    if (language === "ja") return dojo.mission_ja;
    if (language === "pt") return dojo.mission_pt;
    return dojo.mission;
  };

  const getTargetAudience = (dojo: Dojo) => {
    if (language === "ja") return dojo.target_audience_ja;
    if (language === "pt") return dojo.target_audience_pt;
    return dojo.target_audience;
  };

  const getAccessInfo = (dojo: Dojo) => {
    if (language === "ja") return dojo.access_info_ja;
    if (language === "pt") return dojo.access_info_pt;
    return dojo.access_info;
  };

  const getRules = (dojo: Dojo) => {
    if (language === "ja") return dojo.rules_ja;
    if (language === "pt") return dojo.rules_pt;
    return dojo.rules;
  };

  const getSafetyMeasures = (dojo: Dojo) => {
    if (language === "ja") return dojo.safety_measures_ja;
    if (language === "pt") return dojo.safety_measures_pt;
    return dojo.safety_measures;
  };

  const getOnlineResources = (dojo: Dojo) => {
    if (language === "ja") return dojo.online_resources_ja;
    if (language === "pt") return dojo.online_resources_pt;
    return dojo.online_resources;
  };

  // Helper function to get localized value from multilingual objects
  const getLocalizedValue = (obj: any, field?: string): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    
    // If a specific field is requested, try to get that field first
    if (field && obj[field]) {
      const fieldValue = obj[field];
      if (typeof fieldValue === 'string') return fieldValue;
      // If field value is an object with localized versions
      if (typeof fieldValue === 'object') {
        if (language === "ja" && fieldValue.ja) return fieldValue.ja;
        if (language === "pt" && fieldValue.pt) return fieldValue.pt;
        if (fieldValue.en) return fieldValue.en;
      }
    }
    
    // Try language-specific properties
    if (language === "ja" && obj.ja) return obj.ja;
    if (language === "pt" && obj.pt) return obj.pt;
    if (obj.en) return obj.en;
    
    // Try name variations
    if (obj.name_ja && language === "ja") return obj.name_ja;
    if (obj.name_pt && language === "pt") return obj.name_pt;
    if (obj.name_en || obj.name) return obj.name_en || obj.name;
    
    // If obj is a primitive type wrapped in an object, return the first string value
    const values = Object.values(obj).filter(v => typeof v === 'string');
    if (values.length > 0) return values[0] as string;
    
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow pt-20 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="animate-pulse space-y-6">
              <div className="h-64 bg-muted rounded" />
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!dojo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow pt-20 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
            <p className="text-muted-foreground">
              {language === "ja" ? "道場が見つかりませんでした" : "Dojo not found"}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const homeMembers = members.filter(m => m.relationship_type === 'home');
  const trainingMembers = members.filter(m => m.relationship_type === 'training');

  const dojoName = getDojoName(dojo);
  const dojoDescription = getDojoDescription(dojo) || `${dojoName} - ブラジリアン柔術道場`;
  const pageUrl = `/dojo/${dojo.slug || dojo.id}`;

  const structuredData = generateDojoStructuredData({
    name: dojoName,
    description: dojoDescription,
    location: dojo.location,
    logo_url: dojo.logo_url,
    cover_image_url: dojo.cover_image_url,
    website: dojo.website,
    phone: dojo.phone,
    email: dojo.email,
    instagram: dojo.instagram,
    facebook: dojo.facebook,
  });

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: language === 'ja' ? 'ホーム' : 'Home', url: '/' },
    { name: language === 'ja' ? '道場' : 'Dojos', url: '/dojos' },
    { name: dojoName, url: pageUrl },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${dojoName} | JiuFlow`}
        description={dojoDescription}
        ogImage={dojo.cover_image_url || dojo.logo_url || undefined}
        canonicalUrl={pageUrl}
        structuredData={{ "@graph": [structuredData, breadcrumbData] }}
        keywords={['柔術', 'BJJ', '道場', dojoName, dojo.location || '']}
      />
      <Navigation />
      <main className="flex-grow pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          {/* Hero Section with Cover Image */}
          {dojo.cover_image_url && (
            <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-12 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
              <img
                src={dojo.cover_image_url}
                alt={language === 'ja' ? `${getDojoName(dojo)} - ブラジリアン柔術道場` : `${getDojoName(dojo)} - Brazilian Jiu-Jitsu Academy`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                      {getDojoName(dojo)}
                    </h1>
                    {dojo.location && (
                      <div className="flex items-center gap-2 text-white/90 text-lg mb-4">
                        <MapPin className="w-5 h-5" />
                        <span>{dojo.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {dojo.is_verified && (
                      <Badge variant="secondary" className="text-xs opacity-60 px-2 py-1">
                        PR
                      </Badge>
                    )}
                    {userId && (
                      <Button
                        onClick={toggleFavorite}
                        variant="secondary"
                        size="icon"
                        className="rounded-full h-12 w-12 shadow-lg"
                      >
                        <Heart 
                          className={`w-6 h-6 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : ''}`}
                        />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header for Dojos without cover */}
          {!dojo.cover_image_url && (
            <div className="mb-12 p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-6xl font-bold mb-4">{getDojoName(dojo)}</h1>
                  {dojo.location && (
                    <div className="flex items-center gap-2 text-muted-foreground text-lg">
                      <MapPin className="w-5 h-5" />
                      <span>{dojo.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {dojo.is_verified && (
                    <Badge variant="secondary" className="text-xs opacity-60 px-2 py-1">
                      PR
                    </Badge>
                  )}
                  {userId && (
                    <Button
                      onClick={toggleFavorite}
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12"
                    >
                      <Heart 
                        className={`w-6 h-6 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : ''}`}
                      />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-8">
                {getDojoDescription(dojo) && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">
                          {language === "ja" ? "道場について" : language === "pt" ? "Sobre o Dojo" : "About"}
                        </h2>
                      </div>
                      <p className="text-lg leading-relaxed whitespace-pre-line text-muted-foreground">
                        {getDojoDescription(dojo)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Mission & Philosophy */}
                {getMission(dojo) && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Target className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">
                          {language === "ja" ? "理念・ミッション" : "Mission & Philosophy"}
                        </h2>
                      </div>
                      <p className="text-lg leading-relaxed whitespace-pre-line text-muted-foreground">
                        {getMission(dojo)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Target Audience */}
                {getTargetAudience(dojo) && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">
                          {language === "ja" ? "対象者" : "Who Should Join"}
                        </h2>
                      </div>
                      <p className="text-lg leading-relaxed whitespace-pre-line text-muted-foreground">
                        {getTargetAudience(dojo)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Features */}
                {dojo.features && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">
                          {language === "ja" ? "特徴" : "Features"}
                        </h2>
                      </div>
                      {dojo.features.highlights && Array.isArray(dojo.features.highlights) && dojo.features.highlights.length > 0 ? (
                        <ul className="space-y-3">
                          {dojo.features.highlights.map((highlight: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 text-lg">
                              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                              <span className="text-muted-foreground">{getLocalizedValue(highlight)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : Array.isArray(dojo.features) && dojo.features.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {dojo.features.map((feature: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-base px-4 py-2">
                              {getLocalizedValue(feature)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Contact & Quick Info */}
              <div className="space-y-8">
                {/* Contact Information Card */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-card sticky top-24">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      {language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact"}
                    </h2>
                    <div className="space-y-3">
                      {dojo.website && (
                        <a 
                          href={dojo.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Globe className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                              {language === "ja" ? "ウェブサイト" : "Website"}
                            </div>
                            <div className="font-medium flex items-center gap-1">
                              {language === "ja" ? "公式サイト" : "Visit"}
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </a>
                      )}
                      {dojo.instagram && (
                        <a 
                          href={`https://instagram.com/${dojo.instagram}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Instagram className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Instagram</div>
                            <div className="font-medium">@{dojo.instagram}</div>
                          </div>
                        </a>
                      )}
                      {dojo.facebook && (
                        <a 
                          href={dojo.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Facebook className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Facebook</div>
                            <div className="font-medium text-sm">{language === "ja" ? "ページを見る" : "View"}</div>
                          </div>
                        </a>
                      )}
                      {dojo.phone && (
                        <a 
                          href={`tel:${dojo.phone}`} 
                          className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Phone className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                              {language === "ja" ? "電話" : "Phone"}
                            </div>
                            <div className="font-medium text-sm">{dojo.phone}</div>
                          </div>
                        </a>
                      )}
                      {dojo.email && (
                        <a 
                          href={`mailto:${dojo.email}`} 
                          className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200 hover:scale-105 hover:shadow-md group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Mail className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                              {language === "ja" ? "メール" : "Email"}
                            </div>
                            <div className="font-medium text-sm break-all">{dojo.email}</div>
                          </div>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Additional Sections in Full Width */}

            {/* Classes */}
            {dojo.classes && Array.isArray(dojo.classes) && dojo.classes.length > 0 && (
              <Card className="mb-8 border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {language === "ja" ? "クラス情報" : "Classes"}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dojo.classes.map((cls: any, idx: number) => (
                      <div key={idx} className="p-6 border rounded-xl hover:shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-br from-card to-card/50">
                        <h3 className="font-bold text-lg mb-3 text-primary">
                          {getLocalizedValue(cls, 'name')}
                        </h3>
                        {cls.time && (
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Clock className="w-4 h-4" />
                            <span>{cls.time}</span>
                          </div>
                        )}
                        {cls.level && <Badge className="mb-3">{cls.level}</Badge>}
                        {(cls.description || cls.description_en) && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {getLocalizedValue(cls, 'description')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            {dojo.pricing && Object.keys(dojo.pricing).length > 0 && (
              <Card className="mb-8 border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {language === "ja" ? "料金プラン" : "Pricing Plans"}
                    </h2>
                  </div>
                  
                  {/* Note display */}
                  {(dojo.pricing.note || dojo.pricing.note_ja) && (
                    <p className="text-muted-foreground mb-6 p-4 bg-muted/50 rounded-lg">
                      {language === "ja" && dojo.pricing.note_ja ? dojo.pricing.note_ja : dojo.pricing.note}
                    </p>
                  )}
                  
                  {/* Personal Training Plans */}
                  {dojo.pricing.personal_training && Array.isArray(dojo.pricing.personal_training) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dojo.pricing.personal_training.map((plan: any, idx: number) => (
                        <div key={idx} className="p-6 border-2 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50">
                          <h3 className="font-bold text-xl mb-4 text-primary">
                            {plan.instructor}
                          </h3>
                          {plan.price_3 && (
                            <div className="mb-2">
                              <span className="text-lg font-semibold">3{language === "ja" ? "回" : " sessions"}: </span>
                              <span className="text-2xl font-bold">¥{plan.price_3.toLocaleString()}</span>
                            </div>
                          )}
                          {plan.price_10 && (
                            <div>
                              <span className="text-lg font-semibold">10{language === "ja" ? "回" : " sessions"}: </span>
                              <span className="text-2xl font-bold">¥{plan.price_10.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Standard Plans */}
                  {dojo.pricing.plans && Array.isArray(dojo.pricing.plans) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dojo.pricing.plans.map((plan: any, idx: number) => (
                        <div key={idx} className="p-6 border-2 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50">
                          <h3 className="font-bold text-xl mb-4 text-primary">
                            {getLocalizedValue(plan, 'name')}
                          </h3>
                          <div className="text-4xl font-bold mb-4">
                            ¥{(plan.price || 0).toLocaleString()}
                            <span className="text-base text-muted-foreground font-normal">
                              {language === "ja" ? "/月" : "/month"}
                            </span>
                          </div>
                          {(plan.description || plan.description_en) && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {getLocalizedValue(plan, 'description')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schedule */}
            {dojo.schedule && Array.isArray(dojo.schedule) && dojo.schedule.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "スケジュール" : "Schedule"}
                  </h2>
                  <div className="space-y-2">
                    {dojo.schedule.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-4 p-3 border rounded">
                        <div className="font-semibold min-w-[60px]">{item.day}</div>
                        <div className="flex-1">{item.time}</div>
                        {item.class && <Badge>{item.class}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructors */}
            {dojo.instructors && Array.isArray(dojo.instructors) && dojo.instructors.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "講師紹介" : "Instructors"}
                  </h2>
                  <div className="space-y-4">
                    {dojo.instructors.map((instructor: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex gap-4">
                          {instructor.photo_url && (
                            <img src={instructor.photo_url} alt={getLocalizedValue(instructor, 'name')} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                              {getLocalizedValue(instructor, 'name')}
                            </h3>
                            {(instructor.message || instructor.message_en || instructor.bio) && (
                              <p className="text-muted-foreground text-sm whitespace-pre-line">
                                {getLocalizedValue(instructor, 'message') || instructor.bio || ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Facilities */}
            {(dojo.facilities && Object.keys(dojo.facilities).length > 0) || (dojo.opening_hours && Object.keys(dojo.opening_hours).length > 0) || getAccessInfo(dojo) ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "施設・アクセス" : "Facilities & Access"}
                  </h2>
                  {dojo.facilities && Object.keys(dojo.facilities).length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">{language === "ja" ? "設備" : "Amenities"}</h3>
                      <ul className="space-y-2">
                        {/* Equipment array display */}
                        {dojo.facilities.equipment && Array.isArray(dojo.facilities.equipment) && 
                          dojo.facilities.equipment.map((item: string, idx: number) => (
                            <li key={`equip-${idx}`} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{item}</span>
                            </li>
                          ))
                        }
                        {/* Boolean amenities display */}
                        {!dojo.facilities.equipment && Object.entries(dojo.facilities).map(([key, value]: [string, any]) => {
                          // Handle boolean values
                          if (typeof value === 'boolean' && value) {
                            const amenityNames: Record<string, { ja: string; en: string }> = {
                              changingRoom: { ja: "更衣室", en: "Changing Room" },
                              matSpace: { ja: "マットスペース", en: "Mat Space" },
                              parking: { ja: "駐車場", en: "Parking" },
                              showers: { ja: "シャワー", en: "Showers" },
                              wifi: { ja: "Wi-Fi", en: "Wi-Fi" },
                              airConditioning: { ja: "エアコン", en: "Air Conditioning" },
                            };
                            const displayText = amenityNames[key] 
                              ? (language === "ja" ? amenityNames[key].ja : amenityNames[key].en)
                              : key;
                            return (
                              <li key={key} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{displayText}</span>
                              </li>
                            );
                          }
                          // Handle string values
                          if (typeof value === 'string') {
                            return (
                              <li key={key} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{value}</span>
                              </li>
                            );
                          }
                          // Handle object values
                          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            const displayText = language === "ja" && value.description_ja 
                              ? value.description_ja 
                              : value.description || getLocalizedValue(value);
                            if (displayText) {
                              return (
                                <li key={key} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{displayText}</span>
                                </li>
                              );
                            }
                          }
                          return null;
                        })}
                      </ul>
                    </div>
                  )}
                  {dojo.opening_hours && Object.keys(dojo.opening_hours).length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">{language === "ja" ? "営業時間" : "Hours"}</h3>
                      <div className="space-y-1">
                        {Object.entries(dojo.opening_hours).map(([key, hours]: [string, any]) => {
                          // Convert key to readable label
                          const labelMap: Record<string, string> = {
                            'wellbeing_design_9f': 'Wellbeing Design (9F)',
                            'jiu_jitsu_academy_8f': 'Jiu-Jitsu Academy (8F)',
                          };
                          const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          return (
                            <div key={key} className="flex justify-between p-2 border rounded">
                              <span className="font-medium">{label}</span>
                              <span>{typeof hours === 'string' ? hours : getLocalizedValue(hours)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {getAccessInfo(dojo) && (
                    <div>
                      <h3 className="font-semibold mb-2">{language === "ja" ? "アクセス" : "Access"}</h3>
                      <p className="whitespace-pre-line">{getAccessInfo(dojo)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Trial Info */}
            {dojo.trial_info && Object.keys(dojo.trial_info).length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "体験案内" : "Trial Information"}
                  </h2>
                  <ul className="space-y-2">
                    {/* Description */}
                    {dojo.trial_info.description && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{dojo.trial_info.description}</span>
                      </li>
                    )}
                    {/* Price */}
                    {dojo.trial_info.price !== undefined && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{language === "ja" ? "料金: " : "Price: "}{dojo.trial_info.price === 0 ? (language === "ja" ? "無料" : "Free") : `¥${dojo.trial_info.price.toLocaleString()}`}</span>
                      </li>
                    )}
                    {/* Duration */}
                    {dojo.trial_info.duration && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{language === "ja" ? "所要時間: " : "Duration: "}{dojo.trial_info.duration}</span>
                      </li>
                    )}
                    {/* Requirements */}
                    {dojo.trial_info.requirements && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{dojo.trial_info.requirements}</span>
                      </li>
                    )}
                    {/* Note */}
                    {(dojo.trial_info.note || dojo.trial_info.note_ja) && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{language === "ja" && dojo.trial_info.note_ja ? dojo.trial_info.note_ja : dojo.trial_info.note}</span>
                      </li>
                    )}
                    {/* Required Items */}
                    {(dojo.trial_info.required_items || dojo.trial_info.required_items_ja) && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{language === "ja" && dojo.trial_info.required_items_ja ? dojo.trial_info.required_items_ja : dojo.trial_info.required_items}</span>
                      </li>
                    )}
                    {/* Contact Methods */}
                    {dojo.trial_info.contact_methods && Array.isArray(dojo.trial_info.contact_methods) && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{dojo.trial_info.contact_methods.join('、')}</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            {dojo.faq && Array.isArray(dojo.faq) && dojo.faq.length > 0 && (
              <Card className="mb-8 border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {language === "ja" ? "よくある質問" : "FAQ"}
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {dojo.faq.map((item: any, idx: number) => (
                      <div key={idx} className="p-6 border-l-4 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent rounded-r-xl">
                        <h3 className="font-bold text-lg mb-3 text-primary">
                          Q: {language === "ja" && item.question_ja ? item.question_ja : 
                             language === "pt" && item.question_pt ? item.question_pt : 
                             item.question_en || item.question || ''}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          A: {language === "ja" && item.answer_ja ? item.answer_ja : 
                             language === "pt" && item.answer_pt ? item.answer_pt : 
                             item.answer_en || item.answer || ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testimonials */}
            {dojo.testimonials && Array.isArray(dojo.testimonials) && dojo.testimonials.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "会員の声" : "Testimonials"}
                  </h2>
                  <div className="space-y-4">
                    {dojo.testimonials.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <p className="mb-2 italic">"{item.text}"</p>
                        <p className="text-sm text-muted-foreground">— {item.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {dojo.gallery && Array.isArray(dojo.gallery) && dojo.gallery.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "ギャラリー" : "Gallery"}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {dojo.gallery.map((item: any, idx: number) => {
                      const imageUrl = typeof item === 'string' ? item : item.url;
                      const caption = typeof item === 'string' ? '' : item.caption;
                      return (
                        <div key={idx} className="relative overflow-hidden rounded-lg group">
                          <img 
                            src={imageUrl} 
                            alt={caption || `Gallery image ${idx + 1}`} 
                            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110" 
                          />
                          {caption && (
                            <p className="text-sm text-center mt-1 text-muted-foreground">{caption}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* News */}
            {dojo.news && Array.isArray(dojo.news) && dojo.news.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "お知らせ" : "News"}
                  </h2>
                  <div className="space-y-4">
                    {dojo.news.map((item: any, idx: number) => (
                      <div key={idx} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          {item.date && <span className="text-sm text-muted-foreground">{item.date}</span>}
                        </div>
                        {item.content && <p>{item.content}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rules & Safety */}
            {(getRules(dojo) || getSafetyMeasures(dojo)) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "規約・安全対策" : "Rules & Safety"}
                  </h2>
                  {getRules(dojo) && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">{language === "ja" ? "規約" : "Rules"}</h3>
                      <p className="whitespace-pre-line">{getRules(dojo)}</p>
                    </div>
                  )}
                  {getSafetyMeasures(dojo) && (
                    <div>
                      <h3 className="font-semibold mb-2">{language === "ja" ? "安全対策" : "Safety Measures"}</h3>
                      <p className="whitespace-pre-line">{getSafetyMeasures(dojo)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Perks */}
            {dojo.perks && Array.isArray(dojo.perks) && dojo.perks.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "会員特典" : "Member Benefits"}
                  </h2>
                  <ul className="space-y-2">
                    {dojo.perks.map((perk: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Online Resources */}
            {getOnlineResources(dojo) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {language === "ja" ? "オンライン教材" : "Online Resources"}
                  </h2>
                  <p className="whitespace-pre-line">{getOnlineResources(dojo)}</p>
                </CardContent>
              </Card>
            )}

            {/* Members Section */}
            {(homeMembers.length > 0 || trainingMembers.length > 0) && (
              <Card className="mt-8 border-none shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {language === "ja" ? "メンバー" : "Members"}
                    </h2>
                  </div>

                {/* Home Members */}
                {homeMembers.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-primary">
                      {language === "ja" ? "所属" : "Home Gym"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {homeMembers.slice(0, 10).map((member) => (
                        <Link
                          key={member.id}
                          to={`/${member.username || member.id}`}
                          className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-accent transition-all duration-200 hover:scale-105 group"
                        >
                          <Avatar className="w-20 h-20 ring-2 ring-transparent group-hover:ring-primary transition-all">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-lg">
                              {member.display_name?.[0] || member.username?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-center font-medium line-clamp-2">
                            {member.display_name || member.username || "User"}
                          </span>
                        </Link>
                      ))}
                    </div>
                    {homeMembers.length > 10 && (
                      <p className="text-center text-muted-foreground mt-4 text-sm">
                        {language === "ja" ? `その他${homeMembers.length - 10}名` : `and ${homeMembers.length - 10} more`}
                      </p>
                    )}
                  </div>
                )}

                {/* Training Members */}
                {trainingMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-primary">
                      {language === "ja" ? "出稽古" : "Training Here"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {trainingMembers.slice(0, 10).map((member) => (
                        <Link
                          key={member.id}
                          to={`/${member.username || member.id}`}
                          className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-accent transition-all duration-200 hover:scale-105 group"
                        >
                          <Avatar className="w-20 h-20 ring-2 ring-transparent group-hover:ring-primary transition-all">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-lg">
                              {member.display_name?.[0] || member.username?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-center font-medium line-clamp-2">
                            {member.display_name || member.username || "User"}
                          </span>
                        </Link>
                      ))}
                    </div>
                    {trainingMembers.length > 10 && (
                      <p className="text-center text-muted-foreground mt-4 text-sm">
                        {language === "ja" ? `その他${trainingMembers.length - 10}名` : `and ${trainingMembers.length - 10} more`}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
