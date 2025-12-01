import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Video, Trash2, Eye, EyeOff } from "lucide-react";

export function UserVideosManagement() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("user_videos")
        .select(`
          *,
          profiles:user_id (
            display_name,
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("動画取得エラー:", error);
      toast.error("動画の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この動画を削除しますか？")) return;

    try {
      const { error } = await supabase.from("user_videos").delete().eq("id", id);
      if (error) throw error;
      toast.success("動画を削除しました");
      fetchVideos();
    } catch (error) {
      console.error("動画削除エラー:", error);
      toast.error("動画の削除に失敗しました");
    }
  };

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("user_videos")
        .update({ is_public: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`動画を${!currentStatus ? "公開" : "非公開"}にしました`);
      fetchVideos();
    } catch (error) {
      console.error("動画公開設定エラー:", error);
      toast.error("動画の公開設定の変更に失敗しました");
    }
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          ユーザー動画管理
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>投稿者</TableHead>
              <TableHead>種類</TableHead>
              <TableHead>視聴数</TableHead>
              <TableHead>価格</TableHead>
              <TableHead>公開</TableHead>
              <TableHead>投稿日</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell className="max-w-xs truncate">{video.title}</TableCell>
                <TableCell>
                  {video.profiles?.display_name || video.profiles?.username || "不明"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{video.video_type}</Badge>
                </TableCell>
                <TableCell>{video.view_count.toLocaleString()}</TableCell>
                <TableCell>
                  {video.price ? `¥${video.price.toLocaleString()}` : "無料"}
                </TableCell>
                <TableCell>
                  {video.is_public ? (
                    <Badge variant="default">公開</Badge>
                  ) : (
                    <Badge variant="secondary">非公開</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(video.created_at), "yyyy/MM/dd", {
                    locale: ja,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVisibility(video.id, video.is_public)}
                      title={video.is_public ? "非公開にする" : "公開する"}
                    >
                      {video.is_public ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
