import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Building2, MapPin, Users, Globe, ArrowLeft, Calendar, 
  ExternalLink, Navigation as NavIcon, Trophy, Camera, Loader2, Upload
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja, enUS, pt } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

interface Venue {
  id: string;
  name: string;
  name_ja: string | null;
  address: string | null;
  address_ja: string | null;
  city: string | null;
  country: string;
  capacity: number | null;
  image_url: string | null;
  website: string | null;
  access_info: string | null;
  access_info_ja: string | null;
  google_maps_url: string | null;
}

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  date_start: string;
  slug: string | null;
  organizer: string;
}

const VenueDetailSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navigation />
    <main className="flex-1 container mx-auto px-4 py-8 pt-24">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="w-full h-64 rounded-xl" />
        <Skeleton className="h-10 w-3/4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

const VenueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const { error } = await supabase
        .from('venues')
        .update({ image_url: imageUrl || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue', id] });
      setImageDialogOpen(false);
      setNewImageUrl("");
      toast.success(language === 'ja' ? '画像を更新しました' : 'Image updated');
    },
    onError: () => {
      toast.error(language === 'ja' ? '更新に失敗しました' : 'Failed to update');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ja' ? '画像ファイルを選択してください' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'ja' ? 'ファイルサイズは5MB以下にしてください' : 'File size must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `venue-${id}-${Date.now()}.${fileExt}`;
      const filePath = `venues/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(filePath);

      setNewImageUrl(publicUrl);
      toast.success(language === 'ja' ? 'アップロード完了' : 'Upload complete');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(language === 'ja' ? 'アップロードに失敗しました' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { data: venue, isLoading } = useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Venue;
    },
    enabled: !!id,
  });

  const { data: tournaments } = useQuery({
    queryKey: ['venue-tournaments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, name_ja, date_start, slug, organizer')
        .eq('venue_id', id)
        .order('date_start', { ascending: false });
      if (error) throw error;
      return data as Tournament[];
    },
    enabled: !!id,
  });

  const getLocale = () => {
    switch (language) {
      case 'ja': return ja;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  const getName = (v: Venue) => language === 'ja' && v.name_ja ? v.name_ja : v.name;
  const getAddress = (v: Venue) => language === 'ja' && v.address_ja ? v.address_ja : v.address;
  const getAccessInfo = (v: Venue) => language === 'ja' && v.access_info_ja ? v.access_info_ja : v.access_info;
  const getTournamentName = (t: Tournament) => language === 'ja' && t.name_ja ? t.name_ja : t.name;

  const countryNames: Record<string, { ja: string; en: string }> = {
    'JP': { ja: '日本', en: 'Japan' },
    'US': { ja: 'アメリカ', en: 'United States' },
    'GB': { ja: 'イギリス', en: 'United Kingdom' },
    'BR': { ja: 'ブラジル', en: 'Brazil' },
    'PT': { ja: 'ポルトガル', en: 'Portugal' },
    'IT': { ja: 'イタリア', en: 'Italy' },
    'AE': { ja: 'UAE', en: 'UAE' },
    'TW': { ja: '台湾', en: 'Taiwan' },
    'CN': { ja: '中国', en: 'China' },
    'KR': { ja: '韓国', en: 'South Korea' },
  };

  if (isLoading) return <VenueDetailSkeleton />;

  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">
              {language === 'ja' ? '会場が見つかりません' : 'Venue not found'}
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

  const seoTitle = language === 'ja' 
    ? `${getName(venue)} | 会場情報 - JiuFlow`
    : `${getName(venue)} | Venue Info - JiuFlow`;
  const seoDescription = language === 'ja'
    ? `${getName(venue)}の詳細情報。住所、収容人数、アクセス情報、開催大会一覧。${venue.city ? venue.city + '、' : ''}${countryNames[venue.country]?.ja || venue.country}`
    : `${getName(venue)} venue details. Address, capacity, access info, and tournament list. ${venue.city ? venue.city + ', ' : ''}${countryNames[venue.country]?.en || venue.country}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage={venue.image_url || undefined}
        ogType="website"
        canonicalUrl={`https://jiuflow.lovableproject.com/venue/${id}`}
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
          {/* Hero Image */}
          {venue.image_url && (
            <div className="relative w-full h-48 sm:h-72 rounded-xl overflow-hidden group">
              <img 
                src={venue.image_url} 
                alt={getName(venue)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge variant="secondary" className="mb-2">
                  <Building2 className="h-3 w-3 mr-1" />
                  {language === 'ja' ? '会場' : 'Venue'}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  {getName(venue)}
                </h1>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { setNewImageUrl(venue.image_url || ""); setImageDialogOpen(true); }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                  title={language === 'ja' ? '画像を変更' : 'Change image'}
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {!venue.image_url && (
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-8 group">
              <Badge variant="secondary" className="mb-2">
                <Building2 className="h-3 w-3 mr-1" />
                {language === 'ja' ? '会場' : 'Venue'}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold">{getName(venue)}</h1>
              {isAdmin && (
                <button
                  onClick={() => { setNewImageUrl(""); setImageDialogOpen(true); }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                  title={language === 'ja' ? '画像を追加' : 'Add image'}
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'ja' ? '所在地' : 'Location'}
                    </p>
                    <p className="font-medium text-sm">
                      {venue.city && `${venue.city}, `}
                      {countryNames[venue.country]?.[language === 'ja' ? 'ja' : 'en'] || venue.country}
                    </p>
                    {getAddress(venue) && (
                      <p className="text-sm text-muted-foreground mt-1">{getAddress(venue)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacity */}
            {venue.capacity && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {language === 'ja' ? '収容人数' : 'Capacity'}
                      </p>
                      <p className="font-medium text-sm">
                        {venue.capacity.toLocaleString()}{language === 'ja' ? '人' : ' people'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Access Info */}
          {getAccessInfo(venue) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <NavIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'ja' ? 'アクセス' : 'Access'}
                    </p>
                    <p className="text-sm whitespace-pre-line">{getAccessInfo(venue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          <div className="flex gap-3 flex-wrap">
            {venue.google_maps_url && (
              <Button asChild variant="outline" size="sm">
                <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 mr-2" />
                  Google Maps
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            )}
            {venue.website && (
              <Button asChild variant="outline" size="sm">
                <a href={venue.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  {language === 'ja' ? '公式サイト' : 'Website'}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            )}
          </div>

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
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{t.organizer}</Badge>
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
                  {pastTournaments.slice(0, 5).map(t => (
                    <Link
                      key={t.id}
                      to={`/tournaments/${new Date(t.date_start).getFullYear()}/${t.slug}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{getTournamentName(t)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.date_start), language === 'ja' ? 'yyyy/M/d' : 'MMM yyyy', { locale: getLocale() })}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {pastTournaments.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {language === 'ja' ? `他${pastTournaments.length - 5}件` : `+${pastTournaments.length - 5} more`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Image Change Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ja' ? '会場画像を変更' : 'Change Venue Image'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>{language === 'ja' ? 'ファイルをアップロード' : 'Upload File'}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {language === 'ja' ? '画像を選択' : 'Select Image'}
              </Button>
            </div>

            {/* Or URL input */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {language === 'ja' ? 'または' : 'or'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ja' ? '画像URL' : 'Image URL'}</Label>
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {newImageUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={newImageUrl}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              {language === 'ja' ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button
              onClick={() => updateImageMutation.mutate(newImageUrl)}
              disabled={updateImageMutation.isPending || !newImageUrl}
            >
              {updateImageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ja' ? '保存' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueDetail;
