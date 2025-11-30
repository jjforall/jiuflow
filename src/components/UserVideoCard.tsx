import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Eye, Lock } from "lucide-react";

interface UserVideoCardProps {
  video: {
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
  };
  onEdit?: (video: any) => void;
  onDelete?: (videoId: string) => void;
  onPurchase?: () => void;
  isOwner?: boolean;
  isPurchased?: boolean;
}

export function UserVideoCard({ 
  video, 
  onEdit, 
  onDelete, 
  onPurchase,
  isOwner = false,
  isPurchased = false 
}: UserVideoCardProps) {
  const videoTypeLabel = {
    match: "試合動画",
    technique: "テクニック動画",
    sparring: "スパー動画",
    other: "その他"
  }[video.video_type] || video.video_type;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video bg-muted">
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Eye className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge variant="secondary">{videoTypeLabel}</Badge>
          {!video.is_public && (
            <Badge variant="outline" className="bg-background/80">
              <Lock className="h-3 w-3 mr-1" />
              非公開
            </Badge>
          )}
          {video.price > 0 && (
            isPurchased ? (
              <Badge variant="default" className="bg-green-500/90">
                購入済み
              </Badge>
            ) : (
              <Badge variant="default" className="bg-primary/90">
                ¥{video.price.toLocaleString()}
              </Badge>
            )
          )}
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="bg-background/80">
            <Eye className="h-3 w-3 mr-1" />
            {video.view_count}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1">{video.title}</h3>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}
        {isOwner ? (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(video)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(video.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : video.price > 0 && !isPurchased && (
          <div className="pt-2">
            <Button
              className="w-full"
              onClick={onPurchase}
            >
              ¥{video.price.toLocaleString()} で購入
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
