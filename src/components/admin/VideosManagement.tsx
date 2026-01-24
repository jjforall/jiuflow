import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions } from "@/components/ui/input-with-suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Search, Check, Languages, ChevronDown, Loader2, RefreshCw, ImageIcon, Wrench, Clock, FileText, Film, Hash, Tags, BookOpen, FolderOpen, Eye, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpload } from "@/contexts/UploadContext";
import { VideoPreviewDialog, type VideoPreviewTechnique } from "@/components/admin/VideoPreviewDialog";
import { VideoCard } from "@/components/admin/VideoCard";
import { TranscriptionQuickDialog } from "@/components/admin/TranscriptionQuickDialog";
import { TranslationQuickDialog } from "@/components/admin/TranslationQuickDialog";
import { NotationSelector } from "@/components/admin/NotationSelector";
import { useNotations } from "@/hooks/useNotations";

// セクションコンポーネント
const FormSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
    {children}
  </div>
);

export const VideosManagement = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [notationFilter, setNotationFilter] = useState<string>("all");
  const [notationLabel, setNotationLabel] = useState<string>("");
  const [sortBy, setSortBy] = useState<"order" | "name" | "category" | "series" | "created">("order");
  
  // Fetch notations for filter dropdown (sorted by video count)
  const { data: notationsForFilter } = useNotations();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const { startCloudflareUpload } = useUpload();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAutoTranslatingName, setIsAutoTranslatingName] = useState(false);
  const [isAutoTranslatingDesc, setIsAutoTranslatingDesc] = useState(false);
  // Note: editingTechnique is no longer used - edit is now on separate page
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [hashtagEditValue, setHashtagEditValue] = useState<string>("");
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [translatingTechnique, setTranslatingTechnique] = useState<Technique | null>(null);
  const [inlineMaxSeriesOrder, setInlineMaxSeriesOrder] = useState<Record<string, number>>({});
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
    provider?: 'rask' | 'elevenlabs';
  }>>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [seriesNameSuggestions, setSeriesNameSuggestions] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [previewTechnique, setPreviewTechnique] = useState<VideoPreviewTechnique | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [seriesMapping, setSeriesMapping] = useState<Array<{ series_name: string; series_prefix: string }>>([]);
  const [isFixingThumbnails, setIsFixingThumbnails] = useState(false);
  const [missingThumbnailCount, setMissingThumbnailCount] = useState(0);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [transcriptionMap, setTranscriptionMap] = useState<Record<string, { id: string; status: string }>>({});
  const [reEncodingIds, setReEncodingIds] = useState<Set<string>>(new Set());
  const [subtitleMap, setSubtitleMap] = useState<Record<string, string[]>>({});
  const [notationMap, setNotationMap] = useState<Record<string, Array<{ code: string; category: string; name_ja?: string; name_en?: string }>>>({});
  const [isFetchingDurations, setIsFetchingDurations] = useState(false);
  const [fetchingDurationId, setFetchingDurationId] = useState<string | null>(null);
  const [missingDurationCount, setMissingDurationCount] = useState(0);
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [lastBulkFetchResults, setLastBulkFetchResults] = useState<{
    total: number;
    saved: number;
    failed: number;
    verifiedSaved: number;
    details: Array<{ id: string; name: string; status: 'saved' | 'failed' | 'fetch_error' }>;
  } | null>(null);
  
  // Quick dialogs for transcription/translation
  const [transcriptionDialogTechnique, setTranscriptionDialogTechnique] = useState<Technique | null>(null);
  const [translationDialogTechnique, setTranslationDialogTechnique] = useState<Technique | null>(null);


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

  // カテゴリーとシリーズ名をデータベースから取得
  useEffect(() => {
    const fetchCategories = async () => {
      const { data: techniqueData, error } = await supabase
        .from('techniques')
        .select('category');
      
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      
      // ユニークなカテゴリーのリストを作成
      const uniqueCategories = Array.from(new Set(techniqueData.map(item => item.category)));
      setAvailableCategories(uniqueCategories.sort());
    };

    const fetchSeriesNames = async () => {
      const { data: techniqueData, error } = await supabase
        .from('techniques')
        .select('series_name, series_prefix');
      
      if (error) {
        console.error('Error fetching series names:', error);
        return;
      }
      
      // ユニークなシリーズ名とprefixの組み合わせを作成
      const seriesMap = new Map<string, string>();
      techniqueData.forEach(item => {
        if (item.series_name && item.series_prefix) {
          seriesMap.set(item.series_name, item.series_prefix);
        }
      });
      
      const mappings = Array.from(seriesMap.entries())
        .map(([series_name, series_prefix]) => ({ series_name, series_prefix }))
        .sort((a, b) => a.series_prefix.localeCompare(b.series_prefix));
      
      setSeriesMapping(mappings);
      setSeriesNameSuggestions(mappings.map(m => m.series_name));
    };

    const fetchMissingThumbnailCount = async () => {
      const { data, error } = await supabase
        .from('techniques')
        .select('id, video_url, thumbnail_url, video_metadata');
      
      if (error) {
        console.error('Error fetching thumbnail count:', error);
        return;
      }
      
      let missingThumbCount = 0;
      let missingDurCount = 0;
      data?.forEach(t => {
        // Count missing thumbnails
        if (!t.thumbnail_url && t.video_url) missingThumbCount++;
        // Count missing durations
        const meta = t.video_metadata as Record<string, unknown> | null;
        if (t.video_url && (!meta || typeof meta.duration !== 'number')) missingDurCount++;
      });
      setMissingThumbnailCount(missingThumbCount);
      setMissingDurationCount(missingDurCount);
    };
    
    const fetchTranscriptions = async () => {
      const { data, error } = await supabase
        .from('video_transcriptions')
        .select('id, technique_id, status');
      
      if (error) {
        console.error('Error fetching transcriptions:', error);
        return;
      }
      
      const map: Record<string, { id: string; status: string }> = {};
      data?.forEach(t => {
        if (t.technique_id) {
          map[t.technique_id] = { id: t.id, status: t.status };
        }
      });
      setTranscriptionMap(map);
    };
    
    const fetchSubtitles = async () => {
      // Join subtitles with transcriptions to get technique_id
      const { data: transcriptions, error: transError } = await supabase
        .from('video_transcriptions')
        .select('id, technique_id');
      
      if (transError) {
        console.error('Error fetching transcriptions for subtitles:', transError);
        return;
      }
      
      const { data: subtitles, error: subError } = await supabase
        .from('video_subtitles')
        .select('transcription_id, language_code');
      
      if (subError) {
        console.error('Error fetching subtitles:', subError);
        return;
      }
      
      // Create a map from transcription_id to technique_id
      const transMap: Record<string, string> = {};
      transcriptions?.forEach(t => {
        if (t.technique_id) {
          transMap[t.id] = t.technique_id;
        }
      });
      
      // Create map of technique_id to subtitle languages
      const map: Record<string, string[]> = {};
      subtitles?.forEach(s => {
        const techniqueId = transMap[s.transcription_id];
        if (techniqueId) {
          if (!map[techniqueId]) map[techniqueId] = [];
          map[techniqueId].push(s.language_code);
        }
      });
      setSubtitleMap(map);
    };
    
    // Fetch notation links for all techniques - including name info for tooltips
    const fetchNotationLinks = async () => {
      const { data: links, error } = await supabase
        .from('technique_notations')
        .select('technique_id, notation:bjj_notations(code, category, name_ja, name_en)');
      
      if (error) {
        console.error('Error fetching notation links:', error);
        return;
      }
      
      const map: Record<string, Array<{ code: string; category: string; name_ja?: string; name_en?: string }>> = {};
      links?.forEach((link: any) => {
        if (link.technique_id && link.notation) {
          if (!map[link.technique_id]) map[link.technique_id] = [];
          map[link.technique_id].push({
            code: link.notation.code,
            category: link.notation.category,
            name_ja: link.notation.name_ja,
            name_en: link.notation.name_en,
          });
        }
      });
      setNotationMap(map);
    };
    
    fetchCategories();
    fetchSeriesNames();
    fetchMissingThumbnailCount();
    fetchTranscriptions();
    fetchSubtitles();
    fetchNotationLinks();
  }, []);

  // シリーズ名リストを再取得する関数
  const refetchSeriesNames = async () => {
    const { data: techniqueData, error } = await supabase
      .from('techniques')
      .select('series_name, series_prefix');
    
    if (error) {
      console.error('Error fetching series names:', error);
      return;
    }
    
    // ユニークなシリーズ名とprefixの組み合わせを作成
    const seriesMap = new Map<string, string>();
    techniqueData.forEach(item => {
      if (item.series_name && item.series_prefix) {
        seriesMap.set(item.series_name, item.series_prefix);
      }
    });
    
    const mappings = Array.from(seriesMap.entries())
      .map(([series_name, series_prefix]) => ({ series_name, series_prefix }))
      .sort((a, b) => a.series_prefix.localeCompare(b.series_prefix));
    
    setSeriesMapping(mappings);
    setSeriesNameSuggestions(mappings.map(m => m.series_name));
  };

  // Fix missing thumbnails
  const handleFixThumbnails = async () => {
    if (!confirm(`${missingThumbnailCount}件の動画にサムネイルURLを設定しますか？`)) return;
    
    setIsFixingThumbnails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      // Generate thumbnails directly from Cloudflare URLs
      const { data: techniques } = await supabase
        .from('techniques')
        .select('id, video_url, thumbnail_url')
        .is('thumbnail_url', null)
        .not('video_url', 'is', null);

      if (!techniques || techniques.length === 0) {
        toast.info("サムネイルが必要な動画がありません");
        setIsFixingThumbnails(false);
        return;
      }

      let fixedCount = 0;
      for (const technique of techniques) {
        // Extract Cloudflare video ID from URL
        const videoUrl = technique.video_url || '';
        const match = videoUrl.match(/videodelivery\.net\/([a-f0-9]{32})/i);
        if (match?.[1]) {
          const videoId = match[1];
          const thumbnailUrl = `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg`;
          
          await supabase
            .from('techniques')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', technique.id);
          
          fixedCount++;
        }
      }

      toast.success(`${fixedCount}件のサムネイルを設定しました`);
      
      // Refresh missing thumbnail count
      const { data } = await supabase
        .from('techniques')
        .select('id, video_url, thumbnail_url');
      
      let count = 0;
      data?.forEach(t => {
        if (!t.thumbnail_url && t.video_url) count++;
      });
      setMissingThumbnailCount(count);
    } catch (error) {
      console.error("サムネイル修復エラー:", error);
      toast.error(error instanceof Error ? error.message : "サムネイル修復に失敗しました");
    } finally {
      setIsFixingThumbnails(false);
    }
  };
  
  // 動画時間を一括取得
  const handleFetchAllDurations = async () => {
    // Get all techniques with video_url but no duration in video_metadata
    const { data: techniques, error } = await supabase
      .from('techniques')
      .select('id, name, video_url, video_metadata')
      .not('video_url', 'is', null);
    
    if (error) {
      toast.error('データ取得エラー');
      return;
    }
    
    // Filter to only those missing duration
    const needsDuration = techniques?.filter(t => {
      const meta = t.video_metadata as Record<string, unknown> | null;
      return !meta || typeof meta.duration !== 'number';
    }) || [];
    
    if (needsDuration.length === 0) {
      toast.info('すべての動画に時間が設定されています');
      return;
    }

    if (!confirm(`${needsDuration.length}件の動画の時間を取得しますか？（数分かかる場合があります）`)) return;
    
    setIsFetchingDurations(true);
    setLastBulkFetchResults(null);
    
    const resultDetails: Array<{ id: string; name: string; status: 'saved' | 'failed' | 'fetch_error' }> = [];
    
    try {
      const durationsToSave: Array<{ id: string; duration: number }> = [];

      for (const technique of needsDuration) {
        try {
          const duration = await fetchDurationFromVideo(technique.video_url!);
          if (duration && duration > 0) {
            durationsToSave.push({ id: technique.id, duration: Math.round(duration) });
          } else {
            resultDetails.push({ id: technique.id, name: technique.name, status: 'fetch_error' });
          }
        } catch (err) {
          console.error(`Failed to get duration for ${technique.id}:`, err);
          resultDetails.push({ id: technique.id, name: technique.name, status: 'fetch_error' });
        }
      }

      if (durationsToSave.length === 0) {
        setLastBulkFetchResults({
          total: needsDuration.length,
          saved: 0,
          failed: needsDuration.length,
          verifiedSaved: 0,
          details: resultDetails
        });
        toast.error('動画時間を取得できませんでした');
        return;
      }

      // Save durations with admin-privileged backend function (avoids RLS write failures)
      const { data: saveData, error: saveError } = await supabase.functions.invoke(
        'admin-update-video-durations',
        { body: { durations: durationsToSave } }
      );

      if (saveError) throw saveError;
      if ((saveData as any)?.error) throw new Error((saveData as any).error);

      const updatedIds = Array.isArray((saveData as any)?.updated) ? (saveData as any).updated : [];
      const failedIds = Array.isArray((saveData as any)?.failed) ? (saveData as any).failed : [];
      
      // Mark saved ones
      durationsToSave.forEach(d => {
        const t = needsDuration.find(tech => tech.id === d.id);
        if (t) {
          if (failedIds.includes(d.id)) {
            resultDetails.push({ id: d.id, name: t.name, status: 'failed' });
          } else {
            resultDetails.push({ id: d.id, name: t.name, status: 'saved' });
          }
        }
      });

      // Verify saved durations by re-fetching from DB
      const savedIds = durationsToSave.map(d => d.id).filter(id => !failedIds.includes(id));
      const { data: verifyData } = await supabase
        .from('techniques')
        .select('id, video_metadata')
        .in('id', savedIds);
      
      let verifiedCount = 0;
      verifyData?.forEach(t => {
        const meta = t.video_metadata as Record<string, unknown> | null;
        if (meta && typeof meta.duration === 'number') {
          verifiedCount++;
        }
      });

      setLastBulkFetchResults({
        total: needsDuration.length,
        saved: savedIds.length,
        failed: resultDetails.filter(r => r.status !== 'saved').length,
        verifiedSaved: verifiedCount,
        details: resultDetails
      });

      toast.success(`動画時間取得完了: ${verifiedCount}件保存確認 / ${needsDuration.length}件中`);
      
      // Refresh missing duration count
      const { data: refreshData } = await supabase
        .from('techniques')
        .select('id, video_url, video_metadata');
      
      let count = 0;
      refreshData?.forEach(t => {
        const meta = t.video_metadata as Record<string, unknown> | null;
        if (t.video_url && (!meta || typeof meta.duration !== 'number')) count++;
      });
      setMissingDurationCount(count);
      
      // Refetch data to update cards
      refetch?.();
    } catch (error) {
      console.error("動画時間取得エラー:", error);
      toast.error(error instanceof Error ? error.message : "動画時間取得に失敗しました");
    } finally {
      setIsFetchingDurations(false);
    }
  };
  
  // 個別の動画時間を取得
  const handleFetchSingleDuration = async (technique: Technique) => {
    if (!technique.video_url) return;
    
    setFetchingDurationId(technique.id);
    try {
      const duration = await fetchDurationFromVideo(technique.video_url);
      if (!duration || duration <= 0) {
        toast.error('動画時間を取得できませんでした');
        return;
      }
      
      // Save via edge function
      const { data: saveData, error: saveError } = await supabase.functions.invoke(
        'admin-update-video-durations',
        { body: { durations: [{ id: technique.id, duration: Math.round(duration) }] } }
      );
      
      if (saveError) throw saveError;
      if ((saveData as any)?.error) throw new Error((saveData as any).error);
      
      toast.success(`動画時間を取得しました: ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`);
      
      // Refresh
      refetch?.();
      
      // Update missing count
      setMissingDurationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to fetch duration:', error);
      toast.error('動画時間の取得に失敗しました');
    } finally {
      setFetchingDurationId(null);
    }
  };
  
  // Helper function to extract duration from video URL via Cloudflare API
  const fetchDurationFromVideo = async (videoUrl: string): Promise<number | null> => {
    try {
      console.log('[Duration Fetch] Starting for URL:', videoUrl);
      
      const { data, error } = await supabase.functions.invoke(
        'admin-update-video-durations',
        { body: { mode: 'fetch', videoUrl } }
      );
      
      if (error) {
        console.error('[Duration Fetch] Supabase invoke error:', error);
        // Try to parse error message
        const errorMsg = typeof error === 'object' && error !== null 
          ? JSON.stringify(error) 
          : String(error);
        console.error('[Duration Fetch] Error details:', errorMsg);
        return null;
      }
      
      if (!data?.duration) {
        console.warn('[Duration Fetch] No duration in response:', data);
        return null;
      }
      
      console.log('[Duration Fetch] Success, duration:', data.duration);
      return data.duration;
    } catch (err) {
      console.error('[Duration Fetch] Caught exception:', err);
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.error('[Duration Fetch] Network error - possible CORS issue or function not deployed');
      }
      return null;
    }
  };
  
  // Download video
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
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
      toast.success('ダウンロードを開始しました');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('ダウンロードに失敗しました');
    } finally {
      setDownloadingId(null);
    }
  };
  
  // 次に利用可能なアルファベットを取得
  const getNextAvailablePrefix = (): string => {
    if (seriesMapping.length === 0) return 'A';
    
    const usedPrefixes = new Set(seriesMapping.map(m => m.series_prefix));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < alphabet.length; i++) {
      if (!usedPrefixes.has(alphabet[i])) {
        return alphabet[i];
      }
    }
    
    // All single letters used, start with AA
    return 'AA';
  };
  
  // シリーズ名が変更されたときにprefixを自動設定
  const handleSeriesNameChange = (newSeriesName: string) => {
    const existingMapping = seriesMapping.find(m => m.series_name === newSeriesName);
    
    if (existingMapping) {
      // 既存のシリーズ名 - 既存のprefixを使用
      setFormData({
        ...formData,
        series_name: newSeriesName,
        series_prefix: existingMapping.series_prefix
      });
    } else if (newSeriesName.trim() === '') {
      // 空欄の場合
      setFormData({
        ...formData,
        series_name: '',
        series_prefix: ''
      });
    } else {
      // 新しいシリーズ名 - 次のアルファベットを割り当て
      const nextPrefix = getNextAvailablePrefix();
      setFormData({
        ...formData,
        series_name: newSeriesName,
        series_prefix: nextPrefix
      });
    }
  };

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

          // merging_done も完了として扱う
          const isCompleted = statusData?.status === 'completed' || 
                             statusData?.status === 'merging_done';

          if (isCompleted && statusData?.videoUrl) {
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
    category: "",
    hashtags: [] as string[],
    series_name: "" as string,
    series_order: null as number | null,
    series_prefix: "" as string,
    visibility: "public" as "public" | "unlisted" | "private",
  });
  const [hashtagInput, setHashtagInput] = useState("");
  const [descriptionTab, setDescriptionTab] = useState<"ja" | "en" | "pt">("ja");
  const [maxSeriesOrder, setMaxSeriesOrder] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = usePaginatedTechniques(page, pageSize, {
    search: searchQuery,
    category: categoryFilter,
    series: seriesFilter,
    notationId: notationFilter,
    sortBy,
  });

  // Listen for notation filter events from NotationsManagement
  useEffect(() => {
    const handleNotationFilter = (event: CustomEvent<{ notationId: string; label: string }>) => {
      setNotationFilter(event.detail.notationId);
      setNotationLabel(event.detail.label);
      setPage(1);
    };
    
    window.addEventListener('videos-filter-by-notation', handleNotationFilter as EventListener);
    return () => {
      window.removeEventListener('videos-filter-by-notation', handleNotationFilter as EventListener);
    };
  }, []);

  const updateTechnique = useUpdateTechnique();
  const deleteTechnique = useDeleteTechnique();
  const createTechnique = useCreateTechnique();

  // シリーズ名が変更されたら最大番号を取得
  useEffect(() => {
    const fetchMaxSeriesOrder = async () => {
      if (!formData.series_prefix) {
        setMaxSeriesOrder(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('techniques')
        .select('series_order')
        .eq('series_prefix', formData.series_prefix)
        .order('series_order', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching max series order:', error);
        return;
      }
      
      if (data && data.length > 0 && data[0].series_order !== null) {
        setMaxSeriesOrder(data[0].series_order);
      } else {
        setMaxSeriesOrder(0);
      }
    };
    
    fetchMaxSeriesOrder();
  }, [formData.series_prefix]);

  // 日本語から英語・ポルトガル語への自動翻訳
  const autoTranslateName = async () => {
    if (!formData.name_ja.trim() || isAutoTranslatingName) return;
    
    setIsAutoTranslatingName(true);
    try {
      // 英語とポルトガル語に並列翻訳
      const [enRes, ptRes] = await Promise.all([
        supabase.functions.invoke('translate-technique', {
          body: { text: formData.name_ja, targetLang: 'en' }
        }),
        supabase.functions.invoke('translate-technique', {
          body: { text: formData.name_ja, targetLang: 'pt' }
        })
      ]);
      
      const updates: Partial<typeof formData> = {};
      if (enRes.data?.translatedText && !formData.name) {
        updates.name = enRes.data.translatedText;
      }
      if (ptRes.data?.translatedText && !formData.name_pt) {
        updates.name_pt = ptRes.data.translatedText;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        toast.success('名前を自動翻訳しました');
      }
    } catch (error) {
      console.error('Auto translation error:', error);
    } finally {
      setIsAutoTranslatingName(false);
    }
  };

  const autoTranslateDescription = async () => {
    if (!formData.description_ja.trim() || isAutoTranslatingDesc) return;
    
    setIsAutoTranslatingDesc(true);
    try {
      const [enRes, ptRes] = await Promise.all([
        supabase.functions.invoke('translate-technique', {
          body: { text: formData.description_ja, targetLang: 'en' }
        }),
        supabase.functions.invoke('translate-technique', {
          body: { text: formData.description_ja, targetLang: 'pt' }
        })
      ]);
      
      const updates: Partial<typeof formData> = {};
      if (enRes.data?.translatedText && !formData.description) {
        updates.description = enRes.data.translatedText;
      }
      if (ptRes.data?.translatedText && !formData.description_pt) {
        updates.description_pt = ptRes.data.translatedText;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        toast.success('説明を自動翻訳しました');
      }
    } catch (error) {
      console.error('Auto translation error:', error);
    } finally {
      setIsAutoTranslatingDesc(false);
    }
  };


  const startEditing = async (id: string, field: string, currentValue: string, technique?: Technique) => {
    if (!isAdmin) return; // Staff cannot edit
    setEditingCell({ id, field });
    setEditValue(currentValue);
    
    // series_order編集時に最大番号を取得
    if (field === 'series_order' && technique?.series_prefix) {
      const { data, error } = await supabase
        .from('techniques')
        .select('series_order')
        .eq('series_prefix', technique.series_prefix)
        .order('series_order', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0 && data[0].series_order !== null) {
        setInlineMaxSeriesOrder(prev => ({
          ...prev,
          [id]: data[0].series_order
        }));
      } else {
        setInlineMaxSeriesOrder(prev => ({
          ...prev,
          [id]: 0
        }));
      }
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
    setHashtagEditValue("");
    setInlineMaxSeriesOrder({});
  };

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

  const saveEdit = async (technique: Technique) => {
    if (!editingCell) return;

    try {
      let value: string | number | null = editValue;
      
      // Convert series_order to number or null
      if (editingCell.field === 'series_order') {
        value = editValue ? parseInt(editValue) : null;
      }
      
      const updates: Record<string, string | number | null> & { id: string } = {
        id: technique.id,
        [editingCell.field]: value
      };
      
      // series_nameが更新された場合、series_prefixも自動設定
      if (editingCell.field === 'series_name') {
        const newSeriesName = (value as string).trim();
        if (newSeriesName) {
          const existingMapping = seriesMapping.find(m => m.series_name === newSeriesName);
          if (existingMapping) {
            updates.series_prefix = existingMapping.series_prefix;
          } else {
            // 新しいシリーズ名の場合、次のアルファベットを割り当て
            updates.series_prefix = getNextAvailablePrefix();
          }
        } else {
          updates.series_prefix = '';
        }
      }
      
      await updateTechnique.mutateAsync(updates as { id: string } & Record<string, unknown>);
      toast.success("更新しました");
      
      // シリーズ名が更新された場合はリストを再取得
      if (editingCell.field === 'series_name' && editValue.trim() !== '') {
        await refetchSeriesNames();
      }
      
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
        id: technique.id,
        hashtags: newHashtags,
      });
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
        id: technique.id,
        hashtags: newHashtags,
      });
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
      .upload(`thumbnails/${filePath}`, thumbnailBlob, { 
        upsert: true,
        cacheControl: '86400', // 24 hours cache for thumbnails
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('technique-videos')
      .getPublicUrl(`thumbnails/${filePath}`);

    return publicUrl;
  };

  const handleVideoUpload = async (file: File, _techniqueId?: string) => {
    const result = await startCloudflareUpload(file, formData.name_ja || formData.name || file.name);
    if (!result) {
      throw new Error('動画のアップロードに失敗しました');
    }
    return { videoUrl: result.videoUrl, thumbnailUrl: result.thumbnailUrl };
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

  // Auto transcription with AI formatting after video upload
  const startAutoTranscription = async (techniqueId: string, videoUrl: string, techniqueName: string) => {
    setTranscribingIds(prev => new Set(prev).add(techniqueId));
    
    toast.info('自動文字起こしを開始...', {
      description: `「${techniqueName}」の文字起こしをバックグラウンドで処理中`,
    });

    try {
      // Step 1: Transcribe
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-video', {
        body: { 
          videoUrl,
          techniqueId
        }
      });

      if (transcribeError) {
        throw new Error(transcribeError.message);
      }

      if (!transcribeData?.success || !transcribeData?.transcription) {
        throw new Error(transcribeData?.error || '文字起こしに失敗しました');
      }

      const transcriptionId = transcribeData.transcription.id;
      const segments = transcribeData.transcription.segments;

      // Step 2: AI formatting
      toast.info('AI整形処理中...', {
        description: `「${techniqueName}」の文字起こしを整形しています`,
      });

      const { data: formatData, error: formatError } = await supabase.functions.invoke('format-transcription', {
        body: { 
          segments,
          language: 'ja'
        }
      });

      if (formatError) {
        console.error('AI formatting error:', formatError);
        // Formatting failed but transcription succeeded - still consider it a success
      } else if (formatData?.segments) {
        // Update the transcription with formatted segments
        await supabase
          .from('video_transcriptions')
          .update({ 
            segments: formatData.segments,
            original_text: formatData.segments.map((s: any) => s.text).join(' ')
          })
          .eq('id', transcriptionId);
      }

      toast.success('自動文字起こし完了', {
        description: `「${techniqueName}」の文字起こしとAI整形が完了しました`,
        action: {
          label: '詳細を見る',
          onClick: () => navigate(`/admin/transcription/${transcriptionId}`)
        }
      });
      
      // Update transcription map
      setTranscriptionMap(prev => ({
        ...prev,
        [techniqueId]: { id: transcriptionId, status: 'completed' }
      }));
    } catch (error) {
      console.error('Auto transcription error:', error);
      toast.error('自動文字起こし失敗', {
        description: error instanceof Error ? error.message : '不明なエラー'
      });
    } finally {
      setTranscribingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(techniqueId);
        return newSet;
      });
    }
  };

  // Start transcription for a technique
  const handleStartTranscription = async (technique: Technique) => {
    if (!technique.video_url) {
      toast.error('動画URLがありません');
      return;
    }

    setTranscribingIds(prev => new Set(prev).add(technique.id));

    try {
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { 
          videoUrl: technique.video_url,
          techniqueId: technique.id
        }
      });

      if (error) {
        let message = error.message;
        const anyErr = error as any;
        if (anyErr?.context?.json) {
          try {
            const body = await anyErr.context.json();
            if (body?.error) message = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      if (data?.success && data?.transcription) {
        // AI formatting
        toast.info('AI整形処理中...', {
          description: `「${technique.name_ja}」の文字起こしを整形しています`,
        });

        try {
          const { data: formatData, error: formatError } = await supabase.functions.invoke('format-transcription', {
            body: { 
              segments: data.transcription.segments,
              language: 'ja'
            }
          });

          if (!formatError && formatData?.segments) {
            await supabase
              .from('video_transcriptions')
              .update({ 
                segments: formatData.segments,
                original_text: formatData.segments.map((s: any) => s.text).join(' ')
              })
              .eq('id', data.transcription.id);
          }
        } catch (formatErr) {
          console.error('Format error:', formatErr);
        }

        toast.success('文字起こし完了', {
          description: `「${technique.name_ja}」の文字起こしが完了しました`,
          action: {
            label: '詳細を見る',
            onClick: () => navigate(`/admin/transcription/${data.transcription.id}`)
          }
        });
        
        // Update transcription map
        setTranscriptionMap(prev => ({
          ...prev,
          [technique.id]: { id: data.transcription.id, status: 'completed' }
        }));
      } else {
        throw new Error(data?.error || '文字起こしに失敗しました');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('文字起こし失敗', {
        description: error instanceof Error ? error.message : '不明なエラー'
      });
    } finally {
      setTranscribingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(technique.id);
        return newSet;
      });
    }
  };


  // Re-encode video for adaptive bitrate streaming
  const handleReencodeVideo = async (technique: Technique) => {
    if (!technique.video_url) {
      toast.error('動画URLがありません');
      return;
    }

    setReEncodingIds(prev => new Set(prev).add(technique.id));

    try {
      const videoUrl = technique.video_url;
      
      // Check if it's a Bunny video
      if (videoUrl.includes('b-cdn.net') || videoUrl.includes('bunnycdn')) {
        // Extract video ID from Bunny URL
        const urlParts = videoUrl.split('/');
        const videoId = urlParts[urlParts.length - 2]; // Format: .../{videoId}/playlist.m3u8
        
        const { data, error } = await supabase.functions.invoke('upload-to-bunny', {
          body: { action: 'reencode-video', videoId }
        });

        if (error) throw error;
        
        toast.success('再エンコード開始', {
          description: `「${technique.name_ja}」の再エンコードを開始しました。完了まで数分かかります。`
        });
      } 
      // Cloudflare Stream videos - automatic ABR encoding on upload
      else if (videoUrl.includes('cloudflarestream.com') || videoUrl.includes('videodelivery.net')) {
        toast.info('Cloudflare Streamは自動エンコード済み', {
          description: 'Cloudflare Streamは動画アップロード時に自動でABR（Adaptive Bitrate）エンコードを行います。問題がある場合は動画を再アップロードしてください。'
        });
      }
      // Supabase storage or other
      else {
        toast.info('この動画は再エンコードに対応していません', {
          description: '編集ボタンから動画を再アップロードしてください。'
        });
      }
    } catch (error) {
      console.error('Re-encode error:', error);
      toast.error('再エンコードエラー', {
        description: error instanceof Error ? error.message : '不明なエラー'
      });
    } finally {
      setReEncodingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(technique.id);
        return newSet;
      });
    }
  };

  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const generateHashtags = (name: string, category: string): string[] => {
    // 除外する前置詞や接続詞
    const excludeWords = ['from', 'to', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'with', 'and', 'or'];
    
    // 英語名から単語を抽出
    const words = name
      .toLowerCase()
      .split(' ')
      .filter(word => !excludeWords.includes(word) && word.length > 2);
    
    // ユニークな単語のみを取得
    const uniqueWords = Array.from(new Set(words));
    
    // カテゴリーを追加
    const hashtags = [...uniqueWords];
    
    // カテゴリーマッピング
    const categoryMap: Record<string, string> = {
      'submission': 'submission',
      'control': 'control',
      'guard-pass': 'pass',
      'pull': 'sweep'
    };
    
    const categoryTag = categoryMap[category] || category;
    if (!hashtags.includes(categoryTag)) {
      hashtags.push(categoryTag);
    }
    
    return hashtags.map(tag => `#${tag}`);
  };

  const handleBulkUpdate = async () => {
    try {
      setIsBulkUpdating(true);
      
      // 全テクニックを取得
      const { data: allTechniques, error } = await supabase
        .from('techniques')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      if (!allTechniques) {
        toast.info('更新する技術がありません');
        return;
      }
      
      let updateCount = 0;
      
      for (const technique of allTechniques) {
        const updates: Partial<Technique> = {};
        let needsUpdate = false;
        
        // 英語名を capitalize
        const capitalizedName = capitalizeWords(technique.name);
        if (capitalizedName !== technique.name) {
          updates.name = capitalizedName;
          needsUpdate = true;
        }
        
        // ハッシュタグがない場合は自動生成
        if (!technique.hashtags || technique.hashtags.length === 0) {
          updates.hashtags = generateHashtags(capitalizedName, technique.category);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('techniques')
            .update(updates)
            .eq('id', technique.id);
          
          if (updateError) {
            console.error(`Failed to update ${technique.name}:`, updateError);
          } else {
            updateCount++;
          }
        }
      }
      
      setIsBulkUpdating(false);
      
      toast.success('一括更新完了', {
        description: `${updateCount}件の技術を更新しました`
      });
      
      // リフレッシュ
      window.location.reload();
    } catch (error: unknown) {
      setIsBulkUpdating(false);
      toast.error('一括更新に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラー'
      });
    }
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
        
        // 動画がアップロードされた場合、自動で文字起こしを開始
        if (videoFile && videoUrl) {
          startAutoTranscription(editingTechnique.id, videoUrl, formData.name_ja);
        }
      } else {
        const created = await createTechnique.mutateAsync(techniqueData);
        toast.success("技術を作成しました");
        
        // 新規作成時に動画がある場合、自動で文字起こしを開始
        if (videoFile && videoUrl && created?.id) {
          startAutoTranscription(created.id, videoUrl, formData.name_ja);
        }
      }

      // シリーズ名が更新された場合はリストを再取得
      if (formData.series_name && formData.series_name.trim() !== '') {
        await refetchSeriesNames();
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
    
    // Get translation provider preference from localStorage
    const provider = localStorage.getItem('translation_provider') || 'elevenlabs';
    const functionName = provider === 'rask' ? 'rask-translate-video' : 'translate-video';
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
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
        
        // activeTranslationsに追加（providerも含める）
        setActiveTranslations(prev => [...prev, {
          projectId: data.projectId,
          techniqueId: translatingTechnique.id,
          techniqueName: translatingTechnique.name,
          targetLang: targetLanguage,
          startTime: Date.now(),
          provider: provider as 'rask' | 'elevenlabs',
        }]);
        
        const providerName = provider === 'rask' ? 'Rask.ai' : 'ElevenLabs';
        toast.success("動画翻訳を開始しました", {
          description: `${providerName}で翻訳中。完了すると通知されます。`,
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
        
        // merging_done も完了とみなす
        const isCompleted = data.status === 'completed' || 
                          data.status === 'done' || 
                          data.status === 'merging_done';
        
        // 進行中のステータス（ポーリング継続）
        const isInProgress = [
          'uploading', 'uploaded', 'transcription_started', 
          'translation_started', 'voiceover_started', 'processing'
        ].includes(data.status);
        
        if (isCompleted && data.videoUrl) {
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
        } else if (isInProgress) {
          // Poll again after 10 seconds for any in-progress status
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
    provider?: 'rask' | 'elevenlabs';
  }) => {
    try {
      toast.info("ステータス確認中...", {
        description: `「${translation.techniqueName}」の翻訳状況を確認しています`,
      });

      // Use the correct function based on provider
      const functionName = translation.provider === 'rask' ? 'rask-check-status' : 'check-translation-status';
      const { data: statusData, error: statusError } = await supabase.functions.invoke(functionName, {
        body: { 
          projectId: translation.projectId,
          techniqueId: translation.techniqueId,
          targetLanguage: translation.targetLang,
        }
      });

      if (statusError) {
        toast.error("確認エラー", {
          description: "ステータスの確認に失敗しました",
        });
        return;
      }

      // merging_done も完了として扱う
      const isCompleted = statusData?.status === 'completed' || 
                         statusData?.status === 'merging_done';

      if (isCompleted && statusData?.videoUrl) {
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
      category: "",
      hashtags: [],
      series_name: "",
      series_order: null,
      series_prefix: "",
      visibility: "public",
    });
    setHashtagInput("");
    setVideoFile(null);
    setEditingTechnique(null);
    setMaxSeriesOrder(null);
  };

  const openEditDialog = (technique: Technique) => {
    // Navigate to edit page instead of opening modal
    navigate(`/admin/technique/${technique.id}`);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold">技術管理</h2>
        {isAdmin && (
          <Button onClick={() => navigate('/admin/technique/new')}>
            <Upload className="h-4 w-4 mr-2" />
            新規技術追加
          </Button>
        )}
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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="技術名で検索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Main notation filter - sorted by video count */}
          <Select value={notationFilter} onValueChange={(value) => {
            setNotationFilter(value);
            const notation = notationsForFilter?.find(n => n.id === value);
            if (notation) {
              setNotationLabel(`${notation.code} - ${notation.name_ja}`);
            } else {
              setNotationLabel('');
            }
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="略称で絞り込み" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px]">
              <SelectItem value="all">すべて</SelectItem>
              {notationsForFilter?.map((notation) => (
                <SelectItem key={notation.id} value={notation.id}>
                  <span className="font-mono">{notation.code}</span>
                  <span className="ml-2 text-muted-foreground">{notation.name_ja}</span>
                  <span className="ml-2 text-xs text-muted-foreground/70">
                    ({notation.technique_count || 0}件)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="並び順" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="order">表示順</SelectItem>
              <SelectItem value="name">名前順</SelectItem>
              <SelectItem value="category">カテゴリー順</SelectItem>
              <SelectItem value="series">シリーズ順</SelectItem>
              <SelectItem value="created">追加日順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active notation filter badge */}
      {notationFilter !== 'all' && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 h-7 px-3">
            <span>略称: {notationLabel || notationFilter}</span>
            <button
              onClick={() => {
                setNotationFilter('all');
                setNotationLabel('');
              }}
              className="ml-1 hover:text-destructive"
            >
              ×
            </button>
          </Badge>
        </div>
      )}

      {/* Bulk fetch results summary */}
      {lastBulkFetchResults && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">一括取得結果</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => setLastBulkFetchResults(null)}
            >
              閉じる
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">対象</span>
              <p className="font-medium">{lastBulkFetchResults.total}件</p>
            </div>
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">DB保存確認</span>
              <p className="font-medium text-green-600">{lastBulkFetchResults.verifiedSaved}件</p>
            </div>
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">取得エラー</span>
              <p className="font-medium text-destructive">
                {lastBulkFetchResults.details.filter(d => d.status === 'fetch_error').length}件
              </p>
            </div>
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">保存エラー</span>
              <p className="font-medium text-destructive">
                {lastBulkFetchResults.details.filter(d => d.status === 'failed').length}件
              </p>
            </div>
          </div>
          {lastBulkFetchResults.details.filter(d => d.status !== 'saved').length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                失敗した動画を表示 ({lastBulkFetchResults.details.filter(d => d.status !== 'saved').length}件)
              </summary>
              <ul className="mt-1 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                {lastBulkFetchResults.details.filter(d => d.status !== 'saved').map(d => (
                  <li key={d.id} className="text-muted-foreground">
                    • {d.name} ({d.status === 'fetch_error' ? '取得失敗' : '保存失敗'})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Video Cards */}
      <div className="grid gap-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 flex gap-4">
              <Skeleton className="w-40 h-24 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))
        ) : (() => {
          const displayData = data?.data || [];
          
          if (displayData.length === 0) {
            return (
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                技術が見つかりませんでした
              </div>
            );
          }
          
          return displayData.map((technique) => {
            // Get dubbed languages from video_metadata
            const getDubbedLanguages = (t: Technique): string[] => {
              const langs: string[] = [];
              if (t.video_metadata && typeof t.video_metadata === 'object') {
                Object.keys(t.video_metadata).forEach(lang => {
                  // 日本語は除外（オリジナル音声であり吹替ではない）
                  if (lang === 'ja') return;
                  const meta = (t.video_metadata as Record<string, any>)[lang];
                  if (meta?.video_url) {
                    langs.push(lang);
                  }
                });
              }
              return langs;
            };
            
            return (
              <VideoCard
                key={technique.id}
                technique={technique}
                transcription={transcriptionMap[technique.id] || null}
                subtitleLanguages={subtitleMap[technique.id] || []}
                dubbedLanguages={getDubbedLanguages(technique)}
                notations={notationMap[technique.id] || []}
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
                    setTranscriptionDialogTechnique(technique);
                  }
                }}
                onTranslate={() => {
                  setTranslationDialogTechnique(technique);
                }}
                onDelete={() => handleDelete(technique.id)}
                onFetchDuration={() => handleFetchSingleDuration(technique)}
                onDownload={() => handleDownloadVideo(technique)}
                isDownloading={downloadingId === technique.id}
                isAdmin={isAdmin}
              />
            );
          });
        })()}
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
            setPage(1);
          }}
        />
      )}

      {/* Admin Tools Section - Compact, at bottom */}
      {isAdmin && (
        <Collapsible defaultOpen={false} className="mt-8 mb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs border rounded bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">管理ツール</span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Legacy filters (scheduled for deletion) */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded border border-dashed">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-muted-foreground shrink-0">旧絞り込み（削除予定）:</span>
              <Select value={categoryFilter} onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue placeholder="カテゴリー" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">すべて</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={seriesFilter} onValueChange={(value) => {
                setSeriesFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-[150px] h-7 text-xs">
                  <SelectValue placeholder="シリーズ" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">すべて</SelectItem>
                  {seriesMapping.map((mapping) => (
                    <SelectItem key={mapping.series_prefix} value={mapping.series_prefix}>
                      {mapping.series_prefix}. {mapping.series_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleBulkUpdate}
                variant="outline"
                size="sm"
                disabled={isBulkUpdating}
                className="text-xs h-7"
              >
                {isBulkUpdating ? '更新中...' : '名前・タグ一括更新'}
              </Button>
              <Button 
                onClick={handleGenerateMissingThumbnails}
                variant="outline"
                size="sm"
                disabled={isGeneratingThumbnails}
                className="text-xs h-7"
              >
                {isGeneratingThumbnails ? '生成中...' : 'サムネイル一括生成'}
              </Button>
              {missingThumbnailCount > 0 && (
                <Button 
                  onClick={handleFixThumbnails}
                  disabled={isFixingThumbnails}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-amber-500/50 text-amber-600"
                >
                  {isFixingThumbnails ? '修復中...' : `サムネイル修復 (${missingThumbnailCount}件)`}
                </Button>
              )}
              <Button 
                onClick={handleFetchAllDurations}
                disabled={isFetchingDurations}
                variant="outline"
                size="sm"
                className="text-xs h-7"
              >
                <Clock className="w-3 h-3 mr-1" />
                {isFetchingDurations 
                  ? '取得中...' 
                  : missingDurationCount > 0 
                    ? `動画時間一括取得 (${missingDurationCount}件)`
                    : '動画時間一括取得'}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={showVideoPreview}
        onOpenChange={setShowVideoPreview}
        technique={previewTechnique}
      />

      {/* Transcription Quick Dialog */}
      <TranscriptionQuickDialog
        open={!!transcriptionDialogTechnique}
        onOpenChange={(open) => !open && setTranscriptionDialogTechnique(null)}
        technique={transcriptionDialogTechnique}
        onTranscriptionComplete={() => {
          // Refresh transcription map
          supabase
            .from('video_transcriptions')
            .select('id, technique_id, status')
            .then(({ data }) => {
              const map: Record<string, { id: string; status: string }> = {};
              data?.forEach(t => {
                if (t.technique_id) {
                  map[t.technique_id] = { id: t.id, status: t.status };
                }
              });
              setTranscriptionMap(map);
            });
        }}
      />

      {/* Translation Quick Dialog */}
      <TranslationQuickDialog
        open={!!translationDialogTechnique}
        onOpenChange={(open) => !open && setTranslationDialogTechnique(null)}
        technique={translationDialogTechnique as any}
        onTranslationStarted={() => {
          // Refresh data after translation starts
        }}
      />




      {/* Video Translation Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>動画翻訳</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {translatingTechnique?.name} の動画を他言語に翻訳します
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTranslateDialog(false);
                    navigate('/admin');
                    // Use setTimeout to ensure the navigation happens first
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'video-localization' }));
                    }, 100);
                  }}
                  className="text-xs"
                >
                  <Languages className="h-3 w-3 mr-1" />
                  動画ローカライズ
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-3 block">翻訳先言語を選択</label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {allLanguages.map(lang => {
                    const metadata = (translatingTechnique as any)?.video_metadata?.[lang.code];
                    // 進行中のステータスをすべてチェック
                    const inProgressStatuses = ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing'];
                    const isProcessing = translationStatus.status && inProgressStatuses.includes(translationStatus.status) && targetLanguage === lang.code && translationProjectId;
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
                      ステータス: {
                        translationStatus.status === 'uploading' ? '動画アップロード中...' :
                        translationStatus.status === 'uploaded' ? 'アップロード完了' :
                        translationStatus.status === 'transcription_started' ? '文字起こし中...' :
                        translationStatus.status === 'translation_started' ? '翻訳処理中...' :
                        translationStatus.status === 'voiceover_started' ? '音声生成中...' :
                        translationStatus.status === 'merging_done' ? '動画結合完了' :
                        translationStatus.status === 'completed' ? '翻訳完了' : 
                        translationStatus.status === 'failed' ? '失敗' : 
                        translationStatus.status === 'processing' ? '処理中...' : 
                        translationStatus.status
                      }
                    </p>
                    {translationStatus.progress > 0 && (
                      <p className="text-sm text-muted-foreground">{translationStatus.progress}%</p>
                    )}
                  </div>
                  {translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing'].includes(translationStatus.status) && (
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
                disabled={isTranslating || (translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing'].includes(translationStatus.status))}
              >
                {isTranslating ? '開始中...' : 
                 translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing'].includes(translationStatus.status) ? '処理中' : 
                 '翻訳開始'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
