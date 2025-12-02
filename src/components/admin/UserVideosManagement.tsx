import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Video, Trash2, Eye, EyeOff, Search, BarChart3, ChevronDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function UserVideosManagement() {
  const [videos, setVideos] = useState<any[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, searchQuery, filterType, filterVisibility]);

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
      setFilteredVideos(data || []);
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

  const filterVideos = () => {
    let filtered = [...videos];

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter((video) => {
        const title = video.title?.toLowerCase() || "";
        const username = video.profiles?.username?.toLowerCase() || "";
        const displayName = video.profiles?.display_name?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return title.includes(query) || username.includes(query) || displayName.includes(query);
      });
    }

    // タイプフィルター
    if (filterType !== "all") {
      filtered = filtered.filter((video) => video.video_type === filterType);
    }

    // 公開/非公開フィルター
    if (filterVisibility === "public") {
      filtered = filtered.filter((video) => video.is_public);
    } else if (filterVisibility === "private") {
      filtered = filtered.filter((video) => !video.is_public);
    }

    setFilteredVideos(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVideos = filteredVideos.slice(startIndex, endIndex);

  const totalViews = videos.reduce((sum, video) => sum + (video.view_count || 0), 0);
  const publicVideos = videos.filter((v) => v.is_public).length;
  const privateVideos = videos.filter((v) => !v.is_public).length;

  const videoTypes = Array.from(new Set(videos.map((v) => v.video_type)));

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">総動画数</p>
                <p className="text-2xl font-bold">{videos.length}</p>
              </div>
              <Video className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">総視聴数</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">公開動画</p>
                <p className="text-2xl font-bold">{publicVideos}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">非公開動画</p>
                <p className="text-2xl font-bold">{privateVideos}</p>
              </div>
              <EyeOff className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            ユーザー動画管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* フィルター */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="タイトル、投稿者で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="種類で絞り込み" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">すべての種類</SelectItem>
                {videoTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterVisibility} onValueChange={setFilterVisibility}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="公開状態で絞り込み" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="public">公開のみ</SelectItem>
                <SelectItem value="private">非公開のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {currentVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterType !== "all" || filterVisibility !== "all"
                  ? "条件に一致する動画が見つかりませんでした"
                  : "まだ動画がありません"}
              </p>
            </div>
          ) : (
            <>
              {/* PC用テーブル表示 */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>タイトル</TableHead>
                      <TableHead className="w-[100px]">投稿者</TableHead>
                      <TableHead className="w-[100px]">視聴数</TableHead>
                      <TableHead className="w-[80px]">状態</TableHead>
                      <TableHead className="w-[100px]">投稿日</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentVideos.map((video) => (
                      <Collapsible key={video.id} open={expandedRows.has(video.id)} onOpenChange={() => toggleRow(video.id)}>
                        <TableRow className="group">
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(video.id) ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {video.thumbnail_url ? (
                                <img
                                  src={video.thumbnail_url}
                                  alt={video.title}
                                  className="w-12 h-9 object-cover rounded flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-9 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                  <Video className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium truncate">{video.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {video.video_type}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {video.profiles?.display_name || video.profiles?.username || "不明"}
                          </TableCell>
                          <TableCell className="text-sm">{video.view_count.toLocaleString()}</TableCell>
                          <TableCell>
                            {video.is_public ? (
                              <Badge variant="default" className="text-xs">公開</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">非公開</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(video.created_at), "MM/dd", { locale: ja })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(video.id, video.is_public);
                                }}
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
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(video.id);
                                }}
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50 p-4">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="font-medium">説明：</span>
                                    <p className="text-muted-foreground mt-1">
                                      {video.description || "説明なし"}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-medium">価格：</span>
                                      <span className="text-muted-foreground ml-2">
                                        {video.price ? `¥${video.price.toLocaleString()}` : "無料"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">作成日：</span>
                                      <span className="text-muted-foreground ml-2">
                                        {format(new Date(video.created_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">更新日：</span>
                                      <span className="text-muted-foreground ml-2">
                                        {format(new Date(video.updated_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* スマホ用カード表示 */}
              <div className="md:hidden space-y-4">
                {currentVideos.map((video) => (
                  <Card key={video.id}>
                    <CardContent className="p-4">
                      <Collapsible open={expandedRows.has(video.id)} onOpenChange={() => toggleRow(video.id)}>
                        <div className="space-y-3">
                          {/* サムネイルとタイトル */}
                          <div className="flex gap-3">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-24 h-18 object-cover rounded flex-shrink-0"
                              />
                            ) : (
                              <div className="w-24 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                <Video className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium line-clamp-2 mb-1">{video.title}</h3>
                              <Badge variant="outline" className="text-xs mb-1">
                                {video.video_type}
                              </Badge>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{video.profiles?.display_name || video.profiles?.username || "不明"}</span>
                              </div>
                            </div>
                          </div>

                          {/* 情報とアクション */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                <span>{video.view_count.toLocaleString()}</span>
                              </div>
                              {video.is_public ? (
                                <Badge variant="default" className="text-xs">公開</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">非公開</Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleVisibility(video.id, video.is_public)}
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
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(video.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(video.id) ? "rotate-180" : ""}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          {/* 詳細情報（折りたたみ） */}
                          <CollapsibleContent className="space-y-2 pt-3 border-t">
                            <div>
                              <span className="text-sm font-medium">説明：</span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {video.description || "説明なし"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium">価格：</span>
                                <span className="text-muted-foreground ml-1">
                                  {video.price ? `¥${video.price.toLocaleString()}` : "無料"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">投稿日：</span>
                                <span className="text-muted-foreground ml-1">
                                  {format(new Date(video.created_at), "MM/dd", { locale: ja })}
                                </span>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredVideos.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredVideos.length)}件を表示
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
