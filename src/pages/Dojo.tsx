import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Instagram, Facebook, Phone, Mail, Users, ExternalLink, Heart } from "lucide-react";
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
  const { id } = useParams();
  const { language } = useLanguage();
  const [dojo, setDojo] = useState<Dojo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      loadDojo();
      loadMembers();
      checkAuth();
    }
  }, [id]);

  useEffect(() => {
    if (userId && id) {
      checkFavorite();
    }
  }, [userId, id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const checkFavorite = async () => {
    if (!userId || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_dojos')
        .select('id')
        .eq('user_id', userId)
        .eq('dojo_id', id)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!userId || !id) {
      toast.error(language === "ja" ? "ログインが必要です" : "Login required");
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorite_dojos')
          .delete()
          .eq('user_id', userId)
          .eq('dojo_id', id);

        if (error) throw error;
        
        setIsFavorite(false);
        toast.success(language === "ja" ? "お気に入りから削除しました" : "Removed from favorites");
      } else {
        const { error } = await supabase
          .from('favorite_dojos')
          .insert({ user_id: userId, dojo_id: id });

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
    try {
      const { data, error } = await supabase
        .from('dojos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDojo(data);
    } catch (error) {
      console.error('Error loading dojo:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojo");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
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
        .eq('dojo_id', id);

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
  const getLocalizedValue = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (language === "ja" && obj.ja) return obj.ja;
    if (language === "pt" && obj.pt) return obj.pt;
    if (obj.en) return obj.en;
    return String(obj);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Cover Image - Only show if exists */}
          {dojo.cover_image_url && (
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden mb-8">
              <img
                src={dojo.cover_image_url}
                alt={getDojoName(dojo)}
                className="w-full h-full object-cover"
              />
              {dojo.is_verified && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {language === "ja" ? "公認道場" : "Verified"}
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-4xl font-bold flex-1">{getDojoName(dojo)}</h1>
              <div className="flex items-center gap-3">
                {!dojo.cover_image_url && dojo.is_verified && (
                  <Badge className="text-sm">
                    {language === "ja" ? "公認道場" : "Verified"}
                  </Badge>
                )}
                {userId && (
                  <Button
                    onClick={toggleFavorite}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                  >
                    <Heart 
                      className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                )}
              </div>
            </div>
            
            {dojo.location && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{dojo.location}</span>
              </div>
            )}

            {getDojoDescription(dojo) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {language === "ja" ? "道場について" : language === "pt" ? "Sobre o Dojo" : "About"}
                  </h2>
                  <p className="text-base leading-relaxed whitespace-pre-line">
                    {getDojoDescription(dojo)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information Card */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dojo.website && (
                    <a href={dojo.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <Globe className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {language === "ja" ? "ウェブサイト" : "Website"}
                        </div>
                        <div className="font-medium flex items-center gap-1">
                          {language === "ja" ? "公式サイトを見る" : "Visit Website"}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </a>
                  )}
                  {dojo.instagram && (
                    <a href={`https://instagram.com/${dojo.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <Instagram className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Instagram</div>
                        <div className="font-medium">@{dojo.instagram}</div>
                      </div>
                    </a>
                  )}
                  {dojo.facebook && (
                    <a href={dojo.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <Facebook className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Facebook</div>
                        <div className="font-medium flex items-center gap-1">
                          {language === "ja" ? "Facebookを見る" : "View Facebook"}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </a>
                  )}
                  {dojo.phone && (
                    <a href={`tel:${dojo.phone}`} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {language === "ja" ? "電話" : "Phone"}
                        </div>
                        <div className="font-medium">{dojo.phone}</div>
                      </div>
                    </a>
                  )}
                  {dojo.email && (
                    <a href={`mailto:${dojo.email}`} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <Mail className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {language === "ja" ? "メール" : "Email"}
                        </div>
                        <div className="font-medium">{dojo.email}</div>
                      </div>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mission & Philosophy */}
            {getMission(dojo) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {language === "ja" ? "理念・ミッション" : "Mission & Philosophy"}
                  </h2>
                  <p className="text-base leading-relaxed whitespace-pre-line">{getMission(dojo)}</p>
                </CardContent>
              </Card>
            )}

            {/* Target Audience */}
            {getTargetAudience(dojo) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {language === "ja" ? "対象者" : "Who Should Join"}
                  </h2>
                  <p className="text-base leading-relaxed whitespace-pre-line">{getTargetAudience(dojo)}</p>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            {dojo.features && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "特徴" : "Features"}
                  </h2>
                  {dojo.features.highlights && Array.isArray(dojo.features.highlights) && dojo.features.highlights.length > 0 ? (
                    <ul className="space-y-2">
                      {dojo.features.highlights.map((highlight: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{getLocalizedValue(highlight)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : Array.isArray(dojo.features) && dojo.features.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dojo.features.map((feature: any, idx: number) => (
                        <Badge key={idx} variant="secondary">{getLocalizedValue(feature)}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Classes */}
            {dojo.classes && Array.isArray(dojo.classes) && dojo.classes.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "クラス情報" : "Classes"}
                  </h2>
                  <div className="space-y-3">
                    {dojo.classes.map((cls: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">
                          {getLocalizedValue(cls.name_en ? cls : cls.name || cls)}
                        </h3>
                        {cls.time && <p className="text-muted-foreground">{cls.time}</p>}
                        {cls.level && <Badge className="mt-2">{cls.level}</Badge>}
                        {(cls.description || cls.description_en) && (
                          <p className="mt-2">{getLocalizedValue(cls.description_en ? cls : cls.description || cls)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            {dojo.pricing && Object.keys(dojo.pricing).length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "料金" : "Pricing"}
                  </h2>
                  {dojo.pricing.plans && Array.isArray(dojo.pricing.plans) ? (
                    <div className="space-y-4">
                      {dojo.pricing.plans.map((plan: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">
                              {getLocalizedValue(plan.name_en ? plan : plan.name || plan)}
                            </h3>
                            <span className="text-xl font-bold">
                              ¥{(plan.price || 0).toLocaleString()}
                            </span>
                          </div>
                          {(plan.description || plan.description_en) && (
                            <p className="text-sm text-muted-foreground">
                              {getLocalizedValue(plan.description_en ? plan : plan.description || plan)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(dojo.pricing).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center p-3 border rounded">
                          <span className="font-medium">{key}</span>
                          <span className="text-lg">¥{typeof value === 'number' ? value.toLocaleString() : value}</span>
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
                            <img src={instructor.photo_url} alt={instructor.name || instructor.name_en} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                              {instructor.name_en ? getLocalizedValue(instructor) : (instructor.name || '')}
                            </h3>
                            {(instructor.message || instructor.message_en) && (
                              <p className="text-muted-foreground text-sm whitespace-pre-line">
                                {getLocalizedValue(instructor.message_en ? { en: instructor.message_en, ja: instructor.message_ja, pt: instructor.message_pt } : instructor.message || instructor.bio || '')}
                              </p>
                            )}
                            {instructor.bio && !instructor.message && !instructor.message_en && (
                              <p className="text-muted-foreground text-sm">{instructor.bio}</p>
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
                      <div className="space-y-2">
                        {Object.entries(dojo.facilities).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-start gap-2 p-2 border rounded">
                            <span className="font-medium min-w-[120px]">{key}:</span>
                            <span className="text-muted-foreground">{getLocalizedValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dojo.opening_hours && Object.keys(dojo.opening_hours).length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">{language === "ja" ? "営業時間" : "Hours"}</h3>
                      {typeof dojo.opening_hours === 'object' && dojo.opening_hours.note_en ? (
                        <p className="text-muted-foreground">{getLocalizedValue(dojo.opening_hours)}</p>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(dojo.opening_hours).map(([day, hours]: [string, any]) => (
                            <div key={day} className="flex justify-between p-2 border rounded">
                              <span>{day}</span>
                              <span>{getLocalizedValue(hours)}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                  {dojo.trial_info.description_en ? (
                    <p className="text-base leading-relaxed">{getLocalizedValue(dojo.trial_info)}</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(dojo.trial_info).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium min-w-[120px]">{key}:</span>
                          <span>{getLocalizedValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            {dojo.faq && Array.isArray(dojo.faq) && dojo.faq.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {language === "ja" ? "よくある質問" : "FAQ"}
                  </h2>
                  <div className="space-y-4">
                    {dojo.faq.map((item: any, idx: number) => (
                      <div key={idx} className="border-b pb-4 last:border-0">
                        <h3 className="font-semibold mb-2">
                          Q: {getLocalizedValue(item.question_en ? item : item.q || item.question || item)}
                        </h3>
                        <p className="text-muted-foreground">
                          A: {getLocalizedValue(item.answer_en ? { en: item.answer_en, ja: item.answer_ja, pt: item.answer_pt } : item.a || item.answer || '')}
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
                    {dojo.gallery.map((item: any, idx: number) => (
                      <div key={idx} className="relative">
                        <img src={item.url} alt={item.caption || ""} className="w-full h-48 object-cover rounded" />
                        {item.caption && <p className="text-sm text-center mt-1">{item.caption}</p>}
                      </div>
                    ))}
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
          </div>

          {/* Members Section */}
          {(homeMembers.length > 0 || trainingMembers.length > 0) && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  {language === "ja" ? "メンバー" : "Members"}
                </h2>

                {/* Home Members */}
                {homeMembers.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                      {language === "ja" ? "所属" : "Home Gym"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {homeMembers.map((member) => (
                        <Link
                          key={member.id}
                          to={`/${member.username || member.id}`}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.display_name?.[0] || member.username?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-center font-medium">
                            {member.display_name || member.username || "User"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Training Members */}
                {trainingMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      {language === "ja" ? "出稽古" : "Training Here"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {trainingMembers.map((member) => (
                        <Link
                          key={member.id}
                          to={`/${member.username || member.id}`}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.display_name?.[0] || member.username?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-center font-medium">
                            {member.display_name || member.username || "User"}
                          </span>
                        </Link>
                      ))}
                    </div>
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
