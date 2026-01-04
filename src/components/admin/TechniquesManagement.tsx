import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions } from "@/components/ui/input-with-suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, Search, Check, X, Languages, ExternalLink, ChevronDown, Cloud, Loader2, RefreshCw, FileText, Link, AlertTriangle, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { Progress } from "@/components/ui/progress";
import { SeriesBadge } from "@/components/ui/series-badge";
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

export const TechniquesManagement = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "category" | "series" | "created">("order");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const { startStorageUpload, isUploading: globalUploading } = useUpload();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAutoTranslatingName, setIsAutoTranslatingName] = useState(false);
  const [isAutoTranslatingDesc, setIsAutoTranslatingDesc] = useState(false);
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
  }>>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [seriesNameSuggestions, setSeriesNameSuggestions] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [seriesMapping, setSeriesMapping] = useState<Array<{ series_name: string; series_prefix: string }>>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isFixingThumbnails, setIsFixingThumbnails] = useState(false);
  const [brokenVideoCount, setBrokenVideoCount] = useState(0);
  const [missingThumbnailCount, setMissingThumbnailCount] = useState(0);
  const [supabaseStorageCount, setSupabaseStorageCount] = useState(0);
  const [reEncodingIds, setReEncodingIds] = useState<Set<string>>(new Set());
  const [isCheckingEncoding, setIsCheckingEncoding] = useState(false);
  const [encodingResults, setEncodingResults] = useState<{
    total: number;
    properlyEncoded: number;
    notEncoded: number;
    notEncodedVideos: Array<{
      techniqueId: string;
      name: string;
      seriesPrefix: string;
      seriesOrder: number | null;
      cloudflareVideoId: string;
      status: string;
      readyToStream: boolean;
      inputWidth: number;
      inputHeight: number;
      duration: number;
      isProperlyEncoded: boolean;
      error?: string;
    }>;
  } | null>(null);
  const [reEncodingCloudflareIds, setReEncodingCloudflareIds] = useState<Set<string>>(new Set());
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [transcriptionMap, setTranscriptionMap] = useState<Record<string, { id: string; status: string }>>({});


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

    const fetchSupabaseStorageCount = async () => {
      const { data, error } = await supabase
        .from('techniques')
        .select('id, video_url, video_url_ja, video_url_pt, thumbnail_url');
      
      if (error) {
        console.error('Error fetching storage count:', error);
        return;
      }
      
      let storageCount = 0;
      let brokenCount = 0;
      let missingThumbCount = 0;
      data?.forEach(t => {
        if (t.video_url?.includes('supabase.co/storage')) storageCount++;
        if (t.video_url_ja?.includes('supabase.co/storage')) storageCount++;
        if (t.video_url_pt?.includes('supabase.co/storage')) storageCount++;
        // Count broken Cloudflare URLs
        if (t.video_url?.includes('customer-46bf2542468db352a9741f14b84d2744')) brokenCount++;
        if (t.video_url_ja?.includes('customer-46bf2542468db352a9741f14b84d2744')) brokenCount++;
        // Count missing thumbnails
        if (!t.thumbnail_url && t.video_url) missingThumbCount++;
      });
      setSupabaseStorageCount(storageCount);
      setBrokenVideoCount(brokenCount);
      setMissingThumbnailCount(missingThumbCount);
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
    
    fetchCategories();
    fetchSeriesNames();
    fetchSupabaseStorageCount();
    fetchTranscriptions();
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

  // Migration result state for detailed display
  const [migrationResults, setMigrationResults] = useState<{
    diagnostics: any;
    results: any[];
    has403Error: boolean;
    notFoundItems: any[];
  } | null>(null);

  // Cloudflare Streamへの移行
  const handleMigrateToCloudflare = async () => {
    if (!confirm(`${supabaseStorageCount}件の動画URLをCloudflare Streamの既存動画に紐付けますか？（アップロードは行いません）`)) return;
    
    setIsMigrating(true);
    setMigrationResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      const response = await supabase.functions.invoke('migrate-videos-to-cloudflare', {
        body: { table: 'techniques', action: 'link-existing' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      console.log("[Cloudflare Link] Full result:", result);

      // Parse results for detailed display
      const results = Array.isArray(result.results) ? result.results : [];
      
      // Check for 403 errors in diagnostics or results
      const has403Error = 
        result.diagnostics?.cloudflare?.error?.includes('403') ||
        result.message?.includes('403') ||
        results.some((r: any) => 
          r.error?.includes('403') || 
          r.details?.some((d: any) => d.error?.includes('403'))
        );

      // Collect not-found items with search terms
      const notFoundItems = results
        .filter((r: any) => !r.success)
        .map((r: any) => {
          const notFoundDetails = r.details?.filter((d: any) => d.method === 'not-found') || [];
          const apiErrorDetails = r.details?.filter((d: any) => d.method === 'cloudflare-api-error') || [];
          return {
            id: r.id,
            name: r.name,
            error: r.error,
            notFoundDetails,
            apiErrorDetails,
            searchedTerms: notFoundDetails.flatMap((d: any) => d.searched || []),
          };
        });

      setMigrationResults({
        diagnostics: result.diagnostics,
        results,
        has403Error,
        notFoundItems,
      });

      // Console log for debugging
      console.log("[Cloudflare Link] Diagnostics:", result.diagnostics);
      if (results.length > 0) {
        console.table(
          results.map((r: any) => ({
            id: r.id,
            name: r.name,
            success: r.success,
            error: r.error,
            method: r.details?.[0]?.method || 'unknown',
            searched: r.details?.[0]?.searched?.join(', ') || '',
          }))
        );
      }

      if (result.success && result.migrated > 0) {
        toast.success(result.message);
      } else if (has403Error) {
        toast.error("CloudflareのAPIトークンに Stream:Read 権限が必要です");
      } else if (notFoundItems.length > 0) {
        toast.warning(`${notFoundItems.length}件の動画がCloudflareで見つかりませんでした。詳細は下記を確認してください。`);
      } else {
        toast.info(result.message || "処理が完了しました");
      }

      // Refresh count
      const { data } = await supabase
        .from('techniques')
        .select('id, video_url, video_url_ja, video_url_pt');
      
      let count = 0;
      data?.forEach(t => {
        if (t.video_url?.includes('supabase.co/storage')) count++;
        if (t.video_url_ja?.includes('supabase.co/storage')) count++;
        if (t.video_url_pt?.includes('supabase.co/storage')) count++;
      });
      setSupabaseStorageCount(count);

    } catch (error) {
      console.error("移行エラー:", error);
      toast.error(error instanceof Error ? error.message : "動画の移行に失敗しました");
    } finally {
      setIsMigrating(false);
    }
  };

  // Repair broken videos (404) from video_metadata backup
  const handleRepairBrokenVideos = async () => {
    if (!confirm(`${brokenVideoCount}件の動画URLを安定した再生URLに変換しますか？`)) return;
    
    setIsRepairing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      const response = await supabase.functions.invoke('migrate-videos-to-cloudflare', {
        body: { action: 'repair-broken' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(result.message);
        // Refresh broken count
        const { data } = await supabase
          .from('techniques')
          .select('id, video_url, video_url_ja');
        
        let count = 0;
        data?.forEach(t => {
          if (t.video_url?.includes('customer-46bf2542468db352a9741f14b84d2744')) count++;
          if (t.video_url_ja?.includes('customer-46bf2542468db352a9741f14b84d2744')) count++;
        });
        setBrokenVideoCount(count);
      } else {
        throw new Error(result.error || '修復に失敗しました');
      }
    } catch (error) {
      console.error("修復エラー:", error);
      toast.error(error instanceof Error ? error.message : "動画の修復に失敗しました");
    } finally {
      setIsRepairing(false);
    }
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

      const response = await supabase.functions.invoke('migrate-videos-to-cloudflare', {
        body: { action: 'fix-thumbnails' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(result.message);
        // Refresh missing thumbnail count
        const { data } = await supabase
          .from('techniques')
          .select('id, video_url, thumbnail_url');
        
        let count = 0;
        data?.forEach(t => {
          if (!t.thumbnail_url && t.video_url) count++;
        });
        setMissingThumbnailCount(count);
      } else {
        throw new Error(result.error || 'サムネイル修復に失敗しました');
      }
    } catch (error) {
      console.error("サムネイル修復エラー:", error);
      toast.error(error instanceof Error ? error.message : "サムネイル修復に失敗しました");
    } finally {
      setIsFixingThumbnails(false);
    }
  };

  const handleCheckEncoding = async () => {
    setIsCheckingEncoding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      const response = await supabase.functions.invoke('check-video-encoding', {
        body: { action: 'check-all' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      setEncodingResults(result);
      
      if (result.notEncoded === 0) {
        toast.success(`全${result.total}件の動画が正常にエンコードされています`);
      } else {
        toast.warning(`${result.notEncoded}件の動画が未エンコードです`, {
          description: '下のリストから再エンコードを実行できます'
        });
      }
    } catch (error) {
      console.error("Encoding check error:", error);
      toast.error(error instanceof Error ? error.message : "エンコードチェックに失敗しました");
    } finally {
      setIsCheckingEncoding(false);
    }
  };

  // Re-encode Cloudflare video
  const handleReEncodeCloudflare = async (cloudflareVideoId: string, techniqueName: string) => {
    setReEncodingCloudflareIds(prev => new Set(prev).add(cloudflareVideoId));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("ログインが必要です");
        return;
      }

      const response = await supabase.functions.invoke('check-video-encoding', {
        body: { action: 're-encode', videoId: cloudflareVideoId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        toast.success('再エンコード開始', {
          description: `「${techniqueName}」の新しい動画ID: ${result.newVideoId}`,
        });
        
        // Note: The new video URL needs to be manually updated in the database
        toast.info('新しい動画URLをDBに反映してください', {
          description: result.newPlaybackUrl,
          duration: 10000,
        });
      } else {
        toast.warning(result.message || '再エンコードを開始できませんでした');
      }
    } catch (error) {
      console.error("Re-encode error:", error);
      toast.error(error instanceof Error ? error.message : "再エンコードに失敗しました");
    } finally {
      setReEncodingCloudflareIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(cloudflareVideoId);
        return newSet;
      });
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
  const [maxSeriesOrder, setMaxSeriesOrder] = useState<number | null>(null);

  const { data, isLoading, error } = usePaginatedTechniques(page, pageSize, {
    search: searchQuery,
    category: categoryFilter,
    series: seriesFilter,
    sortBy,
  });

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

  const handleVideoUpload = async (file: File, techniqueId?: string) => {
    try {
      // Step 1: Get direct upload URL from Cloudflare Stream
      toast.info('Cloudflare Streamにアップロード中...', {
        description: 'アップロードURLを取得しています'
      });
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudflare-stream', {
        body: { action: 'get-upload-url' }
      });

      if (uploadError || !uploadData?.uploadUrl) {
        throw new Error(uploadError?.message || 'アップロードURLの取得に失敗しました');
      }

      const { uploadUrl, videoId } = uploadData;

      // Step 2: Upload the file directly to Cloudflare
      toast.info('動画をアップロード中...', {
        description: `${(file.size / 1024 / 1024).toFixed(1)}MB`
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Cloudflare Streamへのアップロードに失敗しました');
      }

      // Step 3: Poll for video processing completion
      toast.info('動画を処理中...', {
        description: 'エンコード完了を待っています'
      });

      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5 sec intervals)
      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      while (attempts < maxAttempts) {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('upload-to-cloudflare-stream', {
          body: { action: 'get-video-status', videoId }
        });

        if (statusError) {
          console.error('Status check error:', statusError);
        }

        if (statusData?.ready && statusData?.playbackUrl) {
          // Normalize to videodelivery.net format for stability
          const cfVideoId = statusData.playbackUrl.match(/\/([a-f0-9-]+)\/manifest/)?.[1] || videoId;
          videoUrl = `https://videodelivery.net/${cfVideoId}/manifest/video.m3u8`;
          thumbnailUrl = `https://videodelivery.net/${cfVideoId}/thumbnails/thumbnail.jpg`;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      if (!videoUrl) {
        throw new Error('動画の処理がタイムアウトしました。しばらく待ってから再試行してください。');
      }

      toast.success('Cloudflare Streamにアップロード完了');
      
      return { videoUrl, thumbnailUrl };
    } catch (error: unknown) {
      console.error('Cloudflare upload error:', error);
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
      // Cloudflare Stream videos
      else if (videoUrl.includes('cloudflarestream.com')) {
        // Extract video ID from Cloudflare URL
        const match = videoUrl.match(/cloudflarestream\.com\/([a-f0-9]+)\//);
        if (!match) {
          toast.error('動画IDを取得できません', {
            description: 'URLの形式が不正です。'
          });
          return;
        }
        
        const cloudflareVideoId = match[1];
        
        const { data, error } = await supabase.functions.invoke('check-video-encoding', {
          body: { action: 're-encode', videoId: cloudflareVideoId }
        });

        if (error) throw error;
        
        if (data.success) {
          toast.success('再エンコード開始', {
            description: `新しい動画ID: ${data.newVideoId}\nデータベースのvideo_urlを手動で更新してください。`,
            duration: 10000,
          });
          console.log('Re-encode result:', data);
        } else {
          toast.warning('再エンコード準備中', {
            description: data.message || 'ダウンロードURLの準備中です。しばらく待ってから再試行してください。',
            duration: 8000,
          });
        }
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
    setEditingTechnique(technique);
    setFormData({
      name: technique.name,
      name_ja: technique.name_ja,
      name_pt: technique.name_pt,
      description: technique.description || "",
      description_ja: technique.description_ja || "",
      description_pt: technique.description_pt || "",
      category: technique.category,
      hashtags: technique.hashtags || [],
      series_name: technique.series_name || "",
      series_order: technique.series_order,
      series_prefix: technique.series_prefix || "",
      visibility: (technique as any).visibility || "public",
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold">技術管理</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleBulkUpdate}
            variant="outline"
            disabled={isBulkUpdating}
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">{isBulkUpdating ? '一括更新中...' : '名前・タグ一括更新'}</span>
            <span className="sm:hidden">{isBulkUpdating ? '更新中...' : '一括更新'}</span>
          </Button>
          <Button 
            onClick={handleGenerateMissingThumbnails}
            variant="outline"
            disabled={isGeneratingThumbnails}
            className="text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">{isGeneratingThumbnails ? 'サムネイル生成中...' : 'サムネイル一括生成'}</span>
            <span className="sm:hidden">{isGeneratingThumbnails ? '生成中...' : 'サムネイル'}</span>
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowEditDialog(true)} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">新規技術追加</span>
              <span className="sm:hidden">追加</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cloudflare Stream Migration Card */}
      {supabaseStorageCount > 0 && isAdmin && (
        <div className="mb-6 p-4 border border-amber-500/50 bg-amber-500/5 rounded-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-medium">Cloudflare Stream移行</p>
                <p className="text-sm text-muted-foreground">
                  {supabaseStorageCount}件の動画URLがSupabase Storageに残っています
                </p>
              </div>
            </div>
            <Button 
              onClick={handleMigrateToCloudflare}
              disabled={isMigrating}
              variant="outline"
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  移行中...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  移行実行
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Migration Results Panel */}
      {migrationResults && (
        <div className="mb-6 p-4 border border-muted rounded-lg bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              移行結果詳細
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMigrationResults(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 403 Error Warning */}
          {migrationResults.has403Error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">権限エラー (403)</span>
              </div>
              <p className="mt-1 text-sm text-red-600/80">
                CloudflareのAPIトークンに <code className="bg-red-500/20 px-1 rounded">Stream:Read</code> および <code className="bg-red-500/20 px-1 rounded">Stream:Edit</code> 権限が必要です。
                Cloudflareダッシュボードでトークンの権限を確認してください。
              </p>
            </div>
          )}

          {/* Diagnostics Summary */}
          {migrationResults.diagnostics && (
            <div className="mb-4 p-3 bg-muted/50 rounded-md text-sm">
              <p className="font-medium mb-1">診断情報:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>アクション: {migrationResults.diagnostics.action}</li>
                {migrationResults.diagnostics.cloudflare && (
                  <li>
                    Cloudflare API: {migrationResults.diagnostics.cloudflare.ok ? (
                      <span className="text-green-600">接続成功 (動画数: {migrationResults.diagnostics.cloudflare.total_count ?? '不明'})</span>
                    ) : (
                      <span className="text-red-600">接続失敗 - {migrationResults.diagnostics.cloudflare.error}</span>
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Not Found Items */}
          {migrationResults.notFoundItems.length > 0 && (
            <div className="mb-4">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                見つからなかった動画 ({migrationResults.notFoundItems.length}件)
              </p>
              <div className="max-h-64 overflow-y-auto border border-muted rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">技術名</th>
                      <th className="text-left p-2">検索キーワード</th>
                      <th className="text-left p-2">原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {migrationResults.notFoundItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-t border-muted">
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">
                          {item.searchedTerms.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.searchedTerms.slice(0, 3).map((term: string, i: number) => (
                                <code key={i} className="text-xs bg-muted px-1 py-0.5 rounded">{term}</code>
                              ))}
                              {item.searchedTerms.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{item.searchedTerms.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          {item.apiErrorDetails?.length > 0 ? (
                            <span className="text-red-600 text-xs">{item.apiErrorDetails[0].error}</span>
                          ) : item.notFoundDetails?.length > 0 ? (
                            <span className="text-amber-600 text-xs">Cloudflare Streamに該当動画なし</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{item.error || '不明'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                ヒント: Cloudflareダッシュボードで動画のタイトル（meta.name）が上記の検索キーワードと一致するか確認してください。
              </p>
            </div>
          )}

          {/* Success Items */}
          {migrationResults.results.filter((r: any) => r.success).length > 0 && (
            <div>
              <p className="font-medium mb-2 text-green-600 flex items-center gap-2">
                <Check className="w-4 h-4" />
                成功 ({migrationResults.results.filter((r: any) => r.success).length}件)
              </p>
              <div className="max-h-32 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {migrationResults.results.filter((r: any) => r.success).map((r: any) => (
                    <li key={r.id} className="text-muted-foreground">
                      ✓ {r.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Broken Video Repair Card */}
      {brokenVideoCount > 0 && isAdmin && (
        <div className="mb-6 p-4 border border-red-500/50 bg-red-500/5 rounded-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="font-medium">動画URLの正規化</p>
                <p className="text-sm text-muted-foreground">
                  {brokenVideoCount}件の動画URLが旧形式のため、安定した再生URLに変換できます
                </p>
              </div>
            </div>
            <Button 
              onClick={handleRepairBrokenVideos}
              disabled={isRepairing}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修復中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  修復実行
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Missing Thumbnails Card */}
      {missingThumbnailCount > 0 && isAdmin && (
        <div className="mb-6 p-4 border border-amber-500/50 bg-amber-500/5 rounded-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-medium">サムネイル修復</p>
                <p className="text-sm text-muted-foreground">
                  {missingThumbnailCount}件の動画にサムネイルURLが設定されていません
                </p>
              </div>
            </div>
            <Button 
              onClick={handleFixThumbnails}
              disabled={isFixingThumbnails}
              variant="outline"
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              {isFixingThumbnails ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修復中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  サムネイル設定
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Encoding Check Section */}
      {isAdmin && (
        <div className="mb-6 p-4 border border-blue-500/50 bg-blue-500/5 rounded-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium">動画エンコードチェック</p>
                <p className="text-sm text-muted-foreground">
                  Cloudflare動画のエンコード状態を確認・再エンコード
                </p>
              </div>
            </div>
            <Button 
              onClick={handleCheckEncoding}
              disabled={isCheckingEncoding}
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
            >
              {isCheckingEncoding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  チェック中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  エンコードチェック
                </>
              )}
            </Button>
          </div>
          
          {encodingResults && (
            <div className="mt-4">
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-green-500">✓ 正常: {encodingResults.properlyEncoded}</span>
                <span className="text-red-500">✗ 未エンコード: {encodingResults.notEncoded}</span>
              </div>
              
              {encodingResults.notEncodedVideos.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {encodingResults.notEncodedVideos.map((video) => (
                    <div key={video.cloudflareVideoId} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="text-sm">
                        <span className="font-medium">{video.seriesPrefix}-{video.seriesOrder}</span>
                        <span className="ml-2">{video.name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({video.status}, {video.inputWidth}x{video.inputHeight})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReEncodeCloudflare(video.cloudflareVideoId, video.name)}
                        disabled={reEncodingCloudflareIds.has(video.cloudflareVideoId)}
                      >
                        {reEncodingCloudflareIds.has(video.cloudflareVideoId) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          '再エンコード'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Series Mapping Section */}
      {seriesMapping.length > 0 && (
        <div className="mb-6 border rounded-lg p-4 bg-muted/10">
          <h3 className="text-lg font-semibold mb-4">シリーズアルファベット対応表</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {seriesMapping.map((mapping) => (
              <div
                key={mapping.series_prefix}
                className="flex items-center gap-2 p-3 border rounded-lg bg-background"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  {mapping.series_prefix}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{mapping.series_name}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            新しいシリーズが追加されると、次のアルファベット「{getNextAvailablePrefix()}」が自動的に割り当てられます
          </p>
        </div>
      )}

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
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="カテゴリー" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">すべて</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={seriesFilter} onValueChange={(value) => {
            setSeriesFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[160px]">
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

      {/* Techniques Table - Desktop */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-3 text-left" style={{ width: '48px' }}></th>
              <th className="px-4 py-3 text-left">技術名</th>
              <th className="px-4 py-3 text-left" style={{ width: '120px' }}>カテゴリー</th>
              <th className="px-4 py-3 text-center" style={{ width: '120px' }}>動画</th>
              <th className="px-4 py-3 text-center" style={{ width: '80px' }}>翻訳</th>
              <th className="px-4 py-3 text-center" style={{ width: '100px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-8" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-12 w-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-16 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  技術が見つかりませんでした
                </td>
              </tr>
            ) : (
              data?.data.map((technique) => (
                <Fragment key={technique.id}>
                  <tr className="border-t hover:bg-muted/50 group">
                    <td className="px-3 py-3">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleRow(technique.id)}>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(technique.id) ? "rotate-180" : ""}`} />
                      </Button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1.5">
                        <p className="font-medium leading-tight break-words">{technique.name}</p>
                        <p className="text-sm text-muted-foreground leading-tight break-words">{technique.name_ja}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap">
                        {technique.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {(() => {
                          // Get effective thumbnail URL (fallback to Cloudflare auto-generated)
                          const getEffectiveThumbnail = (thumbnailUrl: string | null, videoUrl: string | null): string | null => {
                            if (thumbnailUrl) return thumbnailUrl;
                            if (!videoUrl) return null;
                            // Try to extract Cloudflare Stream thumbnail
                            const patterns = [
                              /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
                              /videodelivery\.net\/([a-zA-Z0-9]+)/,
                              /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
                            ];
                            for (const pattern of patterns) {
                              const match = videoUrl.match(pattern);
                              if (match) {
                                return `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=1s&width=640&height=360`;
                              }
                            }
                            return null;
                          };
                          const effectiveThumbnail = getEffectiveThumbnail(technique.thumbnail_url, technique.video_url);
                          
                          if (effectiveThumbnail) {
                            return (
                              <img
                                src={effectiveThumbnail}
                                className="w-24 h-14 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                loading="lazy"
                                alt={technique.name}
                                onClick={() => {
                                  if (technique.video_url) {
                                    setPreviewVideoUrl(technique.video_url);
                                    setShowVideoPreview(true);
                                  }
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="64"%3E%3Crect fill="%23ddd" width="96" height="64"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            );
                          } else if (technique.video_url) {
                            return (
                              <div 
                                className="w-24 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                                onClick={() => {
                                  setPreviewVideoUrl(technique.video_url);
                                  setShowVideoPreview(true);
                                }}
                                title="クリックして動画を再生"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                再生
                              </div>
                            );
                          } else {
                            return (
                              <div className="w-24 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                未登録
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 bg-accent rounded text-sm font-medium">{getTranslationCount(technique as any)}言語</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        {isAdmin ? (
                          <>
                            {/* Transcription link */}
                            {transcriptionMap[technique.id] ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/transcription/${transcriptionMap[technique.id].id}`);
                                }}
                                title="文字起こし詳細"
                              >
                                <FileText className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : technique.video_url ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartTranscription(technique as any);
                                }}
                                disabled={transcribingIds.has(technique.id)}
                                title="文字起こしを開始"
                              >
                                {transcribingIds.has(technique.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            ) : null}
                            {technique.video_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(technique.id);
                              }}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(technique.id) && (
                    <tr>
                      <td colSpan={6} className="bg-muted/50 p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">詳細情報</h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">English:</span>
                                  <p className="text-muted-foreground mt-1">{technique.name}</p>
                                </div>
                                <div>
                                  <span className="font-medium">日本語:</span>
                                  <p className="text-muted-foreground mt-1">{technique.name_ja}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Português:</span>
                                  <p className="text-muted-foreground mt-1">{technique.name_pt}</p>
                                </div>
                                <div>
                                  <span className="font-medium">表示順:</span>
                                  <span className="text-muted-foreground ml-2">{technique.display_order}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">シリーズ・タグ</h4>
                              <div className="space-y-2 text-sm">
                                {(technique as Technique).series_name && (
                                  <div>
                                    <span className="font-medium">シリーズ:</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      {(technique as Technique).series_prefix && (
                                        <SeriesBadge 
                                          prefix={(technique as Technique).series_prefix || ''} 
                                          order={(technique as Technique).series_order || undefined}
                                          className="h-6"
                                        />
                                      )}
                                      <span className="text-muted-foreground">{(technique as Technique).series_name}</span>
                                      {(technique as Technique).series_order && (
                                        <span className="text-xs text-muted-foreground">#{(technique as Technique).series_order}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {technique.hashtags && technique.hashtags.length > 0 && (
                                  <div>
                                    <span className="font-medium">ハッシュタグ:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {technique.hashtags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">利用可能な翻訳</h4>
                            <div className="flex flex-wrap gap-2">
                              {getAvailableTranslations(technique as any).map((trans) => (
                                <a
                                  key={trans.code}
                                  href={trans.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 rounded border hover:bg-accent text-sm group"
                                >
                                  <span>{trans.name}</span>
                                  {trans.isOriginal && (
                                    <span className="text-xs text-muted-foreground">(オリジナル)</span>
                                  )}
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="pt-2 border-t flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(technique as any)}
                              >
                                編集
                              </Button>
                              {technique.video_url && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReencodeVideo(technique as any)}
                                    disabled={reEncodingIds.has(technique.id)}
                                  >
                                    {reEncodingIds.has(technique.id) ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                    )}
                                    再エンコード
                                  </Button>
                                  {/* Transcription button */}
                                  {transcriptionMap[technique.id] ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/admin/transcription/${transcriptionMap[technique.id].id}`)}
                                    >
                                      <Link className="h-4 w-4 mr-1" />
                                      文字起こし詳細
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStartTranscription(technique as any)}
                                      disabled={transcribingIds.has(technique.id)}
                                    >
                                      {transcribingIds.has(technique.id) ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <FileText className="h-4 w-4 mr-1" />
                                      )}
                                      文字起こし
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Techniques Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            技術が見つかりませんでした
          </div>
        ) : (
          data?.data.map((technique) => (
            <Collapsible 
              key={technique.id} 
              open={expandedRows.has(technique.id)} 
              onOpenChange={() => toggleRow(technique.id)}
            >
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm leading-tight">{technique.name}</p>
                      <p className="text-xs text-muted-foreground">{technique.name_ja}</p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(technique.id) ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {technique.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getTranslationCount(technique as any)}言語
                    </span>
                  </div>

                  {technique.thumbnail_url && (
                    <div className="relative aspect-video rounded overflow-hidden bg-muted">
                      <img
                        src={technique.thumbnail_url}
                        className="w-full h-full object-cover cursor-pointer"
                        loading="lazy"
                        alt={technique.name}
                        onClick={() => {
                          if (technique.video_url) {
                            setPreviewVideoUrl(technique.video_url);
                            setShowVideoPreview(true);
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="64"%3E%3Crect fill="%23ddd" width="96" height="64"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex gap-2 pt-2">
                      {technique.video_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranslatingTechnique(technique as any);
                            setShowTranslateDialog(true);
                          }}
                        >
                          <Languages className="h-4 w-4 mr-1" />
                          <span className="text-xs">翻訳</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(technique as any);
                        }}
                      >
                        <span className="text-xs">編集</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(technique.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                <CollapsibleContent>
                  <div className="border-t p-4 bg-muted/30 space-y-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-xs text-muted-foreground">Português:</span>
                        <p className="mt-0.5">{technique.name_pt}</p>
                      </div>
                      {(technique as Technique).series_name && (
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">シリーズ:</span>
                          <div className="flex items-center gap-2 mt-1">
                            {(technique as Technique).series_prefix && (
                              <SeriesBadge 
                                prefix={(technique as Technique).series_prefix || ''} 
                                order={(technique as Technique).series_order || undefined}
                                className="h-6"
                              />
                            )}
                            <span>{(technique as Technique).series_name}</span>
                            {(technique as Technique).series_order && (
                              <span className="text-xs text-muted-foreground">#{(technique as Technique).series_order}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {technique.hashtags && technique.hashtags.length > 0 && (
                        <div>
                          <span className="font-medium text-xs text-muted-foreground">タグ:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {technique.hashtags.map((tag) => (
                              <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {getAvailableTranslations(technique as any).length > 0 && (
                      <div>
                        <span className="font-medium text-xs text-muted-foreground mb-2 block">翻訳:</span>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableTranslations(technique as any).map((trans) => (
                            <a
                              key={trans.code}
                              href={trans.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded border hover:bg-accent text-xs"
                            >
                              {trans.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
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

      {/* Video Preview Dialog */}
      <Dialog open={showVideoPreview} onOpenChange={setShowVideoPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>動画プレビュー</DialogTitle>
          </DialogHeader>
          {previewVideoUrl && (
            <div className="w-full">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <label className="text-sm font-medium flex items-center gap-2">
                  Japanese Name *
                  {isAutoTranslatingName && <Loader2 className="h-3 w-3 animate-spin" />}
                </label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({...formData, name_ja: e.target.value})}
                  onBlur={autoTranslateName}
                  placeholder="日本語で入力すると自動翻訳"
                  required
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">English Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={isAutoTranslatingName ? "翻訳中..." : ""}
                  required
                  disabled={!isAdmin || isAutoTranslatingName}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Portuguese Name *</label>
                <Input
                  value={formData.name_pt}
                  onChange={(e) => setFormData({...formData, name_pt: e.target.value})}
                  placeholder={isAutoTranslatingName ? "翻訳中..." : ""}
                  required
                  disabled={!isAdmin || isAutoTranslatingName}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <div className="space-y-2">
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="カテゴリー名を入力または選択"
                  disabled={!isAdmin}
                  list="dialog-categories-list"
                  required
                />
                <datalist id="dialog-categories-list">
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {availableCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({...formData, category: cat})}
                        disabled={!isAdmin}
                        className={formData.category === cat ? "bg-primary/10" : ""}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">シリーズ名 (Series Name)</label>
                <InputWithSuggestions
                  value={formData.series_name}
                  onChange={(e) => handleSeriesNameChange(e.target.value)}
                  onSelectSuggestion={(value) => handleSeriesNameChange(value)}
                  suggestions={seriesNameSuggestions}
                  placeholder="例: クローズドガード"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  空欄の場合は「その他の技」として表示されます
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  シリーズアルファベット (自動割り当て)
                </label>
                <Input
                  value={formData.series_prefix}
                  readOnly
                  disabled
                  placeholder="自動設定"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.series_name && formData.series_prefix
                    ? `「${formData.series_name}」には「${formData.series_prefix}」が割り当てられています`
                    : 'シリーズ名を入力すると自動的に割り当てられます'}
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
                {maxSeriesOrder !== null && formData.series_prefix && (
                  <p className="text-xs text-green-600 mt-1">
                    このシリーズは現在{maxSeriesOrder}番まで使用中
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  シリーズ内での表示順序（1から始まる連番）
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  説明 (Japanese)
                  {isAutoTranslatingDesc && <Loader2 className="h-3 w-3 animate-spin" />}
                </label>
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({...formData, description_ja: e.target.value})}
                  onBlur={autoTranslateDescription}
                  placeholder="日本語で入力すると自動翻訳"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (English)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={isAutoTranslatingDesc ? "翻訳中..." : ""}
                  rows={3}
                  disabled={!isAdmin || isAutoTranslatingDesc}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (Portuguese)</label>
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({...formData, description_pt: e.target.value})}
                  placeholder={isAutoTranslatingDesc ? "翻訳中..." : ""}
                  rows={3}
                  disabled={!isAdmin || isAutoTranslatingDesc}
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

            <div>
              <label className="text-sm font-medium">公開設定</label>
              <Select
                value={formData.visibility}
                onValueChange={(value: "public" | "unlisted" | "private") => setFormData({ ...formData, visibility: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex flex-col items-start">
                      <span>🌍 一般公開</span>
                      <span className="text-xs text-muted-foreground">誰でも検索・閲覧可能</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <div className="flex flex-col items-start">
                      <span>🔗 限定公開</span>
                      <span className="text-xs text-muted-foreground">URLを知っている人のみ閲覧可能</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex flex-col items-start">
                      <span>🔒 非公開</span>
                      <span className="text-xs text-muted-foreground">管理者のみ閲覧可能</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
