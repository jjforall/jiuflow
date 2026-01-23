import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Eye, EyeOff, Link2, X, Copy, ExternalLink, ChevronDown, ChevronUp, Play, FileText, Mic, ListVideo, Languages, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LocalizationBadges } from "@/components/ui/LocalizationBadges";
import { VideoPreviewDialog, type VideoPreviewTechnique } from "@/components/admin/VideoPreviewDialog";
import { TranscriptionQuickDialog } from "@/components/admin/TranscriptionQuickDialog";
import { TranslationQuickDialog } from "@/components/admin/TranslationQuickDialog";

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
  video_url: string | null;
  series_prefix: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  video_metadata: unknown;
  hasTranscription?: boolean;
  subtitleLanguages?: string[];
  dubbedLanguages?: string[];
  transcription?: Transcription | null;
}

interface Transcription {
  id: string;
  technique_id: string | null;
  language_code: string;
  original_text: string;
  edited_text: string | null;
  status: string;
  created_at: string;
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
  const [previewTechnique, setPreviewTechnique] = useState<VideoPreviewTechnique | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  
  // Transcription dialog state
  const [showTranscriptionDialog, setShowTranscriptionDialog] = useState(false);
  const [transcriptionTechnique, setTranscriptionTechnique] = useState<Technique | null>(null);
  
  // Translation dialog state
  const [showTranslationDialog, setShowTranslationDialog] = useState(false);
  const [translationTechnique, setTranslationTechnique] = useState<Technique | null>(null);
  
  // All techniques tab
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [seriesMapping, setSeriesMapping] = useState<Array<{ series_name: string; series_prefix: string }>>([]);

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
          
