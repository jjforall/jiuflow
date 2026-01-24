import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, Lock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  usePaginatedTechniques, 
  useUpdateTechnique, 
  useDeleteTechnique, 
  useCreateTechnique,
  type Technique
} from "@/hooks/usePaginatedTechniques";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUpload } from "@/contexts/UploadContext";
import { VideoPreviewDialog, type VideoPreviewTechnique } from "@/components/admin/VideoPreviewDialog";
import { VideoCard } from "@/components/admin/VideoCard";

export const SpecialVideosManagement = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "category" | "created">("created");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const { startCloudflareUpload } = useUpload();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [previewTechnique, setPreviewTechnique] = useState<VideoPreviewTechnique | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [transcriptionMap, setTranscriptionMap] = useState<Record<string, { id: string; status: string }>>({});
  const [subtitleMap, setSubtitleMap] = useState<Record<string, string[]>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fetchingDurationId, setFetchingDurationId] = useState<string | null>(null);

  // Default form for new special videos - no series_prefix
  const [formData, setFormData] = useState({
    name: '',
    name_ja: '',
    name_pt: '',
    description: '',
    description_ja: '',
    description_pt: '',
    video_url: '',
    category: 'control',
    visibility: 'private' as 'public' | 'private' | 'subscribers',
  });

  const updateTechnique = useUpdateTechnique();
  const deleteTechnique = useDeleteTechnique();
  const createTechnique = useCreateTechnique();

  // Fetch special videos only (no series_prefix)
  const { data: paginatedData, isLoading, refetch } = usePaginatedTechniques(
    page,
    pageSize,
    {
      search: searchQuery,
      category: categoryFilter,
      seriesType: 'special',
      sortBy,
      sortDirection: 'desc',
    }
  );

  const techniques = paginatedData?.data || [];
  const totalPages = paginatedData?.totalPages || 1;
  const totalCount = paginatedData?.totalCount || 0;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('techniques')
        .select('category');
      
      if (!error && data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
        setAvailableCategories(uniqueCategories.sort());
      }
    };

    const fetchTranscriptions = async () => {
      const { data, error } = await supabase
        .from('video_transcriptions')
        .select('id, technique_id, status');
      
      if (!error && data) {
        const map: Record<string, { id: string; status: string }> = {};
        data.forEach(t => {
          if (t.technique_id) {
            map[t.technique_id] = { id: t.id, status: t.status };
          }
        });
        setTranscriptionMap(map);
      }
    };

    const fetchSubtitles = async () => {
      const { data: transcriptions } = await supabase
        .from('video_transcriptions')
        .select('id, technique_id');
      
      const { data: subtitles } = await supabase
        .from('video_subtitles')
        .select('transcription_id, language_code');
      
      if (transcriptions && subtitles) {
        const transMap: Record<string, string> = {};
        transcriptions.forEach(t => {
          if (t.technique_id) transMap[t.id] = t.technique_id;
        });
        
        const map: Record<string, string[]> = {};
        subtitles.forEach(s => {
          const techniqueId = transMap[s.transcription_id];
          if (techniqueId) {
            if (!map[techniqueId]) map[techniqueId] = [];
            map[techniqueId].push(s.language_code);
          }
        });
        setSubtitleMap(map);
      }
    };

    fetchCategories();
    fetchTranscriptions();
    fetchSubtitles();
  }, []);

  const getDubbedLanguages = (technique: Technique): string[] => {
    const dubbed: string[] = ['ja'];
    const metadata = technique.video_metadata as Record<string, any> | null;
    if (metadata) {
      ['en', 'pt', 'es', 'fr', 'de', 'zh', 'ko', 'it', 'ru', 'ar', 'hi'].forEach(lang => {
        if (metadata[lang]?.video_url) dubbed.push(lang);
      });
    }
    return dubbed;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この動画を削除しますか？')) return;
    await deleteTechnique.mutateAsync(id);
  };

  const openEditDialog = (technique: Technique) => {
    setEditingTechnique(technique);
    setFormData({
      name: technique.name || '',
      name_ja: technique.name_ja || '',
      name_pt: technique.name_pt || '',
      description: technique.description || '',
      description_ja: technique.description_ja || '',
      description_pt: technique.description_pt || '',
      video_url: technique.video_url || '',
      category: technique.category || 'control',
      visibility: (technique.visibility as 'public' | 'private' | 'subscribers') || 'private',
    });
    setShowEditDialog(true);
  };

  const openNewDialog = () => {
    setEditingTechnique(null);
    setFormData({
      name: '',
      name_ja: '',
      name_pt: '',
      description: '',
      description_ja: '',
      description_pt: '',
      video_url: '',
      category: 'control',
      visibility: 'private',
    });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('動画名を入力してください');
      return;
    }

    try {
      if (editingTechnique) {
        await updateTechnique.mutateAsync({
          id: editingTechnique.id,
          ...formData,
          series_prefix: null,
          series_name: null,
          series_order: null,
        });
        toast.success('特別講習を更新しました');
      } else {
        await createTechnique.mutateAsync({
          ...formData,
          series_prefix: null,
          series_name: null,
          series_order: null,
        });
        toast.success('特別講習を作成しました');
      }
      setShowEditDialog(false);
      refetch();
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    
    try {
      await startCloudflareUpload(file, editingTechnique?.id || 'new');
      toast.info('アップロードを開始しました。完了後にURLを手動で入力してください。');
    } catch (error) {
      toast.error('アップロードに失敗しました');
    }
  };

  const handleDownloadVideo = async (technique: Technique) => {
    if (!technique.video_url) return;
    
    setDownloadingId(technique.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        'get-video-download-url',
        { body: { videoUrl: technique.video_url } }
      );
      
      if (error || !data?.downloadUrl) {
        toast.error('ダウンロードURLの取得に失敗しました');
        return;
      }
      
      window.open(data.downloadUrl, '_blank');
      toast.success('ダウンロードを開始しました');
    } catch {
      toast.error('ダウンロードに失敗しました');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFetchSingleDuration = async (technique: Technique) => {
    if (!technique.video_url) return;
    
    setFetchingDurationId(technique.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        'admin-update-video-durations',
        { body: { mode: 'fetch', videoUrl: technique.video_url } }
      );
      
      if (error || !data?.duration) {
        toast.error('動画時間を取得できませんでした');
        return;
      }

      await supabase.functions.invoke(
        'admin-update-video-durations',
        { body: { durations: [{ id: technique.id, duration: Math.round(data.duration) }] } }
      );
      
      toast.success(`動画時間を取得しました: ${Math.floor(data.duration / 60)}:${String(Math.floor(data.duration % 60)).padStart(2, '0')}`);
      refetch();
    } catch {
      toast.error('動画時間の取得に失敗しました');
    } finally {
      setFetchingDurationId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-muted-foreground" />
            特別講習
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            シリーズに属さない動画を管理します（デフォルトで非公開）
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Upload className="w-4 h-4 mr-2" />
          新規追加
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">特別講習とは？</p>
            <p>これらの動画はシリーズ番号（A, B, C...）が割り当てられていない動画です。</p>
            <p>デフォルトで非公開に設定され、一般の動画一覧には表示されません。</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {availableCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">作成日</SelectItem>
            <SelectItem value="name">名前</SelectItem>
            <SelectItem value="category">カテゴリ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {totalCount}件の特別講習
      </div>

      {/* Video list */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : techniques.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            特別講習はまだありません
          </div>
        ) : (
          techniques.map((technique) => (
            <VideoCard
              key={technique.id}
              technique={technique}
              transcription={transcriptionMap[technique.id] || null}
              subtitleLanguages={subtitleMap[technique.id] || []}
              dubbedLanguages={getDubbedLanguages(technique)}
              isFetchingDuration={fetchingDurationId === technique.id}
              onEdit={() => openEditDialog(technique)}
              onPreview={() => {
                if (technique.video_url) {
                  setPreviewTechnique(technique as VideoPreviewTechnique);
                  setShowVideoPreview(true);
                }
              }}
              onTranscribe={() => {
                if (transcriptionMap[technique.id]) {
                  navigate(`/admin/transcription/${transcriptionMap[technique.id].id}`);
                } else {
                  toast.info('文字起こしは動画一覧から行ってください');
                }
              }}
              onTranslate={() => {
                toast.info('動画翻訳は動画一覧から行ってください');
              }}
              onDelete={() => handleDelete(technique.id)}
              onFetchDuration={() => handleFetchSingleDuration(technique)}
              onDownload={() => handleDownloadVideo(technique)}
              isDownloading={downloadingId === technique.id}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTechnique ? '特別講習を編集' : '新規特別講習'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">動画名 (英語)</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter video name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">動画名 (日本語)</label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  placeholder="動画名を入力"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">動画名 (ポルトガル語)</label>
              <Input
                value={formData.name_pt}
                onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                placeholder="Nome do vídeo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">カテゴリ</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">公開設定</label>
                <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v as typeof formData.visibility })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">非公開</SelectItem>
                    <SelectItem value="subscribers">サブスク限定</SelectItem>
                    <SelectItem value="public">公開</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">動画URL</label>
              <div className="flex gap-2">
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setVideoFile(file);
                        handleVideoUpload(file);
                      }
                    }}
                  />
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      アップロード
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">説明 (日本語)</label>
              <Textarea
                value={formData.description_ja}
                onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                placeholder="動画の説明..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={updateTechnique.isPending || createTechnique.isPending}>
                {(updateTechnique.isPending || createTechnique.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview */}
      {previewTechnique && (
        <VideoPreviewDialog
          open={showVideoPreview}
          onOpenChange={setShowVideoPreview}
          technique={previewTechnique}
        />
      )}
    </div>
  );
};

export default SpecialVideosManagement;
