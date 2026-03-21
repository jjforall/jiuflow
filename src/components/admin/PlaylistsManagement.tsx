import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Eye, EyeOff, Link2, X, Copy, ExternalLink, Play, RefreshCw, Tag, ListVideo } from "lucide-react";
import { toast } from "sonner";
import { LocalizationBadges } from "@/components/ui/LocalizationBadges";
import { VideoPreviewDialog, type VideoPreviewTechnique } from "@/components/admin/VideoPreviewDialog";
import { NotationPlaylistGenerator } from "@/components/admin/NotationPlaylistGenerator";

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
  share_token: string | null;
  share_token_expires_at: string | null;
}

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  video_url: string | null;
  series_prefix: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  video_metadata: Record<string, { video_url?: string; created_at?: string }> | null;
  hasTranscription?: boolean;
  subtitleLanguages?: string[];
  dubbedLanguages?: string[];
}

interface VideoListItem {
  id: string;
  list_id: string;
  technique_id: string;
  display_order: number;
  technique?: Technique;
}

const VISIBILITY_LABELS = {
  public: { label: "公開", labelEn: "Public", icon: Eye, color: "bg-green-600" },
  unlisted: { label: "限定公開", labelEn: "Unlisted", icon: Link2, color: "bg-yellow-600" },
  private: { label: "非公開", labelEn: "Private", icon: EyeOff, color: "bg-destructive" },
};

