import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, Edit, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { 
  usePaginatedTechniques, 
  useUpdateTechnique, 
  useDeleteTechnique, 
  useCreateTechnique 
} from "@/hooks/usePaginatedTechniques";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

export const TechniquesManagement = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "category">("order");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "pull" as "pull" | "control" | "submission" | "guard-pass",
  });

  const { data, isLoading, error } = usePaginatedTechniques(page, pageSize, {
    search: searchQuery,
    category: categoryFilter,
    sortBy,
  });

  const updateTechnique = useUpdateTechnique();
  const deleteTechnique = useDeleteTechnique();
  const createTechnique = useCreateTechnique();

  const generateThumbnail = async (videoUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      video.addEventListener('loadeddata', () => {
        video.currentTime = 1; // Seek to 1 second
      });
      
      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          }, 'image/jpeg', 0.8);
        } catch (error: unknown) {
          reject(error);
        }
      });
      
      video.addEventListener('error', () => {
        reject(new Error('Failed to load video'));
      });
    });
  };

  const uploadThumbnail = async (thumbnailBlob: Blob, techniqueId: string): Promise<string> => {
    const filePath = `${techniqueId}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('technique-videos')
      .upload(`thumbnails/${filePath}`, thumbnailBlob, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('technique-videos')
      .getPublicUrl(`thumbnails/${filePath}`);

    return publicUrl;
  };

  const handleVideoUpload = async (file: File, techniqueId?: string) => {
    const fileName = file.name;
    const fileExt = fileName.split('.').pop();
    const filePath = techniqueId 
      ? `${techniqueId}.${fileExt}`
      : `${crypto.randomUUID()}.${fileExt}`;

    setUploadQueue(prev => [...prev, {
      fileName,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map(item => 
          item.fileName === fileName && item.status === 'uploading'
            ? { ...item, progress: Math.min(item.progress + 10, 80) }
            : item
        ));
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from('technique-videos')
        .upload(filePath, file, { upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('technique-videos')
        .getPublicUrl(filePath);

      // Generate thumbnail
      setUploadQueue(prev => prev.map(item => 
        item.fileName === fileName 
          ? { ...item, progress: 90 }
          : item
      ));

      let thumbnailUrl: string | null = null;
      try {
        const thumbnailBlob = await generateThumbnail(publicUrl);
        const tempId = techniqueId || crypto.randomUUID();
        thumbnailUrl = await uploadThumbnail(thumbnailBlob, tempId);
      } catch (error: unknown) {
        console.error('Failed to generate thumbnail:', error);
        toast.error('サムネイル生成エラー', {
          description: 'サムネイルの生成に失敗しましたが、動画はアップロードされました'
        });
      }

      setUploadQueue(prev => prev.map(item => 
        item.fileName === fileName 
          ? { ...item, progress: 100, status: 'complete' }
          : item
      ));

      return { videoUrl: publicUrl, thumbnailUrl };
    } catch (error: unknown) {
      setUploadQueue(prev => prev.map(item => 
        item.fileName === fileName 
          ? { ...item, status: 'error' }
          : item
      ));
      throw error;
    }
  };

  const handleGenerateMissingThumbnails = async () => {
    if (!data?.data) return;
    
    const techniquesWithoutThumbnails = data.data.filter(
      tech => tech.video_url && !tech.thumbnail_url
    );
    
    if (techniquesWithoutThumbnails.length === 0) {
      toast.info('すべての動画にサムネイルがあります');
      return;
    }
    
    setIsGeneratingThumbnails(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const technique of techniquesWithoutThumbnails) {
      try {
        const thumbnailBlob = await generateThumbnail(technique.video_url!);
        const thumbnailUrl = await uploadThumbnail(thumbnailBlob, technique.id);
        
        await supabase
          .from('techniques')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', technique.id);
        
        successCount++;
      } catch (error: unknown) {
        console.error(`Failed to generate thumbnail for ${technique.name}:`, error);
        failCount++;
      }
    }
    
    setIsGeneratingThumbnails(false);
    
    toast.success('サムネイル生成完了', {
      description: `成功: ${successCount}, 失敗: ${failCount}`
    });
    
    // Refresh the list
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let videoUrl = editingTechnique?.video_url;
      let thumbnailUrl = editingTechnique?.thumbnail_url;
      
      if (videoFile) {
        const result = await handleVideoUpload(videoFile, editingTechnique?.id);
        videoUrl = result.videoUrl;
        thumbnailUrl = result.thumbnailUrl;
      }

      const techniqueData = {
        ...formData,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        display_order: editingTechnique?.display_order || 0,
      };

      if (editingTechnique) {
        await updateTechnique.mutateAsync({
          ...techniqueData,
          id: editingTechnique.id,
        });
      } else {
        await createTechnique.mutateAsync(techniqueData);
      }

      resetForm();
      setShowEditDialog(false);
    } catch (error: unknown) {
      console.error('Error saving technique:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("この技術を削除してもよろしいですか？")) {
      await deleteTechnique.mutateAsync(id);
    }
  };

  const handleTranslate = async () => {
    if (!formData.name.trim()) return;
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-technique', {
        body: { 
          name: formData.name,
          description: formData.description || null 
        }
      });

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          name_ja: data.name_ja || prev.name_ja,
          name_pt: data.name_pt || prev.name_pt,
          description_ja: data.description_ja || prev.description_ja,
          description_pt: data.description_pt || prev.description_pt,
        }));
        
        toast.success("翻訳完了", {
          description: "自動翻訳が完了しました",
        });
      }
    } catch (error: unknown) {
      console.error('Translation error:', error);
      toast.error("翻訳エラー", {
        description: "翻訳中にエラーが発生しました",
      });
    } finally {
      setIsTranslating(false);
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
      category: "pull",
    });
    setVideoFile(null);
    setEditingTechnique(null);
  };

  const openEditDialog = (technique: Technique) => {
    setEditingTechnique(technique);
    setFormData({
      name: technique.name,
      name_ja: technique.name_ja,
      name_pt: technique.name_pt,
      description: technique.description || "",
      description_ja: technique.description_ja || "",
      description_pt: technique.description_pt || "",
      category: technique.category as "guard" | "sweep" | "submission" | "pass" | "position" | "escape" | "other",
    });
    setShowEditDialog(true);
  };

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        エラーが発生しました: {(error instanceof Error ? error.message : String(error))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">技術管理</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateMissingThumbnails}
            variant="outline"
            disabled={isGeneratingThumbnails}
          >
            {isGeneratingThumbnails ? 'サムネイル生成中...' : 'サムネイル一括生成'}
          </Button>
          <Button onClick={() => setShowEditDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            新規技術追加
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="技術名で検索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => {
          setCategoryFilter(value);
          setPage(1); // Reset to first page on filter change
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="カテゴリー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pull">引き込み</SelectItem>
            <SelectItem value="guard-pass">ガードパス</SelectItem>
            <SelectItem value="control">コントロール</SelectItem>
            <SelectItem value="submission">極め技</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">表示順</SelectItem>
            <SelectItem value="name">名前順</SelectItem>
            <SelectItem value="category">カテゴリー順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Techniques Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">技術名</th>
              <th className="px-4 py-3 text-left">カテゴリー</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">動画</th>
              <th className="px-4 py-3 text-right">アクション</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-20 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  技術が見つかりませんでした
                </td>
              </tr>
            ) : (
              data?.data.map((technique) => (
                <tr key={technique.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{technique.name}</p>
                      <p className="text-sm text-muted-foreground">{technique.name_ja}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {technique.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">{technique.display_order}</td>
                  <td className="px-4 py-3">
                    <VideoThumbnail
                      videoUrl={technique.video_url}
                      className="w-32 h-20"
                      showPlayButton
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(technique)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(technique.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={data.totalPages}
          pageSize={pageSize}
          totalItems={data.totalCount}
          onPageChange={setPage}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setPage(1); // Reset to first page when changing page size
          }}
        />
      )}

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 space-y-2">
          {uploadQueue.map((item, index) => (
            <div key={index} className="bg-background border rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium truncate">{item.fileName}</p>
                <span className="text-xs text-muted-foreground">
                  {item.status === 'complete' ? '完了' : 
                   item.status === 'error' ? 'エラー' : 
                   `${item.progress}%`}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    item.status === 'error' ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTechnique ? '技術編集' : '新規技術追加'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">English Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Japanese Name *</label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({...formData, name_ja: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Portuguese Name *</label>
                <Input
                  value={formData.name_pt}
                  onChange={(e) => setFormData({...formData, name_pt: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select 
                value={formData.category} 
                onValueChange={(value: any) => setFormData({...formData, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">引き込み (Pull)</SelectItem>
                  <SelectItem value="guard-pass">ガードパス (Guard Pass)</SelectItem>
                  <SelectItem value="control">コントロール (Control)</SelectItem>
                  <SelectItem value="submission">極め技 (Submission)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description (English)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">説明 (Japanese)</label>
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({...formData, description_ja: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (Portuguese)</label>
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({...formData, description_pt: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">動画ファイル</label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              {editingTechnique?.video_url && !videoFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  現在の動画はアップロード済みです
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTranslate}
                disabled={isTranslating || !formData.name}
              >
                {isTranslating ? "翻訳中..." : "自動翻訳"}
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                setShowEditDialog(false);
              }}>
                キャンセル
              </Button>
              <Button type="submit">
                {editingTechnique ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};