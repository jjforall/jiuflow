import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Eye, Clock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoView {
  id: string;
  video_id: string;
  view_count: number;
  last_viewed_at: string;
  technique: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
    thumbnail_url: string | null;
    category: string;
  };
}

export const WatchHistory = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoViews, setVideoViews] = useState<VideoView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadVideoViews();
    }
  }, [user]);

  const loadVideoViews = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get video views
      const { data: viewsData, error: viewsError } = await supabase
        .from('video_views')
        .select('id, video_id, view_count, last_viewed_at')
        .eq('user_id', user.id)
        .order('last_viewed_at', { ascending: false });

      if (viewsError) throw viewsError;

      if (!viewsData || viewsData.length === 0) {
        setVideoViews([]);
        setLoading(false);
        return;
      }

      // Get unique video IDs
      const videoIds = [...new Set(viewsData.map(v => v.video_id))];

      // Fetch technique data for these video IDs
      const { data: techniquesData, error: techniquesError } = await supabase
        .from('techniques')
        .select('id, name, name_ja, name_pt, thumbnail_url, category')
        .in('id', videoIds);

      if (techniquesError) throw techniquesError;

      // Create a map of video_id to technique
      const techniqueMap = new Map(
        techniquesData?.map(t => [t.id, t]) || []
      );

      // Combine the data
      const combinedData: VideoView[] = viewsData
        .map(view => {
          const technique = techniqueMap.get(view.video_id);
          if (!technique) return null;
          return {
            ...view,
            technique
          };
        })
        .filter((item): item is VideoView => item !== null);

      setVideoViews(combinedData);
    } catch (error) {
      console.error('Error loading video views:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTechniqueName = (technique: VideoView['technique']) => {
    if (language === 'ja') return technique.name_ja;
    if (language === 'pt') return technique.name_pt;
    return technique.name;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {language === "ja" ? "視聴履歴" : "Watch History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <Skeleton className="w-32 h-20 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (videoViews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {language === "ja" ? "視聴履歴" : "Watch History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {language === "ja" 
                ? "まだ動画を視聴していません" 
                : language === "pt"
                ? "Você ainda não assistiu a nenhum vídeo"
                : "You haven't watched any videos yet"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          {language === "ja" ? "視聴履歴" : "Watch History"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {videoViews.map((view) => (
            <div
              key={view.id}
              className="flex gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/video/${view.video_id}`)}
            >
              <div className="relative w-32 h-20 rounded overflow-hidden flex-shrink-0 bg-muted">
                {view.technique.thumbnail_url ? (
                  <img
                    src={view.technique.thumbnail_url}
                    alt={getTechniqueName(view.technique)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Eye className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium mb-1 truncate">
                  {getTechniqueName(view.technique)}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {view.technique.category}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      {language === "ja" 
                        ? `${view.view_count}回視聴` 
                        : `${view.view_count} views`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(new Date(view.last_viewed_at), 'yyyy/MM/dd')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