          const items = (itemsData || []).map((item: VideoListItem & { technique?: Partial<Technique> }) => {
            const enrichedTechnique = techniques.find(t => t.id === item.technique?.id);
            return {
              ...item,
              technique: enrichedTechnique || item.technique,
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
      .select("id, name, name_ja, series_prefix, series_order, series_name, thumbnail_url, video_url, video_url_ja, video_url_pt, video_metadata")
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
      .select("*")
      .in("technique_id", techniqueIds)
      .order("created_at", { ascending: false });

    // Fetch subtitle languages
    const { data: subtitles } = await supabase
      .from("video_subtitles")
      .select("transcription_id, language_code, video_transcriptions!inner(technique_id)")
      .eq("status", "completed");

    // Build lookup maps
    const transcriptionMap: Record<string, Transcription> = {};
    (transcriptions || []).forEach((t: Transcription) => {
      if (t.technique_id && !transcriptionMap[t.technique_id]) {
        transcriptionMap[t.technique_id] = t;
      }
    });
    
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

    // Build series mapping
    const seriesMap = new Map<string, string>();
    techniques.forEach((item: { series_name?: string; series_prefix?: string }) => {
      if (item.series_name && item.series_prefix) {
        seriesMap.set(item.series_name, item.series_prefix);
      }
    });
    
    const mappings = Array.from(seriesMap.entries())
      .map(([series_name, series_prefix]) => ({ series_name, series_prefix }))
      .sort((a, b) => a.series_prefix.localeCompare(b.series_prefix));
    
    setSeriesMapping(mappings);

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
        video_metadata: t.video_metadata,
        hasTranscription: !!transcriptionMap[t.id],
        transcription: transcriptionMap[t.id] || null,
        subtitleLanguages: subtitleMap[t.id] || [],
        dubbedLanguages,
      } as Technique;
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

  const openTranscriptionDialog = (technique: Technique) => {
    setTranscriptionTechnique(technique);
    setShowTranscriptionDialog(true);
  };

  const openTranslationDialog = (technique: Technique) => {
    setTranslationTechnique(technique);
    setShowTranslationDialog(true);
  };

  const handleRefresh = async () => {
    const techniques = await fetchTechniques();
    await fetchLists(techniques);
    toast.success("データを更新しました");
  };

  const availableTechniques = allTechniques.filter(
    (t) => !listItems.some((item) => item.technique_id === t.id)
  );

  // Filter techniques for All Videos tab
  const filteredTechniques = allTechniques.filter(tech => {
    const matchesSearch = searchQuery === "" || 
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.name_ja.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeries = seriesFilter === "all" || tech.series_prefix === seriesFilter;
    
    return matchesSearch && matchesSeries;
  });

  // Stats
  const stats = {
    totalLists: lists.length,
    totalVideos: allTechniques.length,
    withTranscription: allTechniques.filter(t => t.hasTranscription).length,
    withTranslation: allTechniques.filter(t => (t.dubbedLanguages?.length || 0) > 1).length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderVideoItem = (technique: Technique, showActions = true) => (
    <div className="flex items-center gap-3 p-2 bg-background rounded hover:bg-muted/50 group">
      {/* Thumbnail */}
      <div 
        className="relative w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          if (technique.video_url_ja || technique.video_url) {
            setPreviewTechnique({
              video_url: technique.video_url_ja || technique.video_url || '',
              video_url_ja: technique.video_url_ja ?? undefined,
              video_url_pt: technique.video_url_pt ?? undefined,
              video_metadata: technique.video_metadata as VideoPreviewTechnique['video_metadata'],
              name_ja: technique.name_ja,
              name: technique.name,
            });
            setShowVideoPreview(true);
          }
        }}
      >
        {technique.thumbnail_url ? (
          <img src={technique.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {technique.name_ja || technique.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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

      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openTranscriptionDialog(technique);
            }}
            title="字幕・文字起こし"
            className="h-8 w-8 p-0"
          >
            <FileText className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openTranslationDialog(technique);
            }}
            title="吹き替え翻訳"
            className="h-8 w-8 p-0"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ListVideo className="w-6 h-6" />
          動画管理
        </h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalLists}</div>
          <div className="text-sm text-muted-foreground">再生リスト</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalVideos}</div>
          <div className="text-sm text-muted-foreground">全動画</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.withTranscription}</div>
          <div className="text-sm text-muted-foreground">字幕あり</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.withTranslation}</div>
          <div className="text-sm text-muted-foreground">多言語対応</div>
        </Card>
      </div>

      <Tabs defaultValue="lists" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <ListVideo className="h-4 w-4" />
            再生リスト
          </TabsTrigger>
          <TabsTrigger value="all-videos" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            全動画ローカライズ
          </TabsTrigger>
        </TabsList>

        {/* Lists Tab */}
        <TabsContent value="lists" className="mt-6">
          <div className="flex justify-end mb-4">
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
                      onValueChange={(v) => setFormData({ ...formData, visibility: v as 'public' | 'unlisted' | 'private' })}
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
                                      <div key={item.id} className="flex items-center gap-2">
                                        <div className="w-6 text-center text-sm text-muted-foreground">
                                          {index + 1}
                                        </div>
                                        {item.technique && renderVideoItem(item.technique as Technique)}
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
        </TabsContent>

        {/* All Videos Tab */}
        <TabsContent value="all-videos" className="mt-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="シリーズ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのシリーズ</SelectItem>
                  {seriesMapping.map(({ series_name, series_prefix }) => (
                    <SelectItem key={series_prefix} value={series_prefix}>
                      {series_prefix}: {series_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Grid */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {filteredTechniques.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      動画がありません
                    </div>
                  ) : (
                    filteredTechniques.map((technique) => renderVideoItem(technique))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                onValueChange={(v) => setFormData({ ...formData, visibility: v as 'public' | 'unlisted' | 'private' })}
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

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={showVideoPreview}
        onOpenChange={setShowVideoPreview}
        technique={previewTechnique}
      />

      {/* Transcription Quick Dialog */}
      <TranscriptionQuickDialog
        open={showTranscriptionDialog}
        onOpenChange={setShowTranscriptionDialog}
        technique={transcriptionTechnique}
        transcription={transcriptionTechnique?.transcription}
        onTranscriptionComplete={handleRefresh}
      />

      {/* Translation Quick Dialog */}
      <TranslationQuickDialog
        open={showTranslationDialog}
        onOpenChange={setShowTranslationDialog}
        technique={translationTechnique}
        onTranslationStarted={handleRefresh}
      />
    </div>
  );
}
