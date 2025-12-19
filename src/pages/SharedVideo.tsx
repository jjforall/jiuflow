import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface SharedVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  video_type: string;
  view_count: number;
  created_at: string;
  user: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const SharedVideo = () => {
  const { token } = useParams<{ token: string }>();
  const [video, setVideo] = useState<SharedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedVideo();
    }
  }, [token]);

  const loadSharedVideo = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_videos')
        .select(`
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          video_type,
          view_count,
          created_at,
          user_id
        `)
        .eq('share_token', token)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('この共有リンクは無効または期限切れです');
        } else {
          throw fetchError;
        }
        return;
      }

      // Get user info
      let userInfo = null;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from('public_profiles')
          .select('display_name, username, avatar_url')
          .eq('id', data.user_id)
          .single();
        userInfo = profile;
      }

      setVideo({
        ...data,
        user: userInfo
      });

      // Increment view count
      await supabase
        .from('user_videos')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

    } catch (err) {
      console.error('Error loading shared video:', err);
      setError('動画の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const videoTypeLabel = video ? {
    match: "試合動画",
    technique: "テクニック動画",
    sparring: "スパー動画",
    other: "その他"
  }[video.video_type] || video.video_type : '';

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEOHead 
          title="動画が見つかりません"
          description="この共有リンクは無効または期限切れです"
          noindex={true}
        />
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">動画が見つかりません</h1>
              <p className="text-muted-foreground">
                {error || 'この共有リンクは無効または期限切れです'}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title={video.title}
        description={video.description || "限定公開の動画"}
        noindex={true}
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
            />
          </div>

          {/* Video Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{video.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {video.user && (
                      <span>{video.user.display_name || video.user.username || '匿名'}</span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(video.created_at), 'yyyy年M月d日', { locale: ja })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {video.view_count} 回視聴
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{videoTypeLabel}</Badge>
                  <Badge variant="outline">
                    <Lock className="h-3 w-3 mr-1" />
                    限定公開
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {video.description && (
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {video.description}
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SharedVideo;
