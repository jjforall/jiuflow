import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Instagram, Facebook, Phone, Mail, Users, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    if (id) {
      loadDojo();
      loadMembers();
    }
  }, [id]);

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
              <h1 className="text-4xl font-bold">{getDojoName(dojo)}</h1>
              {!dojo.cover_image_url && dojo.is_verified && (
                <Badge className="text-sm">
                  {language === "ja" ? "公認道場" : "Verified"}
                </Badge>
              )}
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
                          to={`/user/${member.username || member.id}`}
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
                          to={`/user/${member.username || member.id}`}
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
