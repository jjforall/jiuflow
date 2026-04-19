import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions } from "@/components/ui/input-with-suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Search, Check, Languages, ChevronDown, Loader2, RefreshCw, ImageIcon, Wrench, Clock, FileText, Film, Hash, Tags, BookOpen, FolderOpen, Eye, AlertTriangle, Globe, Link2, Lock, X, Cloud, Trash2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { cn } from "@/lib/utils";

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
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "category" | "series" | "created">("order");
  
  // Fetch notations for filter dropdown (sorted by video count)
  const { data: notationsForFilter } = useNotations();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const { startCloudflareUpload, startCloudflareUploadBackground } = useUpload();
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
  const [editLanguage, setEditLanguage] = useState<"ja" | "en" | "pt">("ja");
  const [isTranslatingField, setIsTranslatingField] = useState(false);
  const [replaceVideoFile, setReplaceVideoFile] = useState<File | null>(null);
  const [isReplacingVideo, setIsReplacingVideo] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState(0);
  // Cloudflare Stream health-check state
  const [cfHealthMap, setCfHealthMap] = useState<Record<string, 'ok' | 'missing' | 'checking'>>({});
  const [isCheckingCfHealth, setIsCheckingCfHealth] = useState(false);
  const [cfMissingCount, setCfMissingCount] = useState<number | null>(null);
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
    provider?: 'rask' | 'elevenlabs' | 'heygen' | 'unknown';
  }>>([]);
  
  // Helper function to get processing languages for a specific technique
  const getProcessingLanguagesForTechnique = (techniqueId: string): string[] => {
    return activeTranslations
      .filter(t => t.techniqueId === techniqueId)
      .map(t => t.targetLang);
  };
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [seriesNameSuggestions, setSeriesNameSuggestions] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [previewTechnique, setPreviewTechnique] = useState<VideoPreviewTechnique | null>(null);
  const [previewInitialLanguage, setPreviewInitialLanguage] = useState<string | undefined>(undefined);
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

  // Delete confirmation dialog state
  const [deleteTargetTechnique, setDeleteTargetTechnique] = useState<Technique | null>(null);

  // Translation provider setting
  type TranslationProvider = "elevenlabs" | "rask" | "heygen";
  const [translationProvider, setTranslationProvider] = useState<TranslationProvider>("elevenlabs");
  
  // Cloudflare cleanup states
  interface CloudflareCleanupPreview {
    summary: {
      totalVideosInCloudflare: number;
      totalMinutesInCloudflare: number;
      videosToKeep: number;
      minutesToKeep: number;
      videosToDelete: number;
      minutesToDelete: number;
      estimatedSpaceRecovery: string;
    };
    toDelete: Array<{ uid: string; duration: number; name: string }>;
    toKeep: Array<{ uid: string; duration: number; name: string }>;
  }
  const [cfCleanupPreview, setCfCleanupPreview] = useState<CloudflareCleanupPreview | null>(null);
  const [isCfLoading, setIsCfLoading] = useState(false);
  const [isCfDeleting, setIsCfDeleting] = useState(false);


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

  // Load translation provider preference
  useEffect(() => {
    const savedProvider = localStorage.getItem('translation_provider');
    if (savedProvider === 'rask' || savedProvider === 'elevenlabs') {
      setTranslationProvider(savedProvider);
    }
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

  // ===== Cloudflare Stream health check =====
  // Verifies that every technique's Cloudflare video URL still resolves to an
  // actual stream asset. Marks 404s as "missing" so the admin can re-upload.
  const handleCheckCloudflareHealth = async () => {
    setIsCheckingCfHealth(true);
    try {
      const { data: techniques, error } = await supabase
        .from('techniques')
        .select('id, video_url')
        .not('video_url', 'is', null);

      if (error) throw error;
      const items = (techniques || []).filter(
        (t) => t.video_url && (t.video_url.includes('videodelivery.net') || t.video_url.includes('cloudflarestream.com'))
      );

      if (items.length === 0) {
        toast.info('チェック対象のCloudflare動画がありません');
        return;
      }

      // Mark all as checking
      setCfHealthMap((prev) => {
        const next = { ...prev };
        items.forEach((t) => { next[t.id] = 'checking'; });
        return next;
      });

      // Send in batches of 50 URLs (HEAD checks make this slower per item)
      const BATCH = 50;
      let missing = 0;
      const newMap: Record<string, 'ok' | 'missing'> = {};
      const missingDetails: Array<{ id: string; reason?: string }> = [];

      for (let i = 0; i < items.length; i += BATCH) {
        const slice = items.slice(i, i + BATCH);
        const urls = slice.map((t) => t.video_url!);
        const { data, error: fnError } = await supabase.functions.invoke(
          'check-cloudflare-video-health',
          { body: { urls } }
        );
        if (fnError) {
          console.error('[CF-HEALTH] batch error', fnError);
          // Mark this batch as missing so UI doesn't stay in "checking" forever
          slice.forEach((t) => {
            newMap[t.id] = 'missing';
            missing++;
            missingDetails.push({ id: t.id, reason: 'batch_error' });
          });
          continue;
        }
        const results: Array<{ url: string; ok: boolean; reason?: string }> = data?.results || [];
        // Map by index (Edge function preserves order)
        slice.forEach((t, idx) => {
          const r = results[idx];
          if (!r) {
            newMap[t.id] = 'missing';
            missing++;
            missingDetails.push({ id: t.id, reason: 'no_result' });
            return;
          }
          const status: 'ok' | 'missing' = r.ok ? 'ok' : 'missing';
          newMap[t.id] = status;
          if (!r.ok) {
            missing++;
            missingDetails.push({ id: t.id, reason: r.reason });
          }
        });

        // Incremental UI update so user sees progress and no card stays "checking"
        setCfHealthMap((prev) => ({ ...prev, ...newMap }));
      }

      // Final overwrite to ensure map is fully synced (clears any stragglers)
      setCfHealthMap((prev) => {
        const next = { ...prev };
        items.forEach((t) => {
          next[t.id] = newMap[t.id] ?? 'missing';
        });
        return next;
      });
      setCfMissingCount(missing);
      console.log('[CF-HEALTH] Summary', { total: items.length, missing, missingDetails: missingDetails.slice(0, 10) });
      if (missing === 0) {
        toast.success(`${items.length}件すべて正常です`);
      } else {
        toast.warning(`${missing}件の動画がCloudflare上に存在しません`, {
          description: '赤バッジ「動画欠損」をクリックして再アップロードしてください',
        });
      }
    } catch (error) {
      console.error('[CF-HEALTH] error', error);
      toast.error(error instanceof Error ? error.message : 'チェックに失敗しました');
    } finally {
      setIsCheckingCfHealth(false);
    }
  };

  const handleProviderChange = (value: TranslationProvider) => {
    setTranslationProvider(value);
    localStorage.setItem('translation_provider', value);
    const providerNames: Record<TranslationProvider, string> = {
      elevenlabs: 'ElevenLabs',
      rask: 'Rask.ai',
      heygen: 'HeyGen'
    };
    toast.success(`翻訳プロバイダーを ${providerNames[value]} に変更しました`);
  };

  // Cloudflare cleanup handlers
  const handleCloudflarePreview = async () => {
    setIsCfLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ログインが必要です");
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-cloudflare-videos?mode=preview`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "プレビュー取得に失敗しました");
      }
      
      const data = await response.json();
      setCfCleanupPreview(data);
      toast.success("プレビューを取得しました");
    } catch (error) {
      console.error("Cloudflare preview error:", error);
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsCfLoading(false);
    }
  };

  const handleCloudflareExecute = async () => {
    if (!cfCleanupPreview || cfCleanupPreview.summary.videosToDelete === 0) return;
    
    setIsCfDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ログインが必要です");
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-cloudflare-videos?mode=execute`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "削除に失敗しました");
      }
      
      const data = await response.json();
      toast.success(`${data.summary.totalDeleted}本の動画を削除しました（${data.summary.minutesRecovered}分回復）`);
      setCfCleanupPreview(null);
    } catch (error) {
      console.error("Cloudflare execute error:", error);
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsCfDeleting(false);
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
      
      // Refetch data to update cards - await to ensure data is refetched
      await refetch?.();
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
      
      // Update missing count
      setMissingDurationCount(prev => Math.max(0, prev - 1));
      
      // Refresh data to show updated duration - await to ensure data is refetched
      await refetch?.();
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

  // プロジェクトIDからプロバイダーを推定する関数
  const inferProvider = (projectId: string): 'heygen' | 'rask' | 'elevenlabs' | 'unknown' => {
    // HeyGen: 20文字の英数字（例: abc123XYZ456def789gh）
    if (/^[a-zA-Z0-9]{15,25}$/.test(projectId) && !projectId.includes('-') && !projectId.includes('_')) {
      return 'heygen';
    }
    // ElevenLabs dubbing_id: ハイフンやアンダースコアを含む長めのID
    if (/^[a-zA-Z0-9_-]{20,50}$/.test(projectId) && (projectId.includes('_') || projectId.includes('-'))) {
      return 'elevenlabs';
    }
    // Rask.ai: UUID形式（ハイフン区切りで36文字程度）
    if (/^[a-f0-9-]{30,40}$/.test(projectId.toLowerCase()) && projectId.includes('-')) {
      return 'rask';
    }
    return 'unknown';
  };

  // LocalStorageから進行中の翻訳を復元（24時間以内のジョブのみ）
  useEffect(() => {
    const stored = localStorage.getItem('activeTranslations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // 24時間以内のジョブのみ復元
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        const validTranslations = parsed.filter((t: any) => {
          if (!t.startTime || !t.projectId || !t.techniqueId) {
            console.warn('Invalid translation data in localStorage:', t);
            return false;
          }
          if (t.startTime < twentyFourHoursAgo) {
            console.warn('Removing expired translation from localStorage:', t.projectId);
            return false;
          }
          return true;
        }).map((t: any) => {
          // プロバイダーが欠落している場合は推定する
          if (!t.provider || t.provider === 'unknown') {
            const inferred = inferProvider(t.projectId);
            console.log(`Inferred provider for ${t.projectId}: ${inferred}`);
            return { ...t, provider: inferred };
          }
          return t;
        });
        
        setActiveTranslations(validTranslations);
        
        // クリーンアップされたデータで保存し直す
        if (validTranslations.length !== parsed.length || JSON.stringify(validTranslations) !== JSON.stringify(parsed)) {
          if (validTranslations.length > 0) {
            localStorage.setItem('activeTranslations', JSON.stringify(validTranslations));
          } else {
            localStorage.removeItem('activeTranslations');
          }
        }
      } catch (e) {
        console.error('Failed to parse stored translations:', e);
        localStorage.removeItem('activeTranslations'); // 壊れたデータは削除
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
          let statusData = null;
          let statusError = null;
          
          // Provider が unknown の場合はフォールバック試行
          if (!translation.provider || translation.provider === 'unknown') {
            // 3つのエンドポイントを順番に試行
            const endpoints = ['heygen-check-status', 'check-translation-status', 'rask-check-status'];
            for (const endpoint of endpoints) {
              const { data, error } = await supabase.functions.invoke(endpoint, {
                body: { 
                  projectId: translation.projectId,
                  techniqueId: translation.techniqueId,
                  targetLanguage: translation.targetLang
                }
              });
              
              // 成功またはprogressが返ってきた場合はそれを使う
              if (!error && data && (data.status === 'dubbed' || data.status === 'completed' || data.progress > 0)) {
                statusData = data;
                console.log(`Fallback success with ${endpoint} for ${translation.projectId}`);
                break;
              }
            }
            
            // どのエンドポイントも成功しなかった場合
            if (!statusData) {
              console.warn(`All endpoints failed for unknown provider: ${translation.projectId}`);
              continue;
            }
          } else {
            // 通常のルーティング
            const statusEndpoint = translation.provider === 'heygen' 
              ? 'heygen-check-status'
              : translation.provider === 'rask'
                ? 'rask-check-status'
                : 'check-translation-status';
            
            const result = await supabase.functions.invoke(statusEndpoint, {
              body: { 
                projectId: translation.projectId,
                techniqueId: translation.techniqueId,
                targetLanguage: translation.targetLang
              }
            });
            
            statusData = result.data;
            statusError = result.error;
          }

          // ステータスチェック後、DBにレコードが存在するか確認（孤児ジョブ検出）
          const { data: historyRecord } = await supabase
            .from('translation_history')
            .select('id')
            .eq('project_id', translation.projectId)
            .maybeSingle();

          // DBにレコードがない場合は孤児ジョブとして削除
          if (!historyRecord) {
            console.warn(`[checkAllTranslations] Orphan job detected (no DB record): ${translation.projectId}`);
            
            // 開始から6分以上経過している場合のみ削除（開始直後のDB遅延を考慮）
            const elapsedHours = (Date.now() - translation.startTime) / (1000 * 60 * 60);
            if (elapsedHours > 0.1) {
              toast.info("孤児翻訳ジョブを削除しました", {
                description: `「${translation.techniqueName}」のDBレコードが見つからないため削除しました`,
              });
              
              setActiveTranslations(prev => 
                prev.filter(t => t.projectId !== translation.projectId)
              );
              continue;
            }
          }

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
          } else if (statusData?.status === 'failed' || statusData?.failed === true) {
            // 失敗した翻訳を自動削除（HeyGenの"not found"エラーも含む）
            const errorHint = statusData?.hint || '';
            toast.error("動画翻訳失敗", {
              description: `「${translation.techniqueName}」の翻訳処理に失敗しました${errorHint ? '\n' + errorHint : ''}`,
            });

            setActiveTranslations(prev => 
              prev.filter(t => t.projectId !== translation.projectId)
            );
          } else {
            // 24時間以上経過したジョブを自動削除
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (translation.startTime < twentyFourHoursAgo) {
              console.warn(`Removing stale translation job: ${translation.projectId}`);
              toast.info("古い翻訳ジョブを削除しました", {
                description: `「${translation.techniqueName}」は24時間以上前に開始されたため削除されました`,
              });
              
              setActiveTranslations(prev => 
                prev.filter(t => t.projectId !== translation.projectId)
              );
            }
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

  // 翻訳動画（吹き替え）を削除する関数
  const handleDeleteDubbing = async (technique: Technique, langCode: string) => {
    const langName = allLanguages.find(l => l.code === langCode)?.nativeName || langCode;
    
    if (!confirm(`「${technique.name_ja || technique.name}」の${langName}吹き替え音声を削除しますか？\n\nこの操作は取り消せません。`)) {
      return;
    }
    
    try {
      // video_metadataから該当言語のエントリを削除
      const currentMetadata = (technique.video_metadata as Record<string, any>) || {};
      const videoUrlToDelete = currentMetadata[langCode]?.video_url;
      
      // 該当言語のエントリを除いた新しいmetadataを作成
      const { [langCode]: removed, ...updatedMetadata } = currentMetadata;
      
      // DBを更新
      const { error } = await supabase
        .from('techniques')
        .update({ video_metadata: Object.keys(updatedMetadata).length > 0 ? updatedMetadata : null })
        .eq('id', technique.id);
      
      if (error) throw error;
      
      toast.success(`${langName}吹き替えを削除しました`);
      
      // Cloudflare Streamからも削除を試みる（バックグラウンドで）
      if (videoUrlToDelete) {
        try {
          const match = videoUrlToDelete.match(/videodelivery\.net\/([a-f0-9]{32})/i);
          if (match?.[1]) {
            // cleanup-cloudflare-videos edge functionを使用して削除（オプション）
            console.log('Video to delete from Cloudflare:', match[1]);
          }
        } catch (cfError) {
          console.error('Failed to delete from Cloudflare:', cfError);
        }
      }
      
      // データを再取得
      await refetch?.();
    } catch (error) {
      console.error('Delete dubbing error:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました');
    }
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
    visibility: visibilityFilter as 'all' | 'public' | 'unlisted' | 'private',
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

  const handleDelete = (technique: Technique) => {
    setDeleteTargetTechnique(technique);
  };
  
  const confirmDelete = async () => {
    if (deleteTargetTechnique) {
      await deleteTechnique.mutateAsync(deleteTargetTechnique.id);
      setDeleteTargetTechnique(null);
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
    const functionName = provider === 'rask' 
      ? 'rask-translate-video' 
      : provider === 'heygen'
        ? 'heygen-translate-video'
        : 'translate-video';
    
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
          provider: provider as 'rask' | 'elevenlabs' | 'heygen',
        }]);
        
        const providerName = provider === 'rask' ? 'Rask.ai' : provider === 'heygen' ? 'HeyGen' : 'ElevenLabs';
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
    provider?: 'rask' | 'elevenlabs' | 'heygen' | 'unknown';
  }) => {
    try {
      toast.info("ステータス確認中...", {
        description: `「${translation.techniqueName}」の翻訳状況を確認しています`,
      });

      // Use the correct function based on provider
      const functionName = translation.provider === 'rask' 
        ? 'rask-check-status' 
        : translation.provider === 'heygen' 
          ? 'heygen-check-status' 
          : 'check-translation-status';
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
      } else if (statusData?.status === 'failed' || statusData?.failed === true) {
        const errorHint = statusData?.hint || '';
        toast.error("動画翻訳失敗", {
          description: `「${translation.techniqueName}」の翻訳処理に失敗しました${errorHint ? '\n' + errorHint : ''}`,
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
    // Open edit modal instead of navigating to edit page
    setEditingTechnique(technique);
    setFormData({
      name: technique.name || "",
      name_ja: technique.name_ja || "",
      name_pt: technique.name_pt || "",
      description: technique.description || "",
      description_ja: technique.description_ja || "",
      description_pt: technique.description_pt || "",
      category: technique.category || "",
      hashtags: technique.hashtags || [],
      series_name: technique.series_name || "",
      series_order: technique.series_order,
      series_prefix: technique.series_prefix || "",
      visibility: (technique.visibility || "public") as "public" | "unlisted" | "private",
    });
    setEditLanguage("ja"); // Reset to Japanese when opening dialog
    setReplaceVideoFile(null);
    setReplaceProgress(0);
    setShowEditDialog(true);
  };
  
  // Helper to translate from Japanese to another language
  const translateFieldFromJapanese = async (targetLang: "en" | "pt") => {
    if (!formData.name_ja && !formData.description_ja) {
      toast.error("日本語の内容がありません");
      return;
    }
    
    setIsTranslatingField(true);
    try {
      // Translate name
      if (formData.name_ja) {
        const { data: nameData, error: nameError } = await supabase.functions.invoke('translate-text', {
          body: { 
            text: formData.name_ja,
            sourceLang: 'ja',
            targetLang
          }
        });
        
        if (!nameError && nameData?.translatedText) {
          if (targetLang === "en") {
            setFormData(prev => ({ ...prev, name: nameData.translatedText }));
          } else {
            setFormData(prev => ({ ...prev, name_pt: nameData.translatedText }));
          }
        }
      }
      
      // Translate description
      if (formData.description_ja) {
        const { data: descData, error: descError } = await supabase.functions.invoke('translate-text', {
          body: { 
            text: formData.description_ja,
            sourceLang: 'ja',
            targetLang
          }
        });
        
        if (!descError && descData?.translatedText) {
          if (targetLang === "en") {
            setFormData(prev => ({ ...prev, description: descData.translatedText }));
          } else {
            setFormData(prev => ({ ...prev, description_pt: descData.translatedText }));
          }
        }
      }
      
      toast.success("翻訳を取得しました");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("翻訳に失敗しました");
    } finally {
      setIsTranslatingField(false);
    }
  };
  
  const handleSaveEdit = async () => {
    if (!editingTechnique) return;
    
    try {
      // Save non-video fields first
      await updateTechnique.mutateAsync({
        id: editingTechnique.id,
        name: formData.name,
        name_ja: formData.name_ja,
        name_pt: formData.name_pt,
        description: formData.description,
        description_ja: formData.description_ja,
        description_pt: formData.description_pt,
        visibility: formData.visibility,
        hashtags: formData.hashtags,
        video_url: editingTechnique.video_url,
        video_url_ja: editingTechnique.video_url_ja,
        thumbnail_url: editingTechnique.thumbnail_url,
        thumbnail_url_ja: editingTechnique.thumbnail_url_ja,
        video_metadata: editingTechnique.video_metadata,
      });

      // If video file selected, start background upload (fire-and-forget)
      if (replaceVideoFile) {
        const techniqueId = editingTechnique.id;
        const techniqueLabel = `${editingTechnique.series_prefix}-${editingTechnique.series_order} ${editingTechnique.name_ja || editingTechnique.name}`;
        const currentMetadata = (editingTechnique.video_metadata as Record<string, any>) || {};
        
        startCloudflareUploadBackground(
          replaceVideoFile,
          editingTechnique.name_ja || editingTechnique.name || 'video',
          techniqueLabel,
          async (result) => {
            const videoMetadata = {
              ...currentMetadata,
              ja: {
                created_at: currentMetadata?.ja?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                video_url: result.videoUrl,
                cloudflare_video_id: result.cloudflareVideoId,
              }
            };
            
            await updateTechnique.mutateAsync({
              id: techniqueId,
              video_url: result.videoUrl,
              video_url_ja: result.videoUrl,
              thumbnail_url: result.thumbnailUrl,
              thumbnail_url_ja: result.thumbnailUrl,
              video_metadata: videoMetadata,
            });
            
            toast.success(`${techniqueLabel} の動画差し替えが完了しました`);
            refetch();
          }
        );
        
        toast.info("動画のアップロードをバックグラウンドで開始しました。右下で進捗を確認できます。");
      } else {
        toast.success("更新しました");
      }
      
      setShowEditDialog(false);
      setEditingTechnique(null);
      setReplaceVideoFile(null);
      setReplaceProgress(0);
      refetch();
    } catch (error) {
      console.error('Error updating technique:', error);
      toast.error("更新に失敗しました");
    }
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Languages className="h-5 w-5" />
              進行中の翻訳 ({activeTranslations.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const threshold = Date.now() - (24 * 60 * 60 * 1000);
                const cleaned = activeTranslations.filter(t => t.startTime >= threshold);
                const removedCount = activeTranslations.length - cleaned.length;
                
                if (removedCount > 0) {
                  setActiveTranslations(cleaned);
                  toast.success(`${removedCount}件の古いジョブを削除しました`);
                } else {
                  toast.info("削除対象のジョブがありません");
                }
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              古いジョブをクリア
            </Button>
          </div>
          <div className="space-y-3">
            {activeTranslations.map((translation) => {
              const elapsedTime = Math.floor((Date.now() - translation.startTime) / 1000);
              const minutes = Math.floor(elapsedTime / 60);
              const seconds = elapsedTime % 60;
              const langName = allLanguages.find(l => l.code === translation.targetLang)?.nativeName || translation.targetLang;
              
              // プロバイダーバッジの色とラベル
              const getProviderBadge = (provider?: string) => {
                switch (provider) {
                  case 'heygen':
                    return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">HeyGen</Badge>;
                  case 'rask':
                    return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Rask.ai</Badge>;
                  case 'elevenlabs':
                    return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">ElevenLabs</Badge>;
                  case 'unknown':
                    return (
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        プロバイダー不明
                      </Badge>
                    );
                  default:
                    return (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        不明
                      </Badge>
                    );
                }
              };
              
              return (
                <div key={translation.projectId} className="border rounded p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{translation.techniqueName}</p>
                        {getProviderBadge(translation.provider)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {langName}版 • 経過時間: {minutes}分{seconds}秒
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => manualCheckTranslation(translation)}
                      >
                        ステータス確認
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => {
                          setActiveTranslations(prev => prev.filter(t => t.projectId !== translation.projectId));
                          toast.success("翻訳エントリを削除しました");
                        }}
                        title="この翻訳エントリを削除"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
              <SelectValue placeholder="技術タグで絞り込み" />
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
          {/* Visibility filter */}
          <Select value={visibilityFilter} onValueChange={(value) => {
            setVisibilityFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="公開設定" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  公開
                </div>
              </SelectItem>
              <SelectItem value="unlisted">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3 w-3" />
                  限定公開
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  非公開
                </div>
              </SelectItem>
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
          {/* Cloudflare health-check button (always visible next to search/filters) */}
          <Button
            onClick={handleCheckCloudflareHealth}
            disabled={isCheckingCfHealth}
            variant={cfMissingCount && cfMissingCount > 0 ? "destructive" : "default"}
            size="default"
            className="whitespace-nowrap"
          >
            {isCheckingCfHealth ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />チェック中...</>
            ) : cfMissingCount === null ? (
              <><Cloud className="w-4 h-4 mr-2" />動画ファイル健全性チェック</>
            ) : cfMissingCount === 0 ? (
              <><Cloud className="w-4 h-4 mr-2" />全動画OK ({Object.keys(cfHealthMap).length}件)</>
            ) : (
              <><AlertTriangle className="w-4 h-4 mr-2" />動画欠損 {cfMissingCount}件</>
            )}
          </Button>
        </div>
      </div>

      {/* Active notation filter badge */}
      {notationFilter !== 'all' && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 h-7 px-3">
            <span>技術タグ: {notationLabel || notationFilter}</span>
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
                processingLanguages={getProcessingLanguagesForTechnique(technique.id)}
                notations={notationMap[technique.id] || []}
                cfHealth={cfHealthMap[technique.id]}
                isFetchingDuration={fetchingDurationId === technique.id}
                onEdit={() => openEditDialog(technique)}
                onPreview={(langCode) => {
                  if (technique.video_url) {
                    setPreviewTechnique(technique as VideoPreviewTechnique);
                    setPreviewInitialLanguage(langCode);
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
                onDelete={() => handleDelete(technique)}
                onDeleteDubbing={(langCode) => handleDeleteDubbing(technique, langCode)}
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
              <Button
                onClick={handleCheckCloudflareHealth}
                disabled={isCheckingCfHealth}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs h-7",
                  cfMissingCount && cfMissingCount > 0 && "border-destructive/50 text-destructive"
                )}
              >
                {isCheckingCfHealth ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />チェック中...</>
                ) : cfMissingCount === null ? (
                  <><Cloud className="w-3 h-3 mr-1" />動画ファイル健全性チェック</>
                ) : cfMissingCount === 0 ? (
                  <><Cloud className="w-3 h-3 mr-1" />全動画OK ({Object.keys(cfHealthMap).length}件)</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 mr-1" />動画欠損 {cfMissingCount}件</>
                )}
              </Button>
            </div>
            
            {/* Translation Provider Settings */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Video className="w-3.5 h-3.5" />
                <span>翻訳プロバイダー</span>
              </div>
              <RadioGroup
                value={translationProvider}
                onValueChange={(value) => handleProviderChange(value as TranslationProvider)}
                className="flex flex-wrap gap-3"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="elevenlabs" id="admin-elevenlabs" className="h-3.5 w-3.5" />
                  <Label htmlFor="admin-elevenlabs" className="text-xs cursor-pointer">ElevenLabs</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="rask" id="admin-rask" className="h-3.5 w-3.5" />
                  <Label htmlFor="admin-rask" className="text-xs cursor-pointer">Rask.ai</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="heygen" id="admin-heygen" className="h-3.5 w-3.5" />
                  <Label htmlFor="admin-heygen" className="text-xs cursor-pointer">HeyGen</Label>
                </div>
              </RadioGroup>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                  onClick={async () => {
                    if (!confirm('2時間以上経過した未完了の翻訳ジョブをクリーンアップしますか？\n（DBから失敗としてマークし、LocalStorageからも削除します）')) return;
                    
                    try {
                      const { data, error } = await supabase.functions.invoke('cleanup-stale-translations', {
                        body: { hoursThreshold: 2 }
                      });
                      
                      if (error) throw error;
                      
                      // Also clean up LocalStorage
                      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
                      const beforeCount = activeTranslations.length;
                      setActiveTranslations(prev => 
                        prev.filter(t => t.startTime >= twoHoursAgo)
                      );
                      const localCleanedCount = beforeCount - activeTranslations.filter(t => t.startTime >= twoHoursAgo).length;
                      
                      toast.success('クリーンアップ完了', {
                        description: `DB: ${data?.cleanedCount || 0}件, ローカル: ${localCleanedCount}件を処理しました`,
                      });
                    } catch (err) {
                      console.error('Cleanup error:', err);
                      toast.error('クリーンアップに失敗しました', {
                        description: err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-amber-500/50 text-amber-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  古い翻訳ジョブをクリーンアップ
                </Button>
              </div>
            </div>
            
            {/* Cloudflare Stream Cleanup */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Cloud className="w-3.5 h-3.5" />
                <span>Cloudflare Stream クリーンアップ</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCloudflarePreview} disabled={isCfLoading} variant="outline" size="sm" className="text-xs h-7">
                  {isCfLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  使用状況確認
                </Button>
                {cfCleanupPreview && cfCleanupPreview.summary.videosToDelete > 0 && (
                  <Button onClick={handleCloudflareExecute} disabled={isCfDeleting} variant="destructive" size="sm" className="text-xs h-7">
                    {isCfDeleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    不要動画削除 ({cfCleanupPreview.summary.videosToDelete}本)
                  </Button>
                )}
              </div>
              {cfCleanupPreview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">総動画</span>
                    <p className="font-medium">{cfCleanupPreview.summary.totalVideosInCloudflare}本</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">使用量</span>
                    <p className="font-medium">{cfCleanupPreview.summary.totalMinutesInCloudflare.toFixed(1)}分</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">保持</span>
                    <p className="font-medium text-primary">{cfCleanupPreview.summary.videosToKeep}本</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">削除対象</span>
                    <p className="font-medium text-destructive">{cfCleanupPreview.summary.videosToDelete}本</p>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={showVideoPreview}
        onOpenChange={(open) => {
          setShowVideoPreview(open);
          if (!open) setPreviewInitialLanguage(undefined);
        }}
        technique={previewTechnique}
        initialLanguage={previewInitialLanguage}
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
        onTranslationStarted={(info) => {
          // Add to active translations tracking
          setActiveTranslations(prev => [...prev, {
            projectId: info.projectId,
            techniqueId: info.techniqueId,
            techniqueName: info.techniqueName,
            targetLang: info.targetLang,
            startTime: Date.now(),
            provider: info.provider,
          }]);
          
          // Close dialog
          setTranslationDialogTechnique(null);
          
          // Show notification
          const providerName = info.provider === 'rask' ? 'Rask.ai' : info.provider === 'heygen' ? 'HeyGen' : 'ElevenLabs';
          toast.info('吹き替え翻訳を開始しました', {
            description: `${info.techniqueName}を${providerName}でバックグラウンド処理中...`
          });
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetTechnique} onOpenChange={(open) => !open && setDeleteTargetTechnique(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTargetTechnique?.name_ja || deleteTargetTechnique?.name}」を削除します。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Modal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEditDialog(false);
          setEditingTechnique(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>動画を編集</DialogTitle>
            <DialogDescription>
              {editingTechnique?.name_ja || editingTechnique?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Language Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">言語</Label>
              <Select
                value={editLanguage}
                onValueChange={(value: "ja" | "en" | "pt") => setEditLanguage(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Name field based on selected language */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                {editLanguage === "ja" ? "名前" : editLanguage === "en" ? "Name" : "Nome"}
                {editLanguage === "ja" && <span className="text-destructive ml-1">*</span>}
              </Label>
              {editLanguage === "ja" && (
                <Input
                  id="edit-name"
                  value={formData.name_ja}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_ja: e.target.value }))}
                  placeholder="日本語名（必須）"
                />
              )}
              {editLanguage === "en" && (
                <div className="space-y-2">
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="English name"
                  />
                  {!formData.name && formData.name_ja && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => translateFieldFromJapanese("en")}
                      disabled={isTranslatingField}
                      className="w-full"
                    >
                      {isTranslatingField ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 翻訳中...</>
                      ) : (
                        <><RefreshCw className="h-3 w-3 mr-1" /> 日本語から翻訳</>
                      )}
                    </Button>
                  )}
                </div>
              )}
              {editLanguage === "pt" && (
                <div className="space-y-2">
                  <Input
                    id="edit-name"
                    value={formData.name_pt}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_pt: e.target.value }))}
                    placeholder="Nome em português"
                  />
                  {!formData.name_pt && formData.name_ja && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => translateFieldFromJapanese("pt")}
                      disabled={isTranslatingField}
                      className="w-full"
                    >
                      {isTranslatingField ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 翻訳中...</>
                      ) : (
                        <><RefreshCw className="h-3 w-3 mr-1" /> 日本語から翻訳</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Description based on selected language */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {editLanguage === "ja" ? "説明" : editLanguage === "en" ? "Description" : "Descrição"}
              </Label>
              {editLanguage === "ja" && (
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_ja: e.target.value }))}
                  placeholder="日本語の説明"
                  rows={4}
                />
              )}
              {editLanguage === "en" && (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="English description"
                  rows={4}
                />
              )}
              {editLanguage === "pt" && (
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_pt: e.target.value }))}
                  placeholder="Descrição em português"
                  rows={4}
                />
              )}
            </div>
            
            {/* Visibility */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">公開設定</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: "public" | "unlisted" | "private") => 
                  setFormData(prev => ({ ...prev, visibility: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      公開
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      限定公開
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      非公開
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Notation Selector - 技術タグ */}
            {editingTechnique && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">技術タグ</Label>
                <NotationSelector techniqueId={editingTechnique.id} />
              </div>
            )}
            
            {/* Video File Replacement */}
            <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Film className="h-4 w-4" />
                動画ファイルを差し替え / アップロード
              </Label>
              <p className="text-xs text-muted-foreground">
                新しい動画ファイルを選択すると、Cloudflare Streamにアップロードし、このレコード（{editingTechnique?.series_prefix}-{editingTechnique?.series_order}）のみを更新します。
              </p>
              
              {!replaceVideoFile ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/30">
                  <div className="flex flex-col items-center justify-center py-2">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">クリックして動画ファイルを選択</p>
                    <p className="text-xs text-muted-foreground">MP4, MOV, WebM</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setReplaceVideoFile(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm truncate">{replaceVideoFile.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(replaceVideoFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplaceVideoFile(null)}
                      disabled={isReplacingVideo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {isReplacingVideo && (
                    <div className="space-y-1">
                      <Progress value={replaceProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        アップロード中... {replaceProgress}%
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {editingTechnique?.video_url && !replaceVideoFile && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  現在の動画URL設定済み
                </p>
              )}
              {editingTechnique && !editingTechnique.video_url && !replaceVideoFile && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  動画URLが未設定です（404エラーの可能性）
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingTechnique(null);
              setReplaceVideoFile(null);
            }}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!formData.name_ja.trim()}
            >
              {replaceVideoFile ? (
                <><Upload className="h-4 w-4 mr-1" /> 差し替えて保存</>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
