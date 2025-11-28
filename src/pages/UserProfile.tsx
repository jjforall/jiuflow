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
}

export default function UserProfile() {
  const { userId } = useParams();
  const { language } = useLanguage();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
    };
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadUserVideos();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error("プロフィールの読み込みに失敗しました");
    }
  };

  const loadUserVideos = async () => {
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

  const handlePurchase = async (videoId: string, price: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("動画を購入するにはログインが必要です");
      return;
    }

    // TODO: Implement Stripe payment integration
    toast.info("決済機能は準備中です");
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
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-light mb-2">
                    {profile?.email?.split('@')[0] || "ユーザー"}
                  </h1>
                  <p className="text-muted-foreground">
                    <Video className="inline h-4 w-4 mr-1" />
                    {videos.length}本の動画を公開中
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  isOwner={currentUser === userId}
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
