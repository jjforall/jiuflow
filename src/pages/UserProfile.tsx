import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { UserVideoCard } from "@/components/UserVideoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Video } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { EventCard } from "@/components/EventCard";

interface UserVideo {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  video_url: string;
  thumbnail_url: string | null;
  view_count: number;
  price: number;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

interface Profile {
  email: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function UserProfile() {
  const { userId: userIdOrUsername } = useParams();
  const { language } = useLanguage();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [purchasedVideos, setPurchasedVideos] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<any[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      
      if (user?.id) {
        // Load purchased videos
        const { data: purchases } = await supabase
          .from('video_purchases')
          .select('video_id')
          .eq('buyer_id', user.id);
        
        if (purchases) {
          setPurchasedVideos(new Set(purchases.map(p => p.video_id)));
        }
      }
    };
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (userIdOrUsername) {
      resolveUserAndLoadData();
    }
  }, [userIdOrUsername]);

  const resolveUserAndLoadData = async () => {
    if (!userIdOrUsername) return;

    try {
      // Try to resolve as username first
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, username')
        .eq('username', userIdOrUsername)
        .maybeSingle();

      let resolvedUserId: string;
      
      if (profileByUsername) {
        resolvedUserId = profileByUsername.id;
        setProfile(profileByUsername);
      } else {
        // Fall back to UUID
        resolvedUserId = userIdOrUsername;
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, email, display_name, bio, avatar_url, username')
          .eq('id', userIdOrUsername)
          .single();
        
        if (profileById) {
          setProfile(profileById);
        }
      }
      
      setActualUserId(resolvedUserId);
      await Promise.all([
        loadUserVideos(resolvedUserId),
        loadUserEvents(resolvedUserId)
      ]);
    } catch (error) {
      console.error('Error resolving user:', error);
      toast.error("プロフィールの読み込みに失敗しました");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("動画を購入しました！");
      window.history.replaceState({}, '', window.location.pathname);
      
      // Reload purchased videos
      const checkCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: purchases } = await supabase
            .from('video_purchases')
            .select('video_id')
            .eq('buyer_id', user.id);
          
          if (purchases) {
            setPurchasedVideos(new Set(purchases.map(p => p.video_id)));
          }
        }
      };
      checkCurrentUser();
    }
  }, []);

  const loadUserProfile = async () => {
    // This function is no longer needed as profile is loaded in resolveUserAndLoadData
  };

  const loadUserVideos = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserEvents = async (userId: string) => {
    if (!userId) return;

    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', userId)
        .eq('is_public', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(eventsData || []);

      // Load user's registrations
      if (currentUser) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', currentUser);

        if (registrations) {
          setRegisteredEvents(new Set(registrations.map(r => r.event_id)));
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleRegisterEvent = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(language === "ja" ? "イベントに参加するにはログインが必要です" : "Login required to register");
      return;
    }

    try {
      // Get event details
      const { data: event } = await supabase
        .from('events')
        .select('price, title')
        .eq('id', eventId)
        .single();

      if (!event) {
        toast.error(language === "ja" ? "イベントが見つかりません" : "Event not found");
        return;
      }

      if (event.price > 0) {
        // TODO: Implement payment flow
        toast.info(language === "ja" ? "支払い機能は近日公開予定です" : "Payment coming soon");
      } else {
        // Free event, register directly
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            user_id: user.id,
            payment_status: 'completed'
          });

        if (error) throw error;

        toast.success(language === "ja" ? "登録しました！" : "Registered successfully!");
        if (actualUserId) {
          loadUserEvents(actualUserId);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error?.code === '23505') {
        toast.error(language === "ja" ? "既に登録済みです" : "Already registered");
      } else {
        toast.error(language === "ja" ? "登録に失敗しました" : "Registration failed");
      }
    }
  };

  const handlePurchase = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("動画を購入するにはログインが必要です");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-video-purchase', {
        body: { videoId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error("購入処理に失敗しました");
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* User Profile Header */}
          <Card className="mb-12 animate-fade-up">
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-light mb-2">
                    {profile?.display_name || profile?.email?.split('@')[0] || "ユーザー"}
                  </h1>
                  {profile?.bio && (
                    <p className="text-muted-foreground mb-2">
                      {profile.bio}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <Video className="inline h-4 w-4 mr-1" />
                    {videos.length}本の動画を公開中
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Section */}
          {events.length > 0 && (
            <div className="mb-12 animate-fade-up">
              <h2 className="text-3xl font-light mb-6">
                {language === "ja" ? "開催予定のイベント" : "Upcoming Events"}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onRegister={handleRegisterEvent}
                    isRegistered={registeredEvents.has(event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Videos Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-light mb-6">
              {language === "ja" ? "動画" : "Videos"}
            </h2>
          </div>

          {/* Videos Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4 border border-border rounded-lg p-6 animate-pulse">
                  <div className="aspect-video bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-light mb-2">まだ動画がありません</h3>
                <p className="text-muted-foreground">
                  このユーザーはまだ公開動画を投稿していません
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
              {videos.map((video) => (
                <UserVideoCard
                  key={video.id}
                  video={video}
                  isOwner={currentUser === actualUserId}
                  isPurchased={purchasedVideos.has(video.id)}
                  onPurchase={() => handlePurchase(video.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
