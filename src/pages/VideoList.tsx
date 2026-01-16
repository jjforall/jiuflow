import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Lock, ListVideo, Eye } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SeriesBadge } from "@/components/ui/series-badge";

interface VideoList {
  id: string;
  name: string;
  name_ja: string | null;
  name_pt: string | null;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  cover_image_url: string | null;
  slug: string | null;
}

interface VideoListItem {
  id: string;
  technique_id: string;
  display_order: number;
  technique: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
    series_prefix: string | null;
    series_order: number | null;
    thumbnail_url: string | null;
    video_url: string | null;
    visibility: string;
  };
}

export default function VideoList() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();
  
  const [list, setList] = useState<VideoList | null>(null);
  const [items, setItems] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchList();
    }
  }, [slug]);

  const fetchList = async () => {
    setLoading(true);
    setError(null);

    // Fetch list by slug or id
    const { data: listData, error: listError } = await supabase
      .from("video_lists")
      .select("*")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .single();

    if (listError || !listData) {
      setError("リストが見つかりません");
      setLoading(false);
      return;
    }

    // Check visibility
    if (listData.visibility === 'private') {
      setError("このリストは非公開です");
      setLoading(false);
      return;
    }

    setList(listData);

    // Fetch items with technique data
    const { data: itemsData, error: itemsError } = await supabase
      .from("video_list_items")
      .select(`
        id,
        technique_id,
        display_order,
        techniques:technique_id (
          id,
          name,
          name_ja,
          name_pt,
          series_prefix,
          series_order,
          thumbnail_url,
          video_url,
          visibility
        )
      `)
      .eq("list_id", listData.id)
      .order("display_order", { ascending: true });

    if (!itemsError && itemsData) {
      const formattedItems = itemsData.map((item: any) => ({
        id: item.id,
        technique_id: item.technique_id,
        display_order: item.display_order,
        technique: item.techniques,
      }));
      setItems(formattedItems);
    }

    setLoading(false);
  };

  const getLocalizedName = (item: { name: string; name_ja: string; name_pt: string }) => {
    if (language === 'ja') return item.name_ja || item.name;
    if (language === 'pt') return item.name_pt || item.name;
    return item.name;
  };

  const getLocalizedListName = () => {
    if (!list) return "";
    if (language === 'ja') return list.name_ja || list.name;
    if (language === 'pt') return list.name_pt || list.name;
    return list.name;
  };

  const getLocalizedDescription = () => {
    if (!list) return "";
    if (language === 'ja') return list.description_ja || list.description;
    if (language === 'pt') return list.description_pt || list.description;
    return list.description;
  };

  const canViewVideo = (technique: VideoListItem['technique']) => {
    // If the list itself is unlisted, all videos in the list are viewable by anyone with the link
    if (list?.visibility === 'unlisted') return true;
    // Public or unlisted techniques are viewable
    if (technique.visibility === 'unlisted') return true;
    // Subscribers can view all
    if (subscribed) return true;
    // Sample videos are viewable by all
    return false;
  };

  // Get cover image from list or first video
  const getCoverImage = () => {
    if (list?.cover_image_url) return list.cover_image_url;
    if (items.length > 0 && items[0].technique?.thumbnail_url) {
      return items[0].technique.thumbnail_url;
    }
    return null;
  };

  const getVisibilityLabel = () => {
    if (!list) return "";
    switch (list.visibility) {
      case 'public': return "公開";
      case 'unlisted': return "限定公開";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-80 flex-shrink-0">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-8 w-48 mt-4" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
            <div className="flex-1 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || "エラーが発生しました"}</h1>
          <Button asChild>
            <Link to="/map">
              <ArrowLeft className="w-4 h-4 mr-2" />
              テクニックマップへ戻る
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const coverImage = getCoverImage();

  return (
    <>
      <SEOHead
        title={`${getLocalizedListName()} | JiuFlow`}
        description={getLocalizedDescription() || "JiuFlow動画リスト"}
      />
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          {/* Back button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/map">
              <ArrowLeft className="w-4 h-4 mr-2" />
              テクニックマップへ戻る
            </Link>
          </Button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Hero / Cover section (YouTube style) */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="sticky top-24">
                {/* Cover image with gradient overlay */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <ListVideo className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h1 className="text-xl font-bold text-white line-clamp-2">
                      {getLocalizedListName()}
                    </h1>
                  </div>
                </div>

                {/* Meta info */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListVideo className="w-4 h-4" />
                      再生リスト
                    </span>
                    <span>•</span>
                    <span>{getVisibilityLabel()}</span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {items.length}本の動画
                  </div>

                  {getLocalizedDescription() && (
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {getLocalizedDescription()}
                    </p>
                  )}

                  {/* Play all button */}
                  {items.length > 0 && (
                    <Button asChild className="w-full mt-4">
                      <Link to={`/video/${items[0].technique.id}`}>
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        すべて再生
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Video list */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">並べ替え</span>
                </div>
              </div>

              {/* Video items */}
              <div className="space-y-2">
                {items.map((item, index) => {
                  const canView = canViewVideo(item.technique);
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        canView ? 'hover:bg-muted/50' : 'opacity-60'
                      }`}
                    >
                      {/* Index number */}
                      <div className="w-6 flex-shrink-0 text-center text-sm text-muted-foreground pt-2">
                        {index + 1}
                      </div>

                      {/* Thumbnail */}
                      {canView ? (
                        <Link 
                          to={`/video/${item.technique.id}`}
                          className="relative w-40 aspect-video flex-shrink-0 rounded overflow-hidden bg-muted group"
                        >
                          {item.technique.thumbnail_url ? (
                            <img
                              src={item.technique.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                          </div>
                        </Link>
                      ) : (
                        <div className="relative w-40 aspect-video flex-shrink-0 rounded overflow-hidden bg-muted">
                          {item.technique.thumbnail_url ? (
                            <img
                              src={item.technique.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover grayscale"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Lock className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Video info */}
                      <div className="flex-1 min-w-0 py-1">
                        {canView ? (
                          <Link to={`/video/${item.technique.id}`}>
                            <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                              {getLocalizedName(item.technique)}
                            </h3>
                          </Link>
                        ) : (
                          <h3 className="font-medium line-clamp-2 text-muted-foreground">
                            {getLocalizedName(item.technique)}
                          </h3>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          {item.technique.series_prefix && (
                            <SeriesBadge 
                              prefix={item.technique.series_prefix} 
                              order={item.technique.series_order || 0}
                              className="scale-90 origin-left"
                            />
                          )}
                        </div>

                        {!canView && (
                          <p className="text-xs text-muted-foreground mt-1">
                            有料会員限定
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {items.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  このリストには動画がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
