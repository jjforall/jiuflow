import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Globe, ArrowLeft, Calendar, ExternalLink,
  Users, MapPin, Award
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";

interface Organization {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
}

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  date_start: string;
  slug: string | null;
  location: string;
  location_ja: string | null;
  country: string;
  category: string;
}

const orgColors: Record<string, { bg: string; text: string; border: string }> = {
  'ASJJF': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  'JBJJF': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  'IBJJF': { bg: 'bg-blue-600/10', text: 'text-blue-600', border: 'border-blue-600/30' },
  'ADCC': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  'AJP': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  'SJJIF': { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
  'JJIF': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  'PBJJF': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
};

const orgDescriptions: Record<string, { ja: string; en: string }> = {
  'ASJJF': {
    ja: 'アジアスポーツ柔術連盟（ASJJF）は、アジア最大の柔術連盟です。日本、韓国、台湾、フィリピン、インドネシアなど、アジア各国で年間100以上の大会を開催しています。初心者から黒帯まで、あらゆるレベルの選手が参加できる大会を提供し、アジアにおける柔術の普及と発展に貢献しています。',
    en: 'The Asian Sport Jiu-Jitsu Federation (ASJJF) is the largest jiu-jitsu federation in Asia. They host over 100 tournaments annually across Japan, South Korea, Taiwan, Philippines, Indonesia, and other Asian countries. They provide competitions for all levels from beginners to black belts, contributing to the spread and development of jiu-jitsu in Asia.'
  },
  'IBJJF': {
    ja: '国際ブラジリアン柔術連盟（IBJJF）は、世界最大のブラジリアン柔術連盟です。世界選手権（ムンジアル）、パン選手権、ヨーロピアン選手権など、世界で最も権威ある大会を主催しています。',
    en: 'The International Brazilian Jiu-Jitsu Federation (IBJJF) is the largest Brazilian Jiu-Jitsu federation in the world. They host the most prestigious tournaments including the World Championship (Mundials), Pan Championship, and European Championship.'
  },
  'AJP': {
    ja: 'アブダビ柔術プロ（AJP）は、UAEを拠点とする世界最大級の柔術連盟です。Grand Slamツアー、Abu Dhabi World Professional Championship、各地のインターナショナル大会を開催し、プロ柔術の発展に大きく貢献しています。',
    en: 'Abu Dhabi Jiu-Jitsu Pro (AJP) is one of the largest jiu-jitsu organizations based in the UAE. They host the Grand Slam Tour, Abu Dhabi World Professional Championship, and international events worldwide, significantly contributing to the development of professional jiu-jitsu.'
  },
  'ADCC': {
    ja: 'アブダビ・コンバット・クラブ（ADCC）は、世界最高峰のノーギサブミッション・グラップリング大会を主催しています。2年に1度開催されるADCC世界選手権は、グラップリングの世界一を決める最も権威ある大会として知られています。',
    en: 'The Abu Dhabi Combat Club (ADCC) hosts the premier no-gi submission grappling competition in the world. The ADCC World Championship, held every two years, is known as the most prestigious tournament to determine the world\'s best grapplers.'
  },
  'SJJIF': {
    ja: 'スポーツ柔術国際連盟（SJJIF）は、柔術のオリンピック競技化を目指す国際連盟です。世界選手権やワールドゲームズなど、国際的な大会を開催し、柔術の世界的な普及活動を行っています。',
    en: 'The Sport Jiu-Jitsu International Federation (SJJIF) is an international federation working toward making jiu-jitsu an Olympic sport. They host the World Championship and World Games, promoting the global spread of jiu-jitsu.'
  },
  'JBJJF': {
    ja: '日本ブラジリアン柔術連盟（JBJJF）は、日本国内最大の柔術連盟です。全日本選手権、アジア選手権など国内の主要大会を主催し、IBJJFと提携して日本の柔術界を牽引しています。',
    en: 'The Japan Brazilian Jiu-Jitsu Federation (JBJJF) is the largest jiu-jitsu federation in Japan. They host major domestic tournaments including the All-Japan Championship and Asian Championship, leading the Japanese jiu-jitsu community in partnership with IBJJF.'
  }
};

const OrganizationDetailSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navigation />
    <main className="flex-1 container mx-auto px-4 py-8 pt-24">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

const OrganizationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', slug?.toUpperCase())
        .single();
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!slug,
  });

  const { data: tournaments } = useQuery({
    queryKey: ['organization-tournaments', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, name_ja, date_start, slug, location, location_ja, country, category')
        .eq('organizer', slug?.toUpperCase())
        .order('date_start', { ascending: false });
      if (error) throw error;
      return data as Tournament[];
    },
    enabled: !!slug,
  });

  const getLocale = () => {
    switch (language) {
      case 'ja': return ja;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  const getName = (org: Organization) => {
    if (language === 'ja' && org.name_ja) return org.name_ja;
    if (language === 'pt' && org.name_pt) return org.name_pt;
    return org.name;
  };

  const getTournamentName = (t: Tournament) => language === 'ja' && t.name_ja ? t.name_ja : t.name;
  const getLocation = (t: Tournament) => language === 'ja' && t.location_ja ? t.location_ja : t.location;

  const colors = orgColors[slug?.toUpperCase() || ''] || { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' };
  const description = orgDescriptions[slug?.toUpperCase() || '']?.[language === 'ja' ? 'ja' : 'en'];

  if (isLoading) return <OrganizationDetailSkeleton />;

  if (!organization) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">
              {language === 'ja' ? '団体が見つかりません' : 'Organization not found'}
            </h1>
            <Button asChild>
              <Link to="/tournaments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'ja' ? '大会一覧へ戻る' : 'Back to Tournaments'}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const upcomingTournaments = tournaments?.filter(t => new Date(t.date_start) >= new Date()) || [];
  const pastTournaments = tournaments?.filter(t => new Date(t.date_start) < new Date()) || [];

  // Calculate stats
  const totalTournaments = tournaments?.length || 0;
  const countries = [...new Set(tournaments?.map(t => t.country) || [])];
  const majorTournaments = tournaments?.filter(t => t.category === 'major' || t.category === 'international').length || 0;

  const seoTitle = language === 'ja' 
    ? `${getName(organization)} | 柔術大会団体 - JiuFlow`
    : `${getName(organization)} | BJJ Organization - JiuFlow`;
  const seoDescription = language === 'ja'
    ? `${getName(organization)}の大会情報。${totalTournaments}件の大会を開催。${description || ''}`
    : `${getName(organization)} tournament information. ${totalTournaments} tournaments hosted. ${description || ''}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription.slice(0, 160)}
        ogImage={organization.logo_url || undefined}
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-6 pt-20 sm:pt-24">
        <Button variant="ghost" asChild className="mb-4" size="sm">
          <Link to="/tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ja' ? '大会一覧へ戻る' : 'Back to Tournaments'}
          </Link>
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className={`rounded-xl p-6 sm:p-8 ${colors.bg} border ${colors.border}`}>
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-16 h-16 rounded-lg object-contain bg-white p-2" />
              ) : (
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                  <Trophy className={`h-8 w-8 ${colors.text}`} />
                </div>
              )}
              <div>
                <Badge variant="outline" className={`${colors.text} ${colors.border} mb-2`}>
                  {language === 'ja' ? '主催団体' : 'Organization'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold">{getName(organization)}</h1>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totalTournaments}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ja' ? '大会数' : 'Tournaments'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{countries.length}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ja' ? '開催国' : 'Countries'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{majorTournaments}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ja' ? '主要大会' : 'Major Events'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {(description || organization.description) && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {language === 'ja' ? '団体について' : 'About'}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description || organization.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Website */}
          {organization.website && (
            <Button asChild variant="outline" size="sm">
              <a href={organization.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-2" />
                {language === 'ja' ? '公式サイト' : 'Official Website'}
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          )}

          {/* Upcoming Tournaments */}
          {upcomingTournaments.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {language === 'ja' ? '開催予定の大会' : 'Upcoming Tournaments'}
                  <Badge variant="secondary">{upcomingTournaments.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {upcomingTournaments.map(t => (
                    <Link
                      key={t.id}
                      to={`/tournaments/${new Date(t.date_start).getFullYear()}/${t.slug}`}
                      className="block p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{getTournamentName(t)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(t.date_start), language === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy', { locale: getLocale() })}
                            {' · '}
                            {getLocation(t)}
                          </p>
                        </div>
                        {t.category === 'major' && (
                          <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                            {language === 'ja' ? '主要' : 'Major'}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Tournaments */}
          {pastTournaments.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                  <Trophy className="h-5 w-5" />
                  {language === 'ja' ? '過去の大会' : 'Past Tournaments'}
                  <Badge variant="outline">{pastTournaments.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {pastTournaments.slice(0, 10).map(t => (
                    <Link
                      key={t.id}
                      to={`/tournaments/${new Date(t.date_start).getFullYear()}/${t.slug}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{getTournamentName(t)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.date_start), language === 'ja' ? 'yyyy/M' : 'MMM yyyy', { locale: getLocale() })}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {pastTournaments.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {language === 'ja' ? `他${pastTournaments.length - 10}件` : `+${pastTournaments.length - 10} more`}
                    </p>
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

export default OrganizationDetail;