export default function PlaylistsManagement() {
  const [lists, setLists] = useState<VideoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<VideoList | null>(null);
  const [listItems, setListItems] = useState<VideoListItem[]>([]);
  const [allTechniques, setAllTechniques] = useState<Technique[]>([]);
  const [previewTechnique, setPreviewTechnique] = useState<VideoPreviewTechnique | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showNotationGenerator, setShowNotationGenerator] = useState(false);

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
    const loadData = async () => {
      const techniques = await fetchTechniques();
      await fetchLists(techniques);
    };
    loadData();
  }, []);

  const fetchLists = async (techniquesData?: Technique[]) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_lists")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("リストの取得に失敗しました");
      console.error(error);
    } else {
      const techniques = techniquesData || allTechniques;
      const listsWithItems = await Promise.all(
        (data || []).map(async (list) => {
          const { data: itemsData, count } = await supabase
            .from("video_list_items")
            .select("*, technique:technique_id(id, name, name_ja, series_prefix, series_order, thumbnail_url, video_url, video_url_ja, video_url_pt, video_metadata)", { count: "exact" })
            .eq("list_id", list.id)
            .order("display_order", { ascending: true })
            .limit(10);
          
          const items = (itemsData || []).map((item) => {
            const enrichedTechnique = techniques.find(t => t.id === (item.technique as { id?: string })?.id);
            return {
              ...item,
              technique: enrichedTechnique || {
                ...item.technique,
                video_metadata: (item.technique as { video_metadata?: unknown })?.video_metadata as Record<string, { video_url?: string; created_at?: string }> | null,
              },
            } as VideoListItem;
          });
          
          return { ...list, item_count: count || 0, items } as VideoList;
        })
      );
      setLists(listsWithItems);
    }
    setLoading(false);
  };

  const fetchTechniques = async (): Promise<Technique[]> => {
    const { data, error } = await supabase
      .from("techniques")
      .select("id, name, name_ja, series_prefix, series_order, thumbnail_url, video_url, video_url_ja, video_url_pt, video_metadata")
      .order("series_prefix", { ascending: true })
      .order("series_order", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    const techniques = data || [];
    const techniqueIds = techniques.map(t => t.id);

    // Fetch transcriptions
    const { data: transcriptions } = await supabase
      .from("video_transcriptions")
      .select("technique_id")
      .in("technique_id", techniqueIds);

    // Fetch subtitle languages
    const { data: subtitles } = await supabase
      .from("video_subtitles")
      .select("transcription_id, language_code, video_transcriptions!inner(technique_id)")
      .eq("status", "completed");

    // Build lookup maps
    const transcriptionSet = new Set((transcriptions || []).map(t => t.technique_id));
    
    const subtitleMap: Record<string, string[]> = {};
    (subtitles || []).forEach((sub: { video_transcriptions: { technique_id: string }, language_code: string }) => {
      const techId = sub.video_transcriptions?.technique_id;
      if (techId) {
        if (!subtitleMap[techId]) subtitleMap[techId] = [];
        if (!subtitleMap[techId].includes(sub.language_code)) {
          subtitleMap[techId].push(sub.language_code);
        }
      }
    });

    // Enrich techniques with localization info
    const enrichedTechniques: Technique[] = techniques.map((t: { id: string; name: string; name_ja: string; video_url: string | null; series_prefix: string | null; series_order: number | null; thumbnail_url: string | null; video_url_ja: string | null; video_url_pt: string | null; video_metadata: unknown }) => {
      const dubbedLanguages: string[] = [];
      if (t.video_url_ja) dubbedLanguages.push("ja");
      if (t.video_url_pt) dubbedLanguages.push("pt");
      
      const metadata = t.video_metadata as Record<string, unknown> | null;
      if (metadata && typeof metadata === 'object') {
        Object.entries(metadata).forEach(([lang, data]) => {
          if ((data as { video_url?: string })?.video_url && !dubbedLanguages.includes(lang)) {
            dubbedLanguages.push(lang);
          }
        });
      }

      return {
        id: t.id,
        name: t.name,
        name_ja: t.name_ja,
        video_url: t.video_url,
        series_prefix: t.series_prefix,
        series_order: t.series_order,
        thumbnail_url: t.thumbnail_url,
        video_url_ja: t.video_url_ja,
        video_url_pt: t.video_url_pt,
        video_metadata: t.video_metadata as Record<string, { video_url?: string; created_at?: string }> | null,
        hasTranscription: transcriptionSet.has(t.id),
        subtitleLanguages: subtitleMap[t.id] || [],
        dubbedLanguages,
      };
    });

    setAllTechniques(enrichedTechniques);
    return enrichedTechniques;
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
    const slug = list.slug || list.id;
    return `https://jiuflow.art/lists/${slug}`;
  };

  const copyListUrl = (list: VideoList) => {
    navigator.clipboard.writeText(getListUrl(list));
    toast.success("URLをコピーしました");
  };

  const handleRefresh = async () => {
    const techniques = await fetchTechniques();
    await fetchLists(techniques);
    toast.success("データを更新しました");
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ListVideo className="w-6 h-6" />
          再生リスト
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                新規作成
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
                    onValueChange={(v) => setFormData({ ...formData, visibility: v as 'public' | 'unlisted' | 'private' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          公開
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          限定公開
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
      </div>

      {/* Playlist Cards */}
      <div className="grid gap-4">
        {lists.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            リストがありません。「新規作成」をクリックして最初のリストを作成してください。
          </Card>
        ) : (
          lists.map((list) => {
            const coverItem = list.items?.[0];
            
            return (
              <Card key={list.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-40 aspect-video sm:aspect-auto sm:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {list.cover_image_url || coverItem?.technique?.thumbnail_url ? (
                      <img
                        src={list.cover_image_url || coverItem?.technique?.thumbnail_url || ''}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {list.item_count && list.item_count > 0 && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {list.item_count}本
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-medium truncate">{list.name_ja || list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getVisibilityBadge(list.visibility)}
                      <span className="text-xs text-muted-foreground">
                        {list.item_count || 0}本 • {new Date(list.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openItemsDialog(list)}>
                      動画管理
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyListUrl(list)}
                        title="URLをコピー"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(getListUrl(list), '_blank')}
                        title="プレビュー"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(list)}
                        title="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(list.id)}
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

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
                onValueChange={(v) => setFormData({ ...formData, visibility: v as 'public' | 'unlisted' | 'private' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      公開
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      限定公開
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
          
          {/* Notation Generator Button */}
          <div className="flex gap-2 pb-4 border-b">
            <Button 
              variant="outline" 
              onClick={() => setShowNotationGenerator(true)}
              className="flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              略称から自動追加
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Current items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  リスト内の動画 ({listItems.length}本)
                </h4>
                <div className="border rounded-lg p-2 max-h-80 overflow-y-auto space-y-1">
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
                <div className="border rounded-lg p-2 max-h-80 overflow-y-auto space-y-1">
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {technique.series_prefix && (
                              <span className="text-xs text-muted-foreground">
                                {technique.series_prefix}-{technique.series_order}
                              </span>
                            )}
                            <LocalizationBadges
                              hasTranscription={technique.hasTranscription}
                              subtitleLanguages={technique.subtitleLanguages}
                              dubbedLanguages={technique.dubbedLanguages}
                              compact
                            />
                          </div>
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

      {/* Notation Playlist Generator */}
      {selectedList && (
        <NotationPlaylistGenerator
          open={showNotationGenerator}
          onOpenChange={setShowNotationGenerator}
          listId={selectedList.id}
          existingTechniqueIds={listItems.map(item => item.technique_id)}
          onVideosAdded={() => {
            fetchListItems(selectedList.id);
            fetchLists();
          }}
        />
      )}

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={showVideoPreview}
        onOpenChange={setShowVideoPreview}
        technique={previewTechnique}
      />
    </div>
  );
}
