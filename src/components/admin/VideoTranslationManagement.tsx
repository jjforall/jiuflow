import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeriesBadge } from "@/components/ui/series-badge";
import { Languages, Search, Check, Loader2, RefreshCw, Video, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Technique = any;

interface ActiveTranslation {
  projectId: string;
  techniqueId: string;
  techniqueName: string;
  targetLang: string;
  startTime: number;
  provider: 'rask' | 'elevenlabs' | 'heygen';
}

const ALL_LANGUAGES = [
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

interface VideoTranslationManagementProps {
  showHeader?: boolean;
}

export const VideoTranslationManagement = ({ showHeader = true }: VideoTranslationManagementProps) => {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [seriesMapping, setSeriesMapping] = useState<Array<{ series_name: string; series_prefix: string }>>([]);
  
  // Translation state
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translatingTechnique, setTranslatingTechnique] = useState<Technique | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [sourceLanguage, setSourceLanguage] = useState<string>("ja");
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
  
  // Video duration warning
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);
  
  // Active translations tracking
  const [activeTranslations, setActiveTranslations] = useState<ActiveTranslation[]>([]);
  
  // Timer for elapsed time update
  const [, setTick] = useState(0);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [translationProvider, setTranslationProvider] = useState<'elevenlabs' | 'rask' | 'heygen'>('elevenlabs');

  useEffect(() => {
    fetchData();
    // Load provider preference
    const savedProvider = localStorage.getItem('translation_provider');
    if (savedProvider === 'rask' || savedProvider === 'elevenlabs' || savedProvider === 'heygen') {
      setTranslationProvider(savedProvider);
    }
  }, []);
  
  // Update elapsed time every second when there are active translations
  useEffect(() => {
    if (activeTranslations.length === 0) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTranslations.length]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch techniques with videos
      const { data: techniquesData, error: techError } = await supabase
        .from('techniques')
        .select('id, name, name_ja, name_pt, video_url, video_url_ja, video_url_pt, thumbnail_url, series_prefix, series_order, series_name, video_metadata, created_at')
        .not('video_url', 'is', null)
        .order('series_prefix', { ascending: true })
        .order('series_order', { ascending: true });

      if (techError) throw techError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTechniques((techniquesData || []) as any);

      // Fetch series mapping
      const seriesMap = new Map<string, string>();
      techniquesData?.forEach(item => {
        if (item.series_name && item.series_prefix) {
          seriesMap.set(item.series_name, item.series_prefix);
        }
      });
      
      const mappings = Array.from(seriesMap.entries())
        .map(([series_name, series_prefix]) => ({ series_name, series_prefix }))
        .sort((a, b) => a.series_prefix.localeCompare(b.series_prefix));
      
      setSeriesMapping(mappings);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProvider = () => {
    localStorage.setItem('translation_provider', translationProvider);
    toast.success('翻訳プロバイダーを保存しました');
    setShowSettings(false);
  };

  const openTranslateDialog = (technique: Technique) => {
    setTranslatingTechnique(technique);
    setShowTranslateDialog(true);
    setTranslationProjectId(null);
    setTranslationStatus({
      status: null,
      progress: 0,
      startTime: null,
    });
    // Reset source language to first available
    const available = getAvailableSourceLanguages(technique);
    const firstLang = available[0] || 'ja';
    setSourceLanguage(firstLang);
    
    // Reset duration and fetch video duration
    setVideoDuration(null);
    setIsLoadingDuration(true);
    
    // Get the video URL for the first available source language
    const videoUrl = technique.video_url_ja || technique.video_url;
    if (videoUrl) {
      fetchVideoDuration(videoUrl);
    } else {
      setIsLoadingDuration(false);
    }
  };
  
  // Fetch video duration using HTML5 video element
  const fetchVideoDuration = (videoUrl: string) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setIsLoadingDuration(false);
      video.remove();
    };
    
    video.onerror = () => {
      console.warn('Could not load video metadata for duration check');
      setIsLoadingDuration(false);
      video.remove();
    };
    
    // Convert HLS URL to direct video URL if needed
    if (videoUrl.includes('videodelivery.net') && videoUrl.includes('/manifest/')) {
      // For Cloudflare Stream, use the downloads endpoint
      const videoId = videoUrl.split('videodelivery.net/')[1]?.split('/')[0];
      if (videoId) {
        video.src = `https://videodelivery.net/${videoId}/downloads/default.mp4`;
      } else {
        video.src = videoUrl;
      }
    } else {
      video.src = videoUrl;
    }
  };

  // Get source video URL based on selected source language
  const getSourceVideoUrl = (technique: Technique | null, lang: string): string | null => {
    if (!technique) return null;
    switch (lang) {
      case 'ja':
        return technique.video_url_ja || technique.video_url;
      case 'pt':
        return technique.video_url_pt || null;
      case 'en':
        // Check video_metadata for English translated video
        const enMetadata = technique.video_metadata?.['en'];
        return enMetadata?.video_url || null;
      default:
        // Check video_metadata for other languages
        const metadata = technique.video_metadata?.[lang];
        return metadata?.video_url || null;
    }
  };

  // Get available source languages for a technique
  const getAvailableSourceLanguages = (technique: Technique | null): string[] => {
    if (!technique) return ['ja'];
    const available: string[] = [];
    
    // Check Japanese (always available if video_url exists)
    if (technique.video_url_ja || technique.video_url) available.push('ja');
    // Check Portuguese
    if (technique.video_url_pt) available.push('pt');
    // Check video_metadata for other languages
    if (technique.video_metadata) {
      Object.entries(technique.video_metadata).forEach(([lang, data]) => {
        if ((data as { video_url?: string })?.video_url && !available.includes(lang)) {
          available.push(lang);
        }
      });
    }
    
    return available;
  };

  const handleVideoTranslate = async () => {
    if (!translatingTechnique) return;
    
    const sourceVideoUrl = getSourceVideoUrl(translatingTechnique, sourceLanguage);
    
    if (!sourceVideoUrl) {
      toast.error("エラー", {
        description: `ソース動画（${ALL_LANGUAGES.find(l => l.code === sourceLanguage)?.nativeName || sourceLanguage}）が見つかりません`,
      });
      return;
    }
    
    const provider = translationProvider;
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
          techniqueName: translatingTechnique.name_ja || translatingTechnique.name,
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
        
        setActiveTranslations(prev => [...prev, {
          projectId: data.projectId,
          techniqueId: translatingTechnique.id,
          techniqueName: translatingTechnique.name_ja || translatingTechnique.name,
          targetLang: targetLanguage,
          startTime: Date.now(),
          provider: provider,
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

  const manualCheckTranslation = async (translation: ActiveTranslation) => {
    try {
      toast.info("ステータス確認中...", {
        description: `「${translation.techniqueName}」の翻訳状況を確認しています`,
      });

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

      const isCompleted = statusData?.status === 'completed' || 
                         statusData?.status === 'merging_done' ||
                         statusData?.status === 'dubbed';

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
          description: `「${translation.techniqueName}」の${ALL_LANGUAGES.find(l => l.code === translation.targetLang)?.nativeName}版が完了しました`,
        });

        setActiveTranslations(prev => 
          prev.filter(t => t.projectId !== translation.projectId)
        );
        
        // Refresh data
        fetchData();
      } else if (statusData?.status === 'failed') {
        toast.error("動画翻訳失敗", {
          description: `「${translation.techniqueName}」の翻訳処理に失敗しました`,
        });

        setActiveTranslations(prev => 
          prev.filter(t => t.projectId !== translation.projectId)
        );
      } else if (statusData?.status === 'processing' || statusData?.status === 'dubbing') {
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

  // Filter techniques
  const filteredTechniques = techniques.filter(tech => {
    const matchesSearch = searchQuery === "" || 
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.name_ja.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeries = seriesFilter === "all" || tech.series_prefix === seriesFilter;
    
    if (statusFilter === "all") return matchesSearch && matchesSeries;
    
    const metadata = tech.video_metadata || {};
    const translatedLangs = Object.keys(metadata).filter(k => metadata[k]?.video_url);
    
    if (statusFilter === "translated") return matchesSearch && matchesSeries && translatedLangs.length > 0;
    if (statusFilter === "untranslated") return matchesSearch && matchesSeries && translatedLangs.length === 0;
    
    return matchesSearch && matchesSeries;
  });

  // Stats
  const stats = {
    total: techniques.length,
    withTranslations: techniques.filter(t => {
      const metadata = t.video_metadata || {};
      return Object.keys(metadata).filter(k => metadata[k]?.video_url).length > 0;
    }).length,
    activeTranslations: activeTranslations.length,
  };

  const getTranslationCount = (technique: Technique): number => {
    const metadata = technique.video_metadata || {};
    return Object.keys(metadata).filter(k => metadata[k]?.video_url).length;
  };

  const getTranslatedLanguages = (technique: Technique): string[] => {
    const metadata = technique.video_metadata || {};
    return Object.keys(metadata).filter(k => metadata[k]?.video_url);
  };

  const getEffectiveThumbnail = (technique: Technique): string | null => {
    if (technique.thumbnail_url) return technique.thumbnail_url;
    if (!technique.video_url) return null;
    
    const patterns = [
      /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
      /videodelivery\.net\/([a-zA-Z0-9]+)/,
      /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = technique.video_url.match(pattern);
      if (match) {
        return `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=1s&width=640&height=360`;
      }
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Languages className="h-6 w-6" />
              動画翻訳管理
              <Badge 
                variant="outline" 
                className={translationProvider === 'elevenlabs' 
                  ? 'bg-primary/10 text-primary border-primary/30' 
                  : translationProvider === 'heygen'
                    ? 'bg-secondary/10 text-secondary border-secondary/30'
                    : 'bg-success/10 text-success border-success/30'
                }
              >
                {translationProvider === 'elevenlabs' ? 'ElevenLabs' : translationProvider === 'heygen' ? 'HeyGen' : 'Rask.ai'}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              動画の多言語吹き替えを管理します
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Button>
          </div>
        </div>
      )}
      
      {!showHeader && (
        <div className="flex items-center justify-between mb-4">
          <Badge 
            variant="outline" 
            className={translationProvider === 'elevenlabs' 
              ? 'bg-primary/10 text-primary border-primary/30' 
              : translationProvider === 'heygen'
                ? 'bg-secondary/10 text-secondary border-secondary/30'
                : 'bg-success/10 text-success border-success/30'
            }
          >
            {translationProvider === 'elevenlabs' ? 'ElevenLabs' : translationProvider === 'heygen' ? 'HeyGen' : 'Rask.ai'}
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">動画数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">翻訳済み</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{stats.withTranslations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">処理中</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.activeTranslations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Translations - Always visible when processing */}
      {activeTranslations.length > 0 && (
        <Card className="mb-6 border-2 border-warning bg-warning/10 shadow-lg animate-pulse-slow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="relative">
                <Loader2 className="h-6 w-6 animate-spin text-warning" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
                </span>
              </div>
              <span className="text-warning-foreground dark:text-warning">
                🎙️ 吹き替え処理中 ({activeTranslations.length}件)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTranslations.map((translation) => {
                const elapsedTime = Math.floor((Date.now() - translation.startTime) / 1000);
                const minutes = Math.floor(elapsedTime / 60);
                const seconds = elapsedTime % 60;
                const langName = ALL_LANGUAGES.find(l => l.code === translation.targetLang)?.nativeName || translation.targetLang;
                const providerName = translation.provider === 'rask' ? 'Rask.ai' : translation.provider === 'heygen' ? 'HeyGen' : 'ElevenLabs';
                const providerColor = translation.provider === 'rask' 
                  ? 'bg-success/20 text-success border-success/50' 
                  : translation.provider === 'heygen'
                    ? 'bg-secondary/20 text-secondary border-secondary/50'
                    : 'bg-primary/20 text-primary border-primary/50';
                
                return (
                  <div key={translation.projectId} className="border rounded-lg p-4 bg-background shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-base">{translation.techniqueName}</p>
                          <Badge className={providerColor}>
                            {providerName}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Languages className="h-4 w-4" />
                            {langName}版
                          </span>
                          <span className="flex items-center gap-1 font-mono bg-muted px-2 py-0.5 rounded">
                            ⏱️ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => manualCheckTranslation(translation)}
                        className="shrink-0"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        確認
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={undefined} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">処理中...</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      ID: {translation.projectId.substring(0, 20)}...
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              ※ 翻訳には通常5〜15分かかります。「確認」ボタンで最新状態を取得できます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="技術名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-[160px]">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="translated">翻訳済み</SelectItem>
              <SelectItem value="untranslated">未翻訳</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Techniques Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTechniques.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>動画が見つかりませんでした</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTechniques.map((technique) => {
            const thumbnail = getEffectiveThumbnail(technique);
            const translatedLangs = getTranslatedLanguages(technique);
            const translationCount = getTranslationCount(technique);
            
            return (
              <Card key={technique.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={technique.name}
                      className="w-full h-36 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {technique.series_prefix && (
                    <div className="absolute top-2 left-2">
                      <SeriesBadge prefix={technique.series_prefix} order={technique.series_order || 0} />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm mb-1 line-clamp-1">{technique.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{technique.name_ja}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ALL_LANGUAGES.slice(0, 6).map(lang => {
                      const isTranslated = translatedLangs.includes(lang.code) || lang.code === 'ja';
                      const isJapanese = lang.code === 'ja';
                      
                      return (
                        <Badge
                          key={lang.code}
                          variant={isTranslated ? "default" : "outline"}
                          className={`text-xs ${isJapanese ? 'bg-primary text-primary-foreground' : isTranslated ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                        >
                          {lang.code.toUpperCase()}
                        </Badge>
                      );
                    })}
                    {translationCount > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{translationCount}言語
                      </span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => openTranslateDialog(technique)}
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    翻訳
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Translation Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>動画翻訳</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {translatingTechnique?.name_ja || translatingTechnique?.name} の動画を他言語に翻訳します
              </p>
              
              {/* Provider Selection in Dialog */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <label className="text-sm font-medium mb-2 block">翻訳プロバイダー</label>
                <Select 
                  value={translationProvider} 
                  onValueChange={(v: 'elevenlabs' | 'rask' | 'heygen') => {
                    setTranslationProvider(v);
                    localStorage.setItem('translation_provider', v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="elevenlabs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        ElevenLabs
                      </span>
                    </SelectItem>
                    <SelectItem value="rask">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        Rask.ai
                      </span>
                    </SelectItem>
                    <SelectItem value="heygen">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        HeyGen
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Video Duration Warning */}
              {isLoadingDuration ? (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">動画の長さを確認中...</span>
                </div>
              ) : videoDuration !== null && videoDuration > 300 && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-warning text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-medium text-warning-foreground dark:text-warning">
                        長い動画の警告
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        この動画は {Math.floor(videoDuration / 60)}分{Math.floor(videoDuration % 60)}秒 あります。
                        5分以上の動画は翻訳に時間がかかり、APIコストが高くなる場合があります。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Source Language Selection */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <label className="text-sm font-medium mb-2 block">ソース言語（翻訳元）</label>
                <Select 
                  value={sourceLanguage} 
                  onValueChange={setSourceLanguage}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {getAvailableSourceLanguages(translatingTechnique).map(langCode => {
                      const lang = ALL_LANGUAGES.find(l => l.code === langCode);
                      return (
                        <SelectItem key={langCode} value={langCode}>
                          <span className="flex items-center gap-2">
                            {lang?.name || langCode} ({lang?.nativeName || langCode})
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {translationProvider === 'rask' && ['ja', 'zh', 'ko', 'ar', 'hi', 'ta'].includes(sourceLanguage) && (
                  <p className="text-xs text-warning mt-2">
                    ⚠️ Rask.aiはこの言語をソース言語としてサポートしていません。ElevenLabsをお試しください。
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-3 block">翻訳先言語を選択</label>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {ALL_LANGUAGES.map(lang => {
                    const metadata = translatingTechnique?.video_metadata?.[lang.code];
                    const inProgressStatuses = ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing', 'dubbing'];
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
                        onClick={() => !isJapanese && setTargetLanguage(lang.code)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="language"
                            value={lang.code}
                            checked={targetLanguage === lang.code}
                            onChange={() => !isJapanese && setTargetLanguage(lang.code)}
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
                            <div className="flex items-center gap-1 text-sm text-primary">
                              <span className="animate-pulse">●</span>
                              <span>作成中</span>
                            </div>
                          ) : metadata?.video_url ? (
                            <>
                              <div className="flex items-center gap-1 text-sm text-success">
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
                              <div className="flex items-center gap-1 text-sm text-success">
                                <Check className="w-4 h-4" />
                                <span>オリジナル</span>
                              </div>
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
                        translationStatus.status === 'dubbing' ? '吹き替え処理中...' :
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
                  {translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing', 'dubbing'].includes(translationStatus.status) && (
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
                disabled={isTranslating || targetLanguage === 'ja' || (translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing', 'dubbing'].includes(translationStatus.status))}
              >
                {isTranslating ? '開始中...' : 
                 translationStatus.status && ['uploading', 'uploaded', 'transcription_started', 'translation_started', 'voiceover_started', 'processing', 'dubbing'].includes(translationStatus.status) ? '処理中' : 
                 '翻訳開始'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>翻訳設定</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">翻訳プロバイダー</label>
              <Select value={translationProvider} onValueChange={(v: 'elevenlabs' | 'rask' | 'heygen') => setTranslationProvider(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="rask">Rask.ai</SelectItem>
                  <SelectItem value="heygen">HeyGen</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {translationProvider === 'elevenlabs' 
                  ? 'ElevenLabsは高品質な音声合成に対応しています' 
                  : translationProvider === 'heygen'
                    ? 'HeyGenは高品質なAI動画翻訳に対応しています（Scale/Enterprise tier必須）'
                    : 'Rask.aiは多言語対応が充実しています'}
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveProvider}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoTranslationManagement;
