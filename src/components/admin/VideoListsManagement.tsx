import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Eye, EyeOff, Link2, X, Copy, ExternalLink, ChevronDown, ChevronUp, Play } from "lucide-react";
import { toast } from "sonner";

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
  display_order: number;
  created_at: string;
  updated_at: string;
  item_count?: number;
  slug: string | null;
  items?: VideoListItem[];
}

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  series_prefix: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
}

interface VideoListItem {
  id: string;
  list_id: string;
  technique_id: string;
  display_order: number;
  technique?: Technique;
}

const VISIBILITY_LABELS = {
  public: { label: "公開", labelEn: "Public", icon: Eye, color: "bg-green-500" },
  unlisted: { label: "限定公開", labelEn: "Unlisted", icon: Link2, color: "bg-yellow-500" },
  private: { label: "非公開", labelEn: "Private", icon: EyeOff, color: "bg-red-500" },
};

export default function VideoListsManagement() {
  const [lists, setLists] = useState<VideoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<VideoList | null>(null);
  const [listItems, setListItems] = useState<VideoListItem[]>([]);
  const [allTechniques, setAllTechniques] = useState<Technique[]>([]);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    visibility: "private" as 'public' | 'unlisted' | 'private',
    slug: "",
  });

  useEffect(() => {
    fetchLists();
    fetchTechniques();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_lists")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("リストの取得に失敗しました");
      console.error(error);
    } else {
      // Get items for each list (up to 10 for preview)
      const listsWithItems = await Promise.all(
        (data || []).map(async (list) => {
          const { data: itemsData, count } = await supabase
            .from("video_list_items")
            .select("*, technique:technique_id(id, name, name_ja, series_prefix, series_order, thumbnail_url)", { count: "exact" })
            .eq("list_id", list.id)
            .order("display_order", { ascending: true })
            .limit(10);
          
          const items = (itemsData || []).map((item: any) => ({
            ...item,
            technique: item.technique,
          }));
          
          return { ...list, item_count: count || 0, items };
        })
      );
      setLists(listsWithItems);
    }
    setLoading(false);
  };

  const fetchTechniques = async () => {
    const { data, error } = await supabase
      .from("techniques")
      .select("id, name, name_ja, series_prefix, series_order, thumbnail_url")
      .order("series_prefix", { ascending: true })
      .order("series_order", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setAllTechniques(data || []);
    }
  };

  const fetchListItems = async (listId: string) => {
    const { data, error } = await supabase
      .from("video_list_items")
      .select("*")
      .eq("list_id", listId)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("リストアイテムの取得に失敗しました");
      console.error(error);
      return;
    }

    // Attach technique data
    const itemsWithTechniques = (data || []).map((item) => ({
      ...item,
      technique: allTechniques.find((t) => t.id === item.technique_id),
    }));
    setListItems(itemsWithTechniques);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("リスト名を入力してください");
      return;
    }

    const { error } = await supabase.from("video_lists").insert({
      name: formData.name,
      name_ja: formData.name_ja || null,
      name_pt: formData.name_pt || null,
      description: formData.description || null,
      description_ja: formData.description_ja || null,
      description_pt: formData.description_pt || null,
      visibility: formData.visibility,
      display_order: lists.length,
    });

    if (error) {
      toast.error("リストの作成に失敗しました");
      console.error(error);
    } else {
      toast.success("リストを作成しました");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchLists();
    }
  };

  const handleUpdate = async () => {
    if (!selectedList) return;

    const { error } = await supabase
      .from("video_lists")
      .update({
        name: formData.name,
        name_ja: formData.name_ja || null,
        name_pt: formData.name_pt || null,
        description: formData.description || null,
        description_ja: formData.description_ja || null,
        description_pt: formData.description_pt || null,
        visibility: formData.visibility,
      })
      .eq("id", selectedList.id);

    if (error) {
      toast.error("リストの更新に失敗しました");
      console.error(error);
    } else {
      toast.success("リストを更新しました");
      setIsEditDialogOpen(false);
      setSelectedList(null);
      resetForm();
      fetchLists();
    }
  };

  const handleDelete = async (listId: string) => {
    if (!confirm("このリストを削除しますか？リスト内の動画は削除されません。")) return;

    const { error } = await supabase.from("video_lists").delete().eq("id", listId);

    if (error) {
      toast.error("リストの削除に失敗しました");
      console.error(error);
    } else {
      toast.success("リストを削除しました");
      fetchLists();
    }
  };

  const handleAddItem = async (techniqueId: string) => {
    if (!selectedList) return;

    const { error } = await supabase.from("video_list_items").insert({
      list_id: selectedList.id,
      technique_id: techniqueId,
      display_order: listItems.length,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("この動画は既にリストに追加されています");
      } else {
        toast.error("動画の追加に失敗しました");
        console.error(error);
      }
    } else {
      toast.success("動画を追加しました");
      fetchListItems(selectedList.id);
      fetchLists();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedList) return;

    const { error } = await supabase.from("video_list_items").delete().eq("id", itemId);

    if (error) {
      toast.error("動画の削除に失敗しました");
      console.error(error);
    } else {
      toast.success("動画を削除しました");
      fetchListItems(selectedList.id);
      fetchLists();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ja: "",
      name_pt: "",
      description: "",
      description_ja: "",
      description_pt: "",
      visibility: "private",
      slug: "",
    });
  };

  const openEditDialog = (list: VideoList) => {
    setSelectedList(list);
    setFormData({
      name: list.name,
      name_ja: list.name_ja || "",
      name_pt: list.name_pt || "",
      description: list.description || "",
      description_ja: list.description_ja || "",
      description_pt: list.description_pt || "",
      visibility: list.visibility,
      slug: list.slug || "",
    });
    setIsEditDialogOpen(true);
  };

  const openItemsDialog = async (list: VideoList) => {
    setSelectedList(list);
    await fetchListItems(list.id);
    setIsItemsDialogOpen(true);
  };

  const getVisibilityBadge = (visibility: 'public' | 'unlisted' | 'private') => {
    const config = VISIBILITY_LABELS[visibility];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getListUrl = (list: VideoList) => {
    const baseUrl = window.location.origin;
    const slug = list.slug || list.id;
    return `${baseUrl}/lists/${slug}`;
  };

  const copyListUrl = (list: VideoList) => {
    navigator.clipboard.writeText(getListUrl(list));
    toast.success("URLをコピーしました");
  };

  const toggleExpanded = (listId: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const availableTechniques = allTechniques.filter(
    (t) => !listItems.some((item) => item.technique_id === t.id)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">動画リスト管理</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              新規リスト作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新規リスト作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">リスト名 (EN)</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="List name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">リスト名 (日本語)</label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  placeholder="リスト名"
                />
              </div>
              <div>
                <label className="text-sm font-medium">説明</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="リストの説明"
                />
              </div>
              <div>
                <label className="text-sm font-medium">公開設定</label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => setFormData({ ...formData, visibility: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        公開（有料会員向け）
                      </div>
                    </SelectItem>
                    <SelectItem value="unlisted">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        限定公開（URLを知っている人のみ）
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        非公開
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* YouTube Studio style list view */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>動画</TableHead>
                <TableHead>公開設定</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>動画数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    リストがありません
                  </TableCell>
                </TableRow>
              ) : (
                lists.map((list) => {
                  const isExpanded = expandedLists.has(list.id);
                  const coverItem = list.items?.[0];
                  
                  return (
                    <>
                      <TableRow key={list.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(list.id)}
                            disabled={!list.items?.length}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {/* Cover image / first video thumbnail */}
                            <div className="relative w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                              {list.cover_image_url || coverItem?.technique?.thumbnail_url ? (
                                <img
                                  src={list.cover_image_url || coverItem?.technique?.thumbnail_url || ''}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              {list.item_count && list.item_count > 0 && (
                                <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1.5 py-0.5">
                                  {list.item_count}本
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{list.name_ja || list.name}</div>
                              {list.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {list.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getVisibilityBadge(list.visibility)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(list.created_at).toLocaleDateString("ja-JP")}
                          </div>
                          <div className="text-xs text-muted-foreground">作成日</div>
                        </TableCell>
                        <TableCell>{list.item_count || 0}本</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyListUrl(list)}
                              title="URLをコピー"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getListUrl(list), '_blank')}
                              title="プレビュー"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openItemsDialog(list)}
                            >
                              動画管理
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(list)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(list.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded video items */}
                      {isExpanded && list.items && list.items.length > 0 && (
                        <TableRow key={`${list.id}-items`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <div className="text-sm font-medium mb-3 text-muted-foreground">
                                再生リストの動画
                              </div>
                              <div className="space-y-2">
                                {list.items.map((item, index) => (
                                  <div 
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-background rounded hover:bg-muted/50"
                                  >
                                    <div className="w-6 text-center text-sm text-muted-foreground">
                                      {index + 1}
                                    </div>
                                    <div className="relative w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                                      {item.technique?.thumbnail_url ? (
                                        <img
                                          src={item.technique.thumbnail_url}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Play className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">
                                        {item.technique?.name_ja || item.technique?.name || '動画'}
                                      </div>
                                      {item.technique?.series_prefix && (
                                        <div className="text-xs text-muted-foreground">
                                          {item.technique.series_prefix}-{item.technique.series_order}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {list.item_count && list.item_count > 10 && (
                                  <div className="text-center py-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openItemsDialog(list)}
                                    >
                                      他{list.item_count - 10}件を表示
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>リスト編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">リスト名 (EN)</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">リスト名 (日本語)</label>
              <Input
                value={formData.name_ja}
                onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">公開設定</label>
              <Select
                value={formData.visibility}
                onValueChange={(v) => setFormData({ ...formData, visibility: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      公開（有料会員向け）
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      限定公開（URLを知っている人のみ）
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      非公開
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* URL copy section */}
            {selectedList && (
              <div className="pt-2 border-t">
                <label className="text-sm font-medium">共有URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={getListUrl(selectedList)}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyListUrl(selectedList)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <Button onClick={handleUpdate} className="w-full">
              更新
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Management Dialog */}
      <Dialog open={isItemsDialogOpen} onOpenChange={setIsItemsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedList?.name_ja || selectedList?.name} の動画管理
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  リスト内の動画 ({listItems.length}本)
                </h4>
                <div className="border rounded-lg p-2 max-h-96 overflow-y-auto space-y-1">
                  {listItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">
                      動画がありません
                    </p>
                  ) : (
                    listItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded group"
                      >
                        <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                        <div className="w-16 h-9 bg-muted rounded overflow-hidden flex-shrink-0">
                          {item.technique?.thumbnail_url ? (
                            <img
                              src={item.technique.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="flex-1 text-sm truncate">
                          {item.technique?.name_ja || item.technique?.name || "動画"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Available items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  追加可能な動画 ({availableTechniques.length}本)
                </h4>
                <div className="border rounded-lg p-2 max-h-96 overflow-y-auto space-y-1">
                  {availableTechniques.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">
                      追加可能な動画がありません
                    </p>
                  ) : (
                    availableTechniques.map((technique) => (
                      <div
                        key={technique.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer group"
                        onClick={() => handleAddItem(technique.id)}
                      >
                        <div className="w-16 h-9 bg-muted rounded overflow-hidden flex-shrink-0">
                          {technique.thumbnail_url ? (
                            <img
                              src={technique.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">
                            {technique.name_ja || technique.name}
                          </span>
                          {technique.series_prefix && (
                            <span className="text-xs text-muted-foreground">
                              {technique.series_prefix}-{technique.series_order}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
