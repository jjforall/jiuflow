import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, Search, Check, X, Languages, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { Progress } from "@/components/ui/progress";
import { 
  usePaginatedTechniques, 
  useUpdateTechnique, 
  useDeleteTechnique, 
  useCreateTechnique 
} from "@/hooks/usePaginatedTechniques";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

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
  video_url_ja: string | null;
  video_url_pt: string | null;
  thumbnail_url: string | null;
  thumbnail_url_ja: string | null;
  thumbnail_url_pt: string | null;
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  created_at?: string;
  updated_at?: string;
  video_metadata?: Record<string, {
    created_at: string;
    updated_at: string;
    video_url?: string;
  }>;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}

export const TechniquesManagement = () => {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
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
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [hashtagEditValue, setHashtagEditValue] = useState<string>("");
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translatingTechnique, setTranslatingTechnique] = useState<Technique | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<"en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi">("en");
  const [translationProjectId, setTranslationProjectId] = useState<string | null>(null);
  const [translationStatus, setTranslationStatus] = useState<{
    status: string | null;
    progress: number;
    startTime: number | null;
  }>({
    status: null,
    progress: 0,
    startTime: null,
  });
  
  // 進行中の翻訳を追跡
  const [activeTranslations, setActiveTranslations] = useState<Array<{
    projectId: string;
    techniqueId: string;
    techniqueName: string;
    targetLang: string;
    startTime: number;
  }>>([]);


  // すべての言語（カウント用）
  const allLanguages = [
    { code: "ja", name: "日本語", nativeName: "Japanese" },
    { code: "en", name: "English", nativeName: "英語" },
    { code: "pt", name: "Português", nativeName: "ポルトガル語" },
    { code: "es", name: "Español", nativeName: "スペイン語" },
    { code: "fr", name: "Français", nativeName: "フランス語" },
    { code: "de", name: "Deutsch", nativeName: "ドイツ語" },
    { code: "zh", name: "中文", nativeName: "中国語" },
    { code: "ko", name: "한국어", nativeName: "韓国語" },
    { code: "it", name: "Italiano", nativeName: "イタリア語" },
    { code: "ru", name: "Русский", nativeName: "ロシア語" },
    { code: "ar", name: "العربية", nativeName: "アラビア語" },
    { code: "hi", name: "हिन्दी", nativeName: "ヒンディー語" },
  ];

  // LocalStorageから進行中の翻訳を復元
  useEffect(() => {
    const stored = localStorage.getItem('activeTranslations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setActiveTranslations(parsed);
      } catch (e) {
        console.error('Failed to parse stored translations:', e);
      }
    }
  }, []);

  // 進行中の翻訳をLocalStorageに保存
  useEffect(() => {
    if (activeTranslations.length > 0) {
      localStorage.setItem('activeTranslations', JSON.stringify(activeTranslations));
    } else {
      localStorage.removeItem('activeTranslations');
    }
  }, [activeTranslations]);

  // 定期的に翻訳ステータスをチェック
  useEffect(() => {
    if (activeTranslations.length === 0) return;

    const checkAllTranslations = async () => {
      for (const translation of activeTranslations) {
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-translation-status', {
            body: { projectId: translation.projectId }
          });

          if (statusError) {
            console.error('Translation status check error:', statusError);
            continue;
          }

          if (statusData?.status === 'completed' && statusData?.videoUrl) {
            // 翻訳完了 - DBから最新のtechniqueを取得
            const { data: techniqueData, error: fetchError } = await supabase
              .from('techniques')
              .select('*')
              .eq('id', translation.techniqueId)
              .single();

            if (fetchError || !techniqueData) {
              console.error('Failed to fetch technique:', fetchError);
              continue;
            }

            const currentMetadata = (techniqueData.video_metadata as Record<string, any>) || {};
            const updatedMetadata = {
              ...currentMetadata,
              [translation.targetLang]: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                video_url: statusData.videoUrl,
              }
            };

            await supabase
              .from('techniques')
              .update({ video_metadata: updatedMetadata })
              .eq('id', translation.techniqueId);

            // 通知
            toast.success("動画翻訳完了", {
              description: `「${translation.techniqueName}」の${allLanguages.find(l => l.code === translation.targetLang)?.nativeName}版が完了しました`,
            });

            // activeTranslationsから削除
            setActiveTranslations(prev => 
              prev.filter(t => t.projectId !== translation.projectId)
            );
          } else if (statusData?.status === 'failed') {
            toast.error("動画翻訳失敗", {
              description: `「${translation.techniqueName}」の翻訳処理に失敗しました`,
            });

            setActiveTranslations(prev => 
              prev.filter(t => t.projectId !== translation.projectId)
            );
          }
        } catch (error) {
          console.error('Error checking translation:', error);
        }
      }
    };

    // 初回チェック
    checkAllTranslations();

    // 30秒ごとにチェック
    const interval = setInterval(checkAllTranslations, 30000);

    return () => clearInterval(interval);
  }, [activeTranslations, allLanguages]);


  // 翻訳対象の言語（日本語を除外）
  const translationLanguages = allLanguages.filter(lang => lang.code !== 'ja');

  // 翻訳数を数える関数（video_metadataに保存された翻訳のみカウント）
  const getTranslationCount = (technique: Technique): number => {
    if (!technique.video_metadata) return 0;
    
    let count = 0;
    allLanguages.forEach(lang => {
      if ((technique.video_metadata as any)?.[lang.code]?.video_url) {
        count++;
      }
    });
    
    return count;
  };

  // 利用可能な翻訳言語のリストを取得（全言語）
  const getAvailableTranslations = (technique: Technique): Array<{ code: string; name: string; url: string; isOriginal: boolean }> => {
    const translations: Array<{ code: string; name: string; url: string; isOriginal: boolean }> = [];
    
    allLanguages.forEach(lang => {
      // video_metadataから取得
      const metadata = (technique.video_metadata as any)?.[lang.code];
      if (metadata?.video_url) {
        translations.push({
          code: lang.code,
          name: lang.nativeName,
          url: metadata.video_url,
          isOriginal: lang.code === 'ja'
        });
      }
      // 日本語の場合、従来のフィールドもチェック
      else if (lang.code === 'ja' && (technique.video_url_ja || technique.video_url)) {
        translations.push({
          code: lang.code,
          name: lang.nativeName,
          url: technique.video_url_ja || technique.video_url!,
          isOriginal: true
        });
      }
    });
    
    return translations;
  };

  // 言語に応じた動画URLを取得する関数
  const getVideoUrlForLanguage = (technique: Technique, lang: string): string | null => {
    // まずvideo_metadataをチェック
    if (technique.video_metadata) {
      const metadata = (technique.video_metadata as any)[lang];
      if (metadata?.video_url) {
        return metadata.video_url;
      }
    }
    
    // 従来のフィールドをチェック
    if (lang === 'en' && technique.video_url) return technique.video_url;
    if (lang === 'ja' && technique.video_url_ja) return technique.video_url_ja;
    if (lang === 'pt' && technique.video_url_pt) return technique.video_url_pt;
    
    // 言語に対応する動画がない場合、デフォルトの動画を返す
    return technique.video_url || technique.video_url_ja || technique.video_url_pt || null;
  };

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "pull" as "pull" | "control" | "submission" | "guard-pass",
    hashtags: [] as string[],
    series_name: "" as string,
    series_order: null as number | null,
  });
  const [hashtagInput, setHashtagInput] = useState("");

  const { data, isLoading, error } = usePaginatedTechniques(page, pageSize, {
    search: searchQuery,
    category: categoryFilter,
    sortBy,
  });

  const updateTechnique = useUpdateTechnique();
  const deleteTechnique = useDeleteTechnique();
  const createTechnique = useCreateTechnique();

  const startEditing = (id: string, field: string, currentValue: string) => {
    if (!isAdmin) return; // Staff cannot edit
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
    setHashtagEditValue("");
  };

  const saveEdit = async (technique: Technique) => {
    if (!editingCell) return;

    try {
      let value: string | number | null = editValue;
      
      // Convert series_order to number or null
      if (editingCell.field === 'series_order') {
        value = editValue ? parseInt(editValue) : null;
      }
      
      const updates = {
        ...technique,
        [editingCell.field]: value
      };
      
      await updateTechnique.mutateAsync(updates as Technique);
      toast.success("更新しました");
      cancelEditing();
    } catch (error) {
      console.error('Error updating technique:', error);
      toast.error("更新に失敗しました");
    }
  };

  const addHashtag = async (technique: Technique) => {
    const tag = hashtagEditValue.trim().replace(/^#/, '');
    if (!tag) return;
    
    const newHashtags = [...(technique.hashtags || []), tag];
    
    try {
      await updateTechnique.mutateAsync({
        ...technique,
        hashtags: newHashtags,
      } as Technique);
      setHashtagEditValue("");
      toast.success("ハッシュタグを追加しました");
    } catch (error) {
      console.error('Error adding hashtag:', error);
      toast.error("追加に失敗しました");
    }
  };

  const removeHashtag = async (technique: Technique, tagToRemove: string) => {
    const newHashtags = (technique.hashtags || []).filter(t => t !== tagToRemove);
    
    try {
      await updateTechnique.mutateAsync({
        ...technique,
        hashtags: newHashtags,
      } as Technique);
      toast.success("ハッシュタグを削除しました");
    } catch (error) {
      console.error('Error removing hashtag:', error);
      toast.error("削除に失敗しました");
    }
  };

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
      let videoUrlJa = editingTechnique?.video_url_ja;
      let thumbnailUrl = editingTechnique?.thumbnail_url;
      let thumbnailUrlJa = editingTechnique?.thumbnail_url_ja;
      let videoMetadata = editingTechnique?.video_metadata;
      
      if (videoFile) {
        const result = await handleVideoUpload(videoFile, editingTechnique?.id);
        videoUrl = result.videoUrl;
        videoUrlJa = result.videoUrl;
        thumbnailUrl = result.thumbnailUrl;
        thumbnailUrlJa = result.thumbnailUrl;
        
        // Update video_metadata with Japanese version info
        const currentMetadata = (editingTechnique?.video_metadata as Record<string, any>) || {};
        videoMetadata = {
          ...currentMetadata,
          ja: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            video_url: result.videoUrl,
          }
        };
      }

      const techniqueData = {
        ...formData,
        video_url: videoUrl,
        video_url_ja: videoUrlJa,
        thumbnail_url: thumbnailUrl,
        thumbnail_url_ja: thumbnailUrlJa,
        video_metadata: videoMetadata,
        display_order: editingTechnique?.display_order || 0,
        hashtags: formData.hashtags,
      };

      if (editingTechnique) {
        await updateTechnique.mutateAsync({
          ...techniqueData,
          id: editingTechnique.id,
        });
        toast.success("技術を更新しました", {
          description: videoFile ? "動画を差し替えました" : undefined
        });
      } else {
        await createTechnique.mutateAsync(techniqueData);
        toast.success("技術を作成しました");
      }

      resetForm();
      setShowEditDialog(false);
    } catch (error: unknown) {
      console.error('Error saving technique:', error);
      toast.error("エラーが発生しました", {
        description: error instanceof Error ? error.message : "技術の保存に失敗しました"
      });
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
      // 日本語に翻訳
      const { data: jaData, error: jaError } = await supabase.functions.invoke('translate-technique', {
        body: { 
          text: `Name: ${formData.name}\nDescription: ${formData.description || ''}`,
          targetLang: 'ja'
        }
      });

      if (jaError) throw jaError;

      // ポルトガル語に翻訳
      const { data: ptData, error: ptError } = await supabase.functions.invoke('translate-technique', {
        body: { 
          text: `Name: ${formData.name}\nDescription: ${formData.description || ''}`,
          targetLang: 'pt'
        }
      });

      if (ptError) throw ptError;

      // 翻訳結果をパース
      const parseTranslation = (text: string) => {
        const lines = text.split('\n');
        const name = lines.find(l => l.startsWith('Name:'))?.replace('Name:', '').trim() || '';
        const description = lines.find(l => l.startsWith('Description:'))?.replace('Description:', '').trim() || '';
        return { name, description };
      };

      if (jaData?.translatedText) {
        const ja = parseTranslation(jaData.translatedText);
        setFormData(prev => ({
          ...prev,
          name_ja: ja.name || prev.name_ja,
          description_ja: ja.description || prev.description_ja,
        }));
      }

      if (ptData?.translatedText) {
        const pt = parseTranslation(ptData.translatedText);
        setFormData(prev => ({
          ...prev,
          name_pt: pt.name || prev.name_pt,
          description_pt: pt.description || prev.description_pt,
        }));
      }
      
      toast.success("翻訳完了", {
        description: "自動翻訳が完了しました",
      });
    } catch (error: unknown) {
      console.error('Translation error:', error);
      toast.error("翻訳エラー", {
        description: "翻訳中にエラーが発生しました",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleVideoTranslate = async () => {
    if (!translatingTechnique) return;
    
    // 常に日本語動画をソースとして使用
    const sourceLanguage = 'ja';
    const sourceVideoUrl = translatingTechnique.video_url_ja || translatingTechnique.video_url;
    
    if (!sourceVideoUrl) {
      toast.error("エラー", {
        description: "ソース動画（日本語）が見つかりません",
      });
      return;
    }
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-video', {
        body: { 
          videoUrl: sourceVideoUrl,
          sourceLanguage,
          targetLanguage,
          techniqueId: translatingTechnique.id,
        }
      });

      if (error) throw error;

      if (data && data.projectId) {
        setTranslationProjectId(data.projectId);
        setTranslationStatus({
          status: 'processing',
          progress: 0,
          startTime: Date.now(),
        });
        
        // activeTranslationsに追加
        setActiveTranslations(prev => [...prev, {
          projectId: data.projectId,
          techniqueId: translatingTechnique.id,
          techniqueName: translatingTechnique.name,
          targetLang: targetLanguage,
          startTime: Date.now(),
        }]);
        
        toast.success("動画翻訳を開始しました", {
          description: `翻訳が完了すると自動的に通知されます。バックグラウンドで処理を続行します。`,
        });
        
        setShowTranslateDialog(false);
      }
    } catch (error: unknown) {
      console.error('Video translation error:', error);
      toast.error("動画翻訳エラー", {
        description: error instanceof Error ? error.message : "動画翻訳中にエラーが発生しました",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const checkTranslationStatus = async (projectId: string, targetLang: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-translation-status', {
        body: { 
          projectId,
        }
      });

      if (error) throw error;

      if (data) {
        setTranslationStatus(prev => ({
          ...prev,
          status: data.status,
          progress: data.progress || prev.progress,
        }));
        
        if (data.status === 'completed' && data.videoUrl) {
          // Update the technique with the translated video URL and metadata
          let updateField: string;
          let langName: string;
          
          if (targetLang === 'en') {
            updateField = 'video_url';
            langName = '英語';
          } else if (targetLang === 'ja') {
            updateField = 'video_url_ja';
            langName = '日本語';
          } else {
            updateField = 'video_url_pt';
            langName = 'ポルトガル語';
          }
          
          // Update video metadata
          const currentMetadata = (translatingTechnique as any)?.video_metadata || {};
          const updatedMetadata = {
            ...currentMetadata,
            [targetLang]: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              video_url: data.videoUrl,
            }
          };
          
          await updateTechnique.mutateAsync({
            ...translatingTechnique!,
            [updateField]: data.videoUrl,
            video_metadata: updatedMetadata,
          } as any);
          
          toast.success("動画翻訳完了", {
            description: `${langName}版の動画が利用可能になりました`,
          });
          
          setShowTranslateDialog(false);
          setTranslationProjectId(null);
          setTranslationStatus({
            status: null,
            progress: 0,
            startTime: null,
          });
        } else if (data.status === 'processing') {
          // Poll again after 10 seconds
          setTimeout(() => checkTranslationStatus(projectId, targetLang), 10000);
        } else if (data.status === 'failed') {
          toast.error("動画翻訳エラー", {
            description: "翻訳処理に失敗しました",
          });
          setTranslationStatus({
            status: 'failed',
            progress: 0,
            startTime: null,
          });
        }
      }
    } catch (error: unknown) {
      console.error('Translation status check error:', error);
    }
  };

  // 手動でステータスをチェックする関数
  const manualCheckTranslation = async (translation: {
    projectId: string;
    techniqueId: string;
    techniqueName: string;
    targetLang: string;
    startTime: number;
  }) => {
    try {
      toast.info("ステータス確認中...", {
        description: `「${translation.techniqueName}」の翻訳状況を確認しています`,
      });

      const { data: statusData, error: statusError } = await supabase.functions.invoke('check-translation-status', {
        body: { projectId: translation.projectId }
      });

      if (statusError) {
        toast.error("確認エラー", {
          description: "ステータスの確認に失敗しました",
        });
        return;
      }

      if (statusData?.status === 'completed' && statusData?.videoUrl) {
        const { data: techniqueData, error: fetchError } = await supabase
          .from('techniques')
          .select('*')
          .eq('id', translation.techniqueId)
          .single();

        if (fetchError || !techniqueData) {
          toast.error("エラー", {
            description: "技術データの取得に失敗しました",
          });
          return;
        }

        const currentMetadata = (techniqueData.video_metadata as Record<string, any>) || {};
        const updatedMetadata = {
          ...currentMetadata,
          [translation.targetLang]: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            video_url: statusData.videoUrl,
          }
        };

        await supabase
          .from('techniques')
          .update({ video_metadata: updatedMetadata })
          .eq('id', translation.techniqueId);

        toast.success("動画翻訳完了", {
          description: `「${translation.techniqueName}」の${allLanguages.find(l => l.code === translation.targetLang)?.nativeName}版が完了しました`,
        });

        setActiveTranslations(prev => 
          prev.filter(t => t.projectId !== translation.projectId)
        );
      } else if (statusData?.status === 'failed') {
        toast.error("動画翻訳失敗", {
          description: `「${translation.techniqueName}」の翻訳処理に失敗しました`,
        });

        setActiveTranslations(prev => 
          prev.filter(t => t.projectId !== translation.projectId)
        );
      } else if (statusData?.status === 'processing') {
        toast.info("翻訳処理中", {
          description: `進捗: ${statusData.progress || 0}%`,
        });
      } else {
        toast.info("ステータス", {
          description: `現在の状態: ${statusData?.status || '不明'}`,
        });
      }
    } catch (error) {
      console.error('Manual check error:', error);
      toast.error("エラー", {
        description: "ステータスの確認中にエラーが発生しました",
      });
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
      hashtags: [],
      series_name: "",
      series_order: null,
    });
    setHashtagInput("");
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
      category: technique.category as "pull" | "control" | "submission" | "guard-pass",
      hashtags: technique.hashtags || [],
      series_name: technique.series_name || "",
      series_order: technique.series_order,
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
          {isAdmin && (
            <Button onClick={() => setShowEditDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              新規技術追加
            </Button>
          )}
        </div>
      </div>

      {/* Active Translations Section */}
      {activeTranslations.length > 0 && (
        <div className="mb-6 border rounded-lg p-4 bg-muted/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Languages className="h-5 w-5" />
            進行中の翻訳 ({activeTranslations.length})
          </h3>
          <div className="space-y-3">
            {activeTranslations.map((translation) => {
              const elapsedTime = Math.floor((Date.now() - translation.startTime) / 1000);
              const minutes = Math.floor(elapsedTime / 60);
              const seconds = elapsedTime % 60;
              const langName = allLanguages.find(l => l.code === translation.targetLang)?.nativeName || translation.targetLang;
              
              return (
                <div key={translation.projectId} className="border rounded p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{translation.techniqueName}</p>
                      <p className="text-sm text-muted-foreground">
                        {langName}版 • 経過時間: {minutes}分{seconds}秒
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => manualCheckTranslation(translation)}
                    >
                      ステータス確認
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    プロジェクトID: {translation.projectId}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <th className="px-4 py-3 text-left">シリーズ</th>
              <th className="px-4 py-3 text-left">ハッシュタグ</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">翻訳</th>
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
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
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
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  技術が見つかりませんでした
                </td>
              </tr>
            ) : (
              data?.data.map((technique) => (
                <tr key={technique.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {/* English Name */}
                      {editingCell?.id === technique.id && editingCell?.field === 'name' ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveEdit(technique as Technique);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(technique as Technique)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className="font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded"
                          onClick={() => startEditing(technique.id, 'name', technique.name)}
                        >
                          {technique.name}
                        </p>
                      )}
                      
                      {/* Japanese Name */}
                      {editingCell?.id === technique.id && editingCell?.field === 'name_ja' ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveEdit(technique as Technique);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(technique as Technique)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className={`text-sm text-muted-foreground px-2 py-1 rounded ${isAdmin ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : ''}`}
                          onClick={() => isAdmin && startEditing(technique.id, 'name_ja', technique.name_ja)}
                        >
                          {technique.name_ja}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {technique.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {/* Series Name */}
                      {editingCell?.id === technique.id && editingCell?.field === 'series_name' ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveEdit(technique as Technique);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-8 text-sm"
                            autoFocus
                            placeholder="シリーズ名"
                          />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(technique as Technique)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className={`text-sm px-2 py-1 rounded ${isAdmin ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : ''}`}
                          onClick={() => isAdmin && startEditing(technique.id, 'series_name', (technique as Technique).series_name || '')}
                        >
                          {(technique as Technique).series_name || <span className="text-muted-foreground">シリーズなし</span>}
                        </p>
                      )}
                      
                      {/* Series Order */}
                      {editingCell?.id === technique.id && editingCell?.field === 'series_order' ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveEdit(technique as Technique);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-8 text-sm"
                            autoFocus
                            placeholder="順序"
                          />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(technique as Technique)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className={`text-xs text-muted-foreground px-2 py-1 rounded ${isAdmin ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : ''}`}
                          onClick={() => isAdmin && startEditing(technique.id, 'series_order', (technique as Technique).series_order?.toString() || '')}
                        >
                          順序: {(technique as Technique).series_order || <span className="text-muted-foreground">-</span>}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {technique.hashtags && technique.hashtags.length > 0 ? (
                          technique.hashtags.map((tag) => (
                            <div 
                              key={tag}
                              className={`flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs ${isAdmin ? 'group cursor-pointer hover:bg-primary/20' : ''}`}
                            >
                              <span>#{tag}</span>
                              {isAdmin && (
                                <button
                                  onClick={() => removeHashtag(technique as Technique, tag)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))
                        ) : null}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Input
                            value={editingCell?.id === technique.id && editingCell?.field === 'hashtags' ? hashtagEditValue : ''}
                            onChange={(e) => {
                              setHashtagEditValue(e.target.value);
                              setEditingCell({ id: technique.id, field: 'hashtags' });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                addHashtag(technique as Technique);
                              }
                            }}
                            onBlur={() => {
                              if (editingCell?.id === technique.id && editingCell?.field === 'hashtags') {
                                setHashtagEditValue('');
                                setEditingCell(null);
                              }
                            }}
                            placeholder="追加..."
                            className="h-7 text-xs"
                          />
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => addHashtag(technique as Technique)}
                            className="h-7 px-2"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{technique.display_order}</td>
                  <td className="px-4 py-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{getTranslationCount(technique as any)}</span>
                            <span className="text-xs text-muted-foreground">言語</span>
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">利用可能な動画</h4>
                          <div className="space-y-1">
                            {getAvailableTranslations(technique as any).length > 0 ? (
                              getAvailableTranslations(technique as any).map((trans) => (
                                <a
                                  key={trans.code}
                                  href={trans.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 rounded hover:bg-accent text-sm group"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{trans.name} ({trans.code.toUpperCase()})</span>
                                    {trans.isOriginal && (
                                      <span className="text-xs text-muted-foreground">オリジナル</span>
                                    )}
                                  </div>
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground p-2">動画がありません</p>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-4 py-3">
                    <VideoThumbnail
                      videoUrl={getVideoUrlForLanguage(technique as any, language)}
                      className="w-32 h-20"
                      showPlayButton
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {isAdmin ? (
                        <>
                          {technique.video_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTranslatingTechnique(technique as any);
                                setShowTranslateDialog(true);
                              }}
                              title="動画を他言語に翻訳"
                            >
                              <Languages className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(technique as any)}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(technique.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(technique as Technique)}
                        >
                          詳細
                        </Button>
                      )}
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
              {editingTechnique ? (isAdmin ? '技術編集' : '技術詳細') : '新規技術追加'}
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
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Japanese Name *</label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({...formData, name_ja: e.target.value})}
                  required
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Portuguese Name *</label>
                <Input
                  value={formData.name_pt}
                  onChange={(e) => setFormData({...formData, name_pt: e.target.value})}
                  required
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select 
                value={formData.category} 
                onValueChange={(value: any) => setFormData({...formData, category: value})}
                disabled={!isAdmin}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">シリーズ名 (Series Name)</label>
                <Input
                  value={formData.series_name}
                  onChange={(e) => setFormData({...formData, series_name: e.target.value})}
                  placeholder="例: Closed Guard Series"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  空欄の場合は「その他の技」として表示されます
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">シリーズ内順序 (Order)</label>
                <Input
                  type="number"
                  value={formData.series_order || ""}
                  onChange={(e) => setFormData({...formData, series_order: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="1, 2, 3..."
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  シリーズ内での表示順序（1から始まる連番）
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description (English)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">説明 (Japanese)</label>
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({...formData, description_ja: e.target.value})}
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (Portuguese)</label>
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({...formData, description_pt: e.target.value})}
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">ハッシュタグ</label>
              <div className="space-y-2">
                {isAdmin && (
                  <div className="flex gap-2">
                    <Input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const tag = hashtagInput.trim().replace(/^#/, '');
                          if (tag && !formData.hashtags.includes(tag)) {
                            setFormData({ ...formData, hashtags: [...formData.hashtags, tag] });
                            setHashtagInput("");
                          }
                        }
                      }}
                      placeholder="ハッシュタグを入力してEnter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const tag = hashtagInput.trim().replace(/^#/, '');
                        if (tag && !formData.hashtags.includes(tag)) {
                          setFormData({ ...formData, hashtags: [...formData.hashtags, tag] });
                          setHashtagInput("");
                        }
                      }}
                    >
                      追加
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {formData.hashtags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      <span>#{tag}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              hashtags: formData.hashtags.filter((t) => t !== tag),
                            });
                          }}
                          className="text-primary hover:text-primary/80"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isAdmin && (
              <>
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
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                setShowEditDialog(false);
              }}>
                {isAdmin ? 'キャンセル' : '閉じる'}
              </Button>
              {isAdmin && (
                <Button type="submit">
                  {editingTechnique ? '更新' : '作成'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Translation Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>動画翻訳</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {translatingTechnique?.name} の動画を他言語に翻訳します
              </p>
              
              <div>
                <label className="text-sm font-medium mb-3 block">翻訳先言語を選択</label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {allLanguages.map(lang => {
                    const metadata = (translatingTechnique as any)?.video_metadata?.[lang.code];
                    const isProcessing = translationStatus.status === 'processing' && targetLanguage === lang.code && translationProjectId;
                    const isJapanese = lang.code === 'ja';
                    
                    return (
                      <div
                        key={lang.code}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isJapanese 
                            ? "border-border bg-muted/50 cursor-not-allowed" 
                            : targetLanguage === lang.code 
                              ? "border-primary bg-primary/5 cursor-pointer" 
                              : "border-border hover:border-primary/50 cursor-pointer"
                        }`}
                        onClick={() => !isJapanese && setTargetLanguage(lang.code as any)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="language"
                            value={lang.code}
                            checked={targetLanguage === lang.code}
                            onChange={() => !isJapanese && setTargetLanguage(lang.code as any)}
                            disabled={isJapanese}
                            className="cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{lang.name} ({lang.nativeName})</span>
                            {isJapanese && (
                              <span className="text-xs text-muted-foreground">オリジナル言語</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isProcessing ? (
                            <div className="flex items-center gap-1 text-sm text-blue-600">
                              <span className="animate-pulse">●</span>
                              <span>作成中</span>
                            </div>
                          ) : metadata?.video_url ? (
                            <>
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                <span>翻訳済み</span>
                              </div>
                              {metadata.created_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(metadata.created_at).toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  })}
                                </span>
                              )}
                            </>
                          ) : isJapanese ? (
                            <>
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                <span>オリジナル</span>
                              </div>
                              {translatingTechnique?.created_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(translatingTechnique.created_at).toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  })}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">未翻訳</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {translationStatus.status && (
                <div className="mt-4 p-4 bg-muted rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      ステータス: {translationStatus.status === 'processing' ? '翻訳処理中...' : 
                                  translationStatus.status === 'completed' ? '翻訳完了' : 
                                  translationStatus.status === 'failed' ? '失敗' : translationStatus.status}
                    </p>
                    {translationStatus.progress > 0 && (
                      <p className="text-sm text-muted-foreground">{translationStatus.progress}%</p>
                    )}
                  </div>
                  {translationStatus.progress > 0 && translationStatus.status === 'processing' && (
                    <>
                      <Progress value={translationStatus.progress} className="h-2" />
                      {translationStatus.startTime && (
                        <p className="text-xs text-muted-foreground">
                          推定残り時間: {(() => {
                            const elapsed = Date.now() - translationStatus.startTime;
                            const estimatedTotal = translationStatus.progress > 0 
                              ? (elapsed / translationStatus.progress) * 100 
                              : 0;
                            const remaining = estimatedTotal - elapsed;
                            const minutes = Math.ceil(remaining / 60000);
                            return minutes > 0 ? `約${minutes}分` : "まもなく完了";
                          })()}
                        </p>
                      )}
                    </>
                  )}
                  {translationProjectId && (
                    <p className="text-xs text-muted-foreground">
                      プロジェクトID: {translationProjectId}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowTranslateDialog(false);
                  setTranslationProjectId(null);
                  setTranslationStatus({
                    status: null,
                    progress: 0,
                    startTime: null,
                  });
                }}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleVideoTranslate}
                disabled={isTranslating || translationStatus.status === 'processing'}
              >
                {isTranslating ? '開始中...' : translationStatus.status === 'processing' ? '処理中' : '翻訳開始'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
