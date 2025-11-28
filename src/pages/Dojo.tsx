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
          {/* Cover Image */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden mb-8">
            {dojo.cover_image_url ? (
              <img
                src={dojo.cover_image_url}
                alt={getDojoName(dojo)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">
                🥋
              </div>
            )}
            {dojo.is_verified && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                {language === "ja" ? "公認道場" : "Verified"}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{getDojoName(dojo)}</h1>
            
            {dojo.location && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-5 h-5" />
                <span>{dojo.location}</span>
              </div>
            )}

            {getDojoDescription(dojo) && (
              <p className="text-lg text-muted-foreground mb-6">
                {getDojoDescription(dojo)}
              </p>
            )}

            {/* Contact Links */}
            <div className="flex flex-wrap gap-3">
              {dojo.website && (
                <a href={dojo.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Globe className="w-4 h-4" />
                    {language === "ja" ? "ウェブサイト" : "Website"}
                  </Button>
                </a>
              )}
              {dojo.instagram && (
                <a href={`https://instagram.com/${dojo.instagram}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </Button>
                </a>
              )}
              {dojo.facebook && (
                <a href={dojo.facebook} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </Button>
                </a>
              )}
              {dojo.phone && (
                <a href={`tel:${dojo.phone}`}>
                  <Button variant="outline" className="gap-2">
                    <Phone className="w-4 h-4" />
                    {dojo.phone}
                  </Button>
                </a>
              )}
              {dojo.email && (
                <a href={`mailto:${dojo.email}`}>
                  <Button variant="outline" className="gap-2">
                    <Mail className="w-4 h-4" />
                    {language === "ja" ? "メール" : "Email"}
                  </Button>
                </a>
              )}
            </div>
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
