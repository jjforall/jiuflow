import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Lock } from "lucide-react";
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
    // Public or unlisted techniques are viewable
    if (technique.visibility === 'unlisted') return true;
    // Subscribers can view all
    if (subscribed) return true;
    // Sample videos are viewable by all
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
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

  return (
    <>
      <SEOHead
        title={`${getLocalizedListName()} | JiuFlow`}
        description={getLocalizedDescription() || "JiuFlow動画リスト"}
      />
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/map">
                <ArrowLeft className="w-4 h-4 mr-2" />
                テクニックマップへ戻る
              </Link>
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">{getLocalizedListName()}</h1>
            {getLocalizedDescription() && (
              <p className="text-muted-foreground">{getLocalizedDescription()}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {items.length}本の動画
            </p>
          </div>

          {/* Video list */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const canView = canViewVideo(item.technique);
              
              return (
                <Card 
                  key={item.id} 
                  className={`overflow-hidden transition-colors ${canView ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-75'}`}
                >
                  {canView ? (
                    <Link to={`/video/${item.technique.id}`}>
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            <div className="w-32 h-20 bg-muted">
                              {item.technique.thumbnail_url ? (
                                <img
                                  src={item.technique.thumbnail_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                          
                          <div className="flex-1 py-3 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              {item.technique.series_prefix && (
                                <SeriesBadge 
                                  prefix={item.technique.series_prefix} 
                                  order={item.technique.series_order || 0}
                                  className="scale-75 origin-left"
                                />
                              )}
                            </div>
                            <h3 className="font-medium line-clamp-2">
                              {getLocalizedName(item.technique)}
                            </h3>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  ) : (
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-32 h-20 bg-muted">
                            {item.technique.thumbnail_url ? (
                              <img
                                src={item.technique.thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover filter grayscale"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Lock className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 py-3 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            {item.technique.series_prefix && (
                              <SeriesBadge 
                                prefix={item.technique.series_prefix} 
                                order={item.technique.series_order || 0}
                                className="scale-75 origin-left"
                              />
                            )}
                          </div>
                          <h3 className="font-medium line-clamp-2 text-muted-foreground">
                            {getLocalizedName(item.technique)}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            有料会員限定
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
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
    </>
  );
}
