import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteTechniques } from "@/hooks/useFavoriteTechniques";
import { prefetchVideo } from "@/hooks/useVideoPrefetch";
import { Lock, Eye, Target, Trophy, Flame, ArrowLeft, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { VideoRating } from "@/components/VideoRating";
import { VideoComments } from "@/components/VideoComments";
import { VideoTip } from "@/components/VideoTip";
import { Separator } from "@/components/ui/separator";
import { useFloatingVideo } from "@/contexts/FloatingVideoContext";
import { useMusic } from "@/contexts/MusicContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { getSeriesPrefixColors } from "@/components/ui/series-badge";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission";
  video_url: string | null;
  video_url_ja: string | null;
  video_url_pt: string | null;
  display_order: number;
  hashtags: string[];
  series_name: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
  thumbnail_url_ja: string | null;
  thumbnail_url_pt: string | null;
  video_metadata?: any;
  updated_at?: string;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.ja;
  const navigate = useNavigate();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isStaff, user, isLoading: authLoading } = useAuth();
  const { isFavorite, toggleFavorite } = useFavoriteTechniques();
  const { setFloatingVideo } = useFloatingVideo();
  const { play, isPlaying, volume, setVolume, playlist, loadPlaylist } = useMusic();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [seriesVideos, setSeriesVideos] = useState<Technique[]>([]);
  const [isReady, setIsReady] = useState(false); // 統合ローディング状態
  const [seriesLetter, setSeriesLetter] = useState<string>("");
  const [viewCount, setViewCount] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<"none" | "pending" | "translating" | "completed">("none");
  const [translationProjectId, setTranslationProjectId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentAudioLanguage, setCurrentAudioLanguage] = useState<string>("ja");
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    practice_date: new Date(),
    proficiency_level: "1",
    repetition_count: "30",
    notes: "",
  });

  // 動画ページに来たら、音楽が再生中で音量が25%以上なら25%にフェードダウン
  useEffect(() => {
    // 音楽が再生中でなければ何もしない
    if (!isPlaying) return;
    // 音量が15%以下なら何もしない
    if (volume <= 0.15) return;

    const startVolume = volume;
    const targetVolume = 0.15;
    const fadeDuration = 1000; // フェード時間（1秒）
    const fadeSteps = 20;
    const stepDuration = fadeDuration / fadeSteps;
    const volumeStep = (startVolume - targetVolume) / fadeSteps;
    
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = startVolume - (volumeStep * currentStep);
      setVolume(Math.max(newVolume, targetVolume));
      
      if (currentStep >= fadeSteps) {
        clearInterval(fadeInterval);
      }
    }, stepDuration);

    return () => {
      clearInterval(fadeInterval);
    };
  }, []); // 初回のみ実行

  // Cleanup and activate floating video on unmount
  useEffect(() => {
    return () => {
      // Activate floating video if there's a technique and it was playing
      if (technique && isVideoPlaying) {
        const videoUrl = getTechniqueVideoUrl(technique);
        const thumbnailUrl = getTechniqueThumbnailUrl(technique);
        const title = getTechniqueName(technique);
        
        // Try to get current time from video element
        const progressKey = `video-progress:${videoUrl}`;
        const savedProgress = sessionStorage.getItem(progressKey);
        const currentTime = savedProgress ? parseFloat(savedProgress) : 0;
        
        if (videoUrl) {
          setFloatingVideo({
            videoUrl,
            thumbnailUrl,
            title,
            currentTime
          });
        }
      }
    };
  }, [technique, isVideoPlaying, language, setFloatingVideo]);

  // Check for tip success
  useEffect(() => {
    if (searchParams.get("tip") === "success") {
      toast.success(
        language === "ja" 
          ? "投げ銭ありがとうございます！" 
          : language === "pt" 
          ? "Obrigado pela gorjeta!" 
          : "Thank you for your tip!"
      );
      // Remove query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, language]);

  // Record video view
  const recordVideoView = async (videoId: string, userId: string) => {
    try {
      // Check if view record exists
      const { data: existingView } = await supabase
        .from('video_views')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingView) {
        // Update existing view
        const { error } = await supabase
          .from('video_views')
          .update({
            view_count: existingView.view_count + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', existingView.id);

        if (!error) {
          setViewCount(existingView.view_count + 1);
        }
      } else {
        // Insert new view record
        const { error } = await supabase
          .from('video_views')
          .insert({
            user_id: userId,
            video_id: videoId,
            view_count: 1,
            last_viewed_at: new Date().toISOString()
          });

        if (!error) {
          setViewCount(1);
        }
      }
    } catch (error) {
      console.error('Error recording video view:', error);
    }
  };

  // Load view count for current video
  const loadViewCount = async (videoId: string, userId: string) => {
    try {
      const { data } = await supabase
        .from('video_views')
        .select('view_count')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (data) {
        setViewCount(data.view_count);
      }
    } catch (error) {
      console.error('Error loading view count:', error);
    }
  };

  const loadTechniqueFromServer = useCallback(async (videoId: string, userId: string, cacheKey: string) => {
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .eq("id", videoId)
      .maybeSingle();

    if (error) {
      toast.error("Error loading technique", {
        description: error.message,
      });
      return null;
    }

    const techniqueData = data as Technique;
    setTechnique(techniqueData);

    // Load view count and record new view in parallel
    const viewPromise = loadViewCount(videoId, userId).then(() => recordVideoView(videoId, userId));

    // Get all series to calculate letter index
    let letterValue = "";
    let seriesVids: Technique[] = [];
    
    if (techniqueData?.series_name) {
      // Load series data in parallel
      const [allSeriesResult, seriesDataResult] = await Promise.all([
        supabase
          .from("techniques")
          .select("series_name")
          .not("series_name", "is", null)
          .order("series_name", { ascending: true }),
        supabase
          .from("techniques")
          .select("*")
          .eq("series_name", techniqueData.series_name)
          .neq("id", videoId)
          .order("series_order", { ascending: true })
      ]);

      if (allSeriesResult.data) {
        const uniqueSeries = [...new Set(allSeriesResult.data.map(s => s.series_name))].filter(Boolean) as string[];
        const seriesIndex = uniqueSeries.indexOf(techniqueData.series_name);
        if (seriesIndex !== -1) {
          letterValue = String.fromCharCode(65 + seriesIndex);
          setSeriesLetter(letterValue);
        }
      }

      if (seriesDataResult.data) {
        seriesVids = seriesDataResult.data as Technique[];
        setSeriesVideos(seriesVids);
      }
    }

    // Wait for view operations to complete
    await viewPromise;

    // Cache the result with updated_at as part of the key
    const cacheData = {
      technique: techniqueData,
      seriesVideos: seriesVids,
      seriesLetter: letterValue,
      viewCount: viewCount,
      timestamp: Date.now(),
      updated_at: techniqueData.updated_at
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return techniqueData;
  }, [viewCount]);

  // キャッシュから即座に復元（ネットワーク不要）
  const restoreFromCache = useCallback((): { technique: Technique; seriesVideos: Technique[]; seriesLetter: string; viewCount: number } | null => {
    if (!id) return null;
    
    const cacheKey = `technique:${id}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - (cachedData.timestamp || 0);
        
        // キャッシュが10分以内なら使用
        if (cacheAge < 10 * 60 * 1000 && cachedData.technique) {
          return {
            technique: cachedData.technique,
            seriesVideos: cachedData.seriesVideos || [],
            seriesLetter: cachedData.seriesLetter || "",
            viewCount: cachedData.viewCount || 0
          };
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }
    return null;
  }, [id]);

  // バックグラウンドでキャッシュを更新
  const backgroundRefresh = useCallback(async (userId: string) => {
    if (!id) return;
    
    const cacheKey = `technique:${id}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        
        // updated_atをチェックして変更があれば更新
        const { data: currentData } = await supabase
          .from("techniques")
          .select("updated_at")
          .eq("id", id)
          .maybeSingle();
        
        if (currentData && currentData.updated_at !== cachedData.updated_at) {
          // データが更新されているのでリロード
          await loadTechniqueFromServer(id, userId, cacheKey);
        }
      } catch (e) {
        console.error('Background refresh error:', e);
      }
    }
  }, [id, loadTechniqueFromServer]);

  // 統合初期化 - キャッシュがあれば即座表示、なければサーバーから取得
  useEffect(() => {
    if (!id) return;
    
    const initializeAll = async () => {
      try {
        // useAuthからユーザー情報を使用（すでにロード済み）
        if (!user) {
          // ユーザーがまだロード中の場合は待機
          return;
        }

        const userId = user.id;

        // キャッシュから即座に復元を試みる
        const cachedData = restoreFromCache();
        
        if (cachedData) {
          // キャッシュがあれば即座に表示
          setTechnique(cachedData.technique);
          setSeriesVideos(cachedData.seriesVideos);
          setSeriesLetter(cachedData.seriesLetter);
          setViewCount(cachedData.viewCount);
          setIsReady(true);
          
          // バックグラウンドで更新チェック
          backgroundRefresh(userId);
        } else {
          // キャッシュがない場合はサーバーから取得
          await loadTechniqueFromServer(id, userId, `technique:${id}`);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setIsReady(true);
      }
    };

    initializeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const getTechniqueName = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.name_ja;
      case "pt":
        return tech.name_pt;
      default:
        return tech.name;
    }
  };

  const getTechniqueDescription = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.description_ja;
      case "pt":
        return tech.description_pt;
      default:
        return tech.description;
    }
  };

  // 翻訳済み動画が存在するかチェック
  const hasTranslatedVideo = (tech: Technique, lang: string): boolean => {
    // video_metadataをチェック
    if (tech.video_metadata?.[lang]?.video_url) {
      return true;
    }
    // 従来のフィールドをチェック
    if (lang === "ja" && tech.video_url_ja) return true;
    if (lang === "pt" && tech.video_url_pt) return true;
    // 英語は元動画なので常に存在
    if (lang === "en" && tech.video_url) return true;
    return false;
  };

  const getTechniqueVideoUrl = (tech: Technique) => {
    // まずvideo_metadataをチェック
    if (tech.video_metadata) {
      const metadata = tech.video_metadata[language];
    if (metadata?.video_url) {
      return metadata.video_url.includes('/storage/v1/object/public/technique-videos/') && metadata.video_url.endsWith('.mp4') && typeof tech.video_url === 'string' && (tech.video_url.includes('.m3u8') || tech.video_url.includes('cloudflarestream.com') || tech.video_url.includes('videodelivery.net')) ? tech.video_url : metadata.video_url;
    }
    }
    
    // 従来のフィールドをチェック
    switch (language) {
      case "ja":
        return tech.video_url_ja || tech.video_url;
      case "pt":
        return tech.video_url_pt || tech.video_url;
      default:
        // 他の言語の場合は元の動画（日本語）を返す
        return tech.video_url_ja || tech.video_url;
    }
  };

  const getTechniqueThumbnailUrl = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.thumbnail_url_ja || tech.thumbnail_url;
      case "pt":
        return tech.thumbnail_url_pt || tech.thumbnail_url;
      default:
      return tech.thumbnail_url;
    }
  };

  // 利用可能な音声言語のリストを作成
  const getAvailableAudioLanguages = (tech: Technique) => {
    const languages: { code: string; label: string; videoUrl: string }[] = [];
    
    // 日本語（オリジナル）
    const jaUrl = tech.video_url_ja || tech.video_url;
    if (jaUrl) {
      languages.push({ code: "ja", label: "日本語", videoUrl: jaUrl });
    }
    
    // 英語
    if (tech.video_metadata?.en?.video_url) {
      languages.push({ code: "en", label: "English", videoUrl: tech.video_metadata.en.video_url });
    } else if (tech.video_url && tech.video_url !== tech.video_url_ja) {
      // video_urlが英語版の場合
      languages.push({ code: "en", label: "English", videoUrl: tech.video_url });
    }
    
    // ポルトガル語
    if (tech.video_metadata?.pt?.video_url) {
      languages.push({ code: "pt", label: "Português", videoUrl: tech.video_metadata.pt.video_url });
    } else if (tech.video_url_pt) {
      languages.push({ code: "pt", label: "Português", videoUrl: tech.video_url_pt });
    }
    
    return languages;
  };

  // 現在の音声言語に基づいて動画URLを取得
  const getCurrentVideoUrl = (tech: Technique) => {
    const availableLangs = getAvailableAudioLanguages(tech);
    const current = availableLangs.find(l => l.code === currentAudioLanguage);
    if (current) return current.videoUrl;
    
    // フォールバック: 日本語 → 言語設定 → 元動画
    return getTechniqueVideoUrl(tech);
  };

  // 音声言語切り替えハンドラ
  const handleAudioLanguageChange = (langCode: string, currentTime: number) => {
    if (!technique) return;
    
    // 新しい動画URLを取得
    const availableLangs = getAvailableAudioLanguages(technique);
    const targetLang = availableLangs.find(l => l.code === langCode);
    if (!targetLang) return;
    
    // 現在の再生位置を新しい動画URL用のキーで保存
    const newProgressKey = `video-progress:${targetLang.videoUrl}`;
    sessionStorage.setItem(newProgressKey, currentTime.toString());
    
    setCurrentAudioLanguage(langCode);
    
    toast.success(
      langCode === "ja" ? "日本語に切り替えました" :
      langCode === "en" ? "Switched to English" :
      langCode === "pt" ? "Mudou para Português" :
      "Language changed"
    );
  };

  // 翻訳を開始
  const startTranslation = async () => {
    if (!technique || !user) return;
    
    const sourceVideoUrl = technique.video_url_ja || technique.video_url;
    if (!sourceVideoUrl) {
      toast.error(language === "ja" ? "元の動画がありません" : "No source video available");
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-video", {
        body: {
          videoUrl: sourceVideoUrl,
          sourceLanguage: "ja",
          targetLanguage: language,
          techniqueId: technique.id,
        },
      });

      if (error) throw error;

      if (data.projectId) {
        setTranslationProjectId(data.projectId);
        setTranslationStatus("translating");
        
        // video_metadataに翻訳プロジェクトIDを保存
        const currentMetadata = technique.video_metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          [language]: {
            ...currentMetadata[language],
            translation_project_id: data.projectId,
            translation_status: "translating",
          },
        };

        await supabase
          .from("techniques")
          .update({ video_metadata: updatedMetadata })
          .eq("id", technique.id);

        toast.success(
          language === "ja" 
            ? "翻訳を開始しました。完了までしばらくお待ちください。" 
            : "Translation started. Please wait for completion."
        );
        
        // 翻訳状況のポーリング開始
        checkTranslationStatus(data.projectId);
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      toast.error(
        language === "ja" 
          ? "翻訳の開始に失敗しました" 
          : "Failed to start translation"
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // 翻訳状況をチェック
  const checkTranslationStatus = async (projectId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("check-translation-status", {
        body: { projectId },
      });

      if (error) throw error;

      if (data.status === "completed" || data.status === "done" || data.status === "merging_done") {
        if (data.videoUrl) {
          // 翻訳完了、video_metadataを更新
          const currentMetadata = technique?.video_metadata || {};
          const updatedMetadata = {
            ...currentMetadata,
            [language]: {
              ...currentMetadata[language],
              video_url: data.videoUrl,
              translation_status: "completed",
            },
          };

          await supabase
            .from("techniques")
            .update({ video_metadata: updatedMetadata })
            .eq("id", technique?.id);

          setTranslationStatus("completed");
          
          // techniqueを更新してリロード
          setTechnique(prev => prev ? {
            ...prev,
            video_metadata: updatedMetadata,
          } : null);

          toast.success(
            language === "ja" 
              ? "翻訳が完了しました！" 
              : "Translation completed!"
          );
        }
      } else {
        // まだ翻訳中、5秒後に再チェック
        setTimeout(() => checkTranslationStatus(projectId), 5000);
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  // 翻訳状況の初期チェック
  useEffect(() => {
    if (technique && language !== "ja") {
      const metadata = technique.video_metadata?.[language];
      if (metadata?.translation_project_id && metadata?.translation_status === "translating") {
        setTranslationProjectId(metadata.translation_project_id);
        setTranslationStatus("translating");
        checkTranslationStatus(metadata.translation_project_id);
      } else if (hasTranslatedVideo(technique, language)) {
        setTranslationStatus("completed");
      } else {
        setTranslationStatus("none");
      }
    }
  }, [technique, language]);

  const handlePracticeSubmit = async () => {
    if (!user || !technique) return;

    try {
      const { error } = await supabase.from("practice_records").insert({
        user_id: user.id,
        technique_id: technique.id,
        practice_date: format(formData.practice_date, "yyyy-MM-dd"),
        proficiency_level: parseInt(formData.proficiency_level),
        repetition_count: parseInt(formData.repetition_count),
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success(
        language === "ja" 
          ? "練習記録を保存しました！" 
          : language === "pt" 
          ? "Registro de prática salvo!" 
          : "Practice record saved!"
      );

      setPracticeDialogOpen(false);
      setFormData({
        practice_date: new Date(),
        proficiency_level: "1",
        repetition_count: "30",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error saving practice record:", error);
      toast.error(
        language === "ja" 
          ? "保存に失敗しました" 
          : language === "pt" 
          ? "Falha ao salvar" 
          : "Failed to save"
      );
    }
  };

  // 統合ローディング - 認証やテクニックデータ読み込み中はスケルトン表示
  if (!isReady || authLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-24 pb-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Video Section Skeleton */}
              <div className="flex-1">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <div className="mt-6 space-y-4">
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              {/* Sidebar Skeleton */}
              <div className="lg:w-80 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Only show membership page to non-authenticated users
  // Logged-in users can view regardless of subscription status per memory features/subscription-access-logic
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Navigation />
        <main className="pt-24 pb-20 px-4 md:px-6">
          <div className="max-w-2xl mx-auto animate-fade-up">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {/* Hero Section */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12 text-center border-b border-border">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  {language === "ja" 
                    ? "100回見て、100回スパーリング" 
                    : language === "pt" 
                    ? "Veja 100 vezes, treine 100 vezes" 
                    : "Watch 100 times, train 100 times"}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  {language === "ja" 
                    ? "このプレミアムコンテンツで技術を徹底的にマスターしましょう。何度も見返すことで、試合で自然に技が出るようになります。" 
                    : language === "pt" 
                    ? "Domine técnicas com conteúdo premium. Repetição leva à perfeição nas competições." 
                    : "Master techniques with premium content. Repetition leads to perfection in competition."}
                </p>
              </div>

              {/* Benefits Section */}
              <div className="p-8 md:p-12 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-medium mb-6 text-center">
                    {language === "ja" 
                      ? "メンバーシップ特典" 
                      : language === "pt" 
                      ? "Benefícios da Assinatura" 
                      : "Membership Benefits"}
                  </h2>
                  <div className="space-y-4">
                    {[
                      { 
                        ja: "全ての技術動画が見放題", 
                        pt: "Acesso ilimitado a todos os vídeos", 
                        en: "Unlimited access to all technique videos" 
                      },
                      { 
                        ja: "視聴回数を記録して進捗管理", 
                        pt: "Rastreie seu progresso com contadores", 
                        en: "Track your progress with view counters" 
                      },
                      { 
                        ja: "いつでもキャンセル可能", 
                        pt: "Cancele a qualquer momento", 
                        en: "Cancel anytime" 
                      },
                      { 
                        ja: "定期的な新コンテンツ追加", 
                        pt: "Novos conteúdos regularmente", 
                        en: "Regular new content updates" 
                      }
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <p className="text-muted-foreground">
                          {language === "ja" ? benefit.ja : language === "pt" ? benefit.pt : benefit.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={() => navigate("/join")}
                    size="lg"
                    className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
                  >
                    {language === "ja" 
                      ? "今すぐ始める" 
                      : language === "pt" 
                      ? "Começar Agora" 
                      : "Start Now"}
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => navigate("/map")}
                    className="w-full"
                  >
                    {t.video.backToMap}
                  </Button>
                </div>

                {/* Trust Badge */}
                <p className="text-center text-sm text-muted-foreground pt-4">
                  {language === "ja" 
                    ? "✓ 1ヶ月の無料トライアル付き" 
                    : language === "pt" 
                    ? "✓ Teste grátis de 1 mês incluído" 
                    : "✓ 1-month free trial included"}
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!technique) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-32 text-center">
          <h1 className="text-4xl font-light mb-4">{t.video.notFound}</h1>
          <Link to="/map">
            <Button variant="outline">{t.video.backToMap}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const videoSeoTitle = technique 
    ? (language === 'ja' 
        ? `${getTechniqueName(technique)} | JiuFlow テクニック動画`
        : `${getTechniqueName(technique)} | JiuFlow Technique Video`)
    : 'JiuFlow Technique Video';
  const videoSeoDescription = technique
    ? (language === 'ja'
        ? `${getTechniqueName(technique)}の解説動画。${getTechniqueDescription(technique) || 'ブラジリアン柔術のテクニックを学ぼう。'}`
        : `${getTechniqueName(technique)} tutorial video. ${getTechniqueDescription(technique) || 'Learn Brazilian Jiu-Jitsu techniques.'}`)
    : 'Learn BJJ techniques';

  return (
    <div className="min-h-screen">
      <SEOHead
        title={videoSeoTitle}
        description={videoSeoDescription.slice(0, 160)}
        ogType="article"
        ogImage={getTechniqueThumbnailUrl(technique) || undefined}
        canonicalUrl={`/video/${id}`}
        keywords={technique?.hashtags || ["BJJ", "柔術", "テクニック"]}
      />
      <Navigation />
      
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Video Section */}
            <div className="flex-1">
              {/* Video Player */}
              <div className="w-full bg-muted rounded-lg overflow-hidden">
                {getCurrentVideoUrl(technique) ? (
                  <VideoPlayer 
                    key={`${technique.id}-${currentAudioLanguage}`} 
                    videoUrl={getCurrentVideoUrl(technique)!} 
                    thumbnailUrl={getTechniqueThumbnailUrl(technique)}
                    autoPlay
                    techniqueId={technique.id}
                    availableLanguages={getAvailableAudioLanguages(technique)}
                    currentAudioLanguage={currentAudioLanguage}
                    onAudioLanguageChange={handleAudioLanguageChange}
                    onVideoEnded={() => {
                      // Increment view count on repeat play
                      if (user?.id) {
                        recordVideoView(technique.id, user.id);
                      }
                    }}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-6xl mb-4">▶</div>
                      <div className="text-sm">
                        {language === "ja" ? "動画なし" : language === "pt" ? "Sem vídeo" : "No video"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Translation Status Banner */}
              {language !== "ja" && (
                <div className="mt-3">
                  {translationStatus === "none" && !hasTranslatedVideo(technique, language) && (
                    <Card className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {language === "pt" 
                              ? "Esta lição está em japonês. Deseja traduzir para o seu idioma?" 
                              : "This lesson is in Japanese. Would you like to translate it to your language?"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "pt" 
                              ? "A tradução automática de áudio pode levar alguns minutos" 
                              : "Automatic audio translation may take a few minutes"}
                          </p>
                        </div>
                        <Button 
                          onClick={startTranslation} 
                          disabled={isTranslating}
                          size="sm"
                        >
                          {isTranslating ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              {language === "pt" ? "Iniciando..." : "Starting..."}
                            </>
                          ) : (
                            language === "pt" ? "Traduzir" : "Translate"
                          )}
                        </Button>
                      </div>
                    </Card>
                  )}

                  {translationStatus === "translating" && (
                    <Card className="p-4 bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20">
                      <div className="flex items-center gap-3">
                        <span className="animate-spin text-xl">⏳</span>
                        <div>
                          <p className="text-sm font-medium">
                            {language === "pt" 
                              ? "Traduzindo o vídeo..." 
                              : "Translating video..."}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {language === "pt" 
                              ? "Isso pode levar alguns minutos. Você pode continuar assistindo enquanto isso." 
                              : "This may take a few minutes. You can continue watching in the meantime."}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {translationStatus === "completed" && hasTranslatedVideo(technique, language) && (
                    <Card className="p-3 bg-gradient-to-r from-green-500/10 to-transparent border-green-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <p className="text-sm">
                          {language === "pt" 
                            ? "Reproduzindo versão traduzida" 
                            : "Playing translated version"}
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Back Button and Technique Info */}
              <div className="mt-6 animate-fade-up space-y-4">
                {/* Back to Map Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {language === "ja" ? "戻る" : language === "pt" ? "Voltar" : "Back"}
                </Button>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl md:text-2xl font-light">{getTechniqueName(technique)}</h1>
                    <button
                      onClick={() => toggleFavorite(technique.id)}
                      className={`p-2 rounded-full transition-all ${
                        isFavorite(technique.id) 
                          ? "bg-amber-500/20 hover:bg-amber-500/30" 
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      title={isFavorite(technique.id) 
                        ? (language === "ja" ? "お気に入りから削除" : language === "pt" ? "Remover dos favoritos" : "Remove from favorites")
                        : (language === "ja" ? "お気に入りに追加" : language === "pt" ? "Adicionar aos favoritos" : "Add to favorites")
                      }
                    >
                      <Heart className={`w-5 h-5 transition-colors ${
                        isFavorite(technique.id) 
                          ? "text-amber-500 fill-amber-500" 
                          : "text-muted-foreground"
                      }`} />
                    </button>
                  </div>
                  <span className="inline-block px-3 py-1 text-xs border border-border w-fit">
                    {technique.category}
                  </span>
                </div>

                {/* View Counter Card */}
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <div className="space-y-4">
                    {/* Main Counter Display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          {viewCount >= 100 ? (
                            <Trophy className="w-6 h-6 text-primary animate-pulse" />
                          ) : viewCount >= 10 ? (
                            <Flame className="w-6 h-6 text-primary" />
                          ) : (
                            <Target className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-3xl font-light text-primary">
                            {viewCount}
                            <span className="text-lg text-muted-foreground ml-2">
                              {language === "ja" ? "回" : language === "pt" ? "x" : "times"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {language === "ja" 
                              ? "繰り返し見て習得" 
                              : language === "pt" 
                              ? "Repetir para dominar" 
                              : "Repeat to master"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">
                          {language === "ja" ? "目標" : language === "pt" ? "Meta" : "Goal"}
                        </div>
                        <div className="text-2xl font-light">
                          100<span className="text-sm text-muted-foreground ml-1">
                            {language === "ja" ? "回" : language === "pt" ? "x" : "times"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={Math.min((viewCount / 100) * 100, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {language === "ja" 
                            ? `あと${Math.max(0, 100 - viewCount)}回` 
                            : language === "pt" 
                            ? `Faltam ${Math.max(0, 100 - viewCount)}` 
                            : `${Math.max(0, 100 - viewCount)} more`}
                        </span>
                        <span>{Math.min(Math.round((viewCount / 100) * 100), 100)}%</span>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="flex gap-2 flex-wrap">
                      {[10, 50, 100].map((milestone) => (
                        <Badge
                          key={milestone}
                          variant={viewCount >= milestone ? "default" : "outline"}
                          className={viewCount >= milestone ? "animate-scale-in" : ""}
                        >
                          {viewCount >= milestone && "✓ "}
                          {milestone}
                          {language === "ja" ? "回" : language === "pt" ? "x" : "x"}
                        </Badge>
                      ))}
                    </div>

                    {/* Motivational Message */}
                    {viewCount >= 100 && (
                      <div className="text-center p-3 bg-primary/10 rounded-lg animate-fade-in">
                        <p className="text-sm font-medium text-primary">
                          {language === "ja" 
                            ? "🎉 100回達成！マスターレベル！" 
                            : language === "pt" 
                            ? "🎉 100x alcançado! Nível Master!" 
                            : "🎉 100 views! Master level!"}
                        </p>
                      </div>
                    )}
                    {viewCount >= 10 && viewCount < 100 && (
                      <div className="text-center p-3 bg-accent/10 rounded-lg animate-fade-in">
                        <p className="text-sm text-muted-foreground">
                          {language === "ja" 
                            ? "🔥 いい調子！継続は力なり" 
                            : language === "pt" 
                            ? "🔥 Ótimo ritmo! Continue assim" 
                            : "🔥 Great pace! Keep it up"}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Practice Record Button */}
                <Card className="p-4 bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium mb-1">
                        {language === "ja" 
                          ? "練習を記録する" 
                          : language === "pt" 
                          ? "Registrar prática" 
                          : "Record Practice"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {language === "ja" 
                          ? "この技の練習を記録して進捗を追跡" 
                          : language === "pt" 
                          ? "Registre e acompanhe seu progresso" 
                          : "Track your progress for this technique"}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setPracticeDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {language === "ja" ? "記録" : language === "pt" ? "Registrar" : "Record"}
                    </Button>
                  </div>
                </Card>
              </div>

              {getTechniqueDescription(technique) && (
                <div className="mt-6 animate-fade-up">
                  <p className="text-base font-light text-muted-foreground leading-relaxed">
                    {getTechniqueDescription(technique)}
                  </p>
                </div>
              )}

              {technique.hashtags && technique.hashtags.length > 0 && (
                <div className="mt-6 animate-fade-up flex flex-wrap gap-2">
                  {technique.hashtags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/map?hashtag=${encodeURIComponent(tag)}`}
                      className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Rating, Comments, and Tip Section */}
              <div className="mt-12 space-y-8">
                <Separator />
                
                {/* Rating and Tip */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">
                      {language === "ja" ? "この動画を評価" : language === "pt" ? "Avaliar vídeo" : "Rate this video"}
                    </h3>
                    {user && <VideoRating videoId={id!} userId={user.id} />}
                  </div>
                  {user && <VideoTip videoId={id!} />}
                </div>

                <Separator />

                {/* Comments */}
                {user && <VideoComments videoId={id!} userId={user.id} />}
              </div>

              <div className="mt-8">
                <Link to="/map">
                  <Button variant="outline" size="lg">
                    {t.video.backToMap}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Series Videos Sidebar */}
            {seriesVideos.length > 0 && (
              <div className="lg:w-[400px] xl:w-[420px]">
                <div className="sticky top-24">
                  <h2 className="text-lg font-medium mb-4 px-2">
                    {language === "ja" 
                      ? `${seriesLetter}. ${technique.series_name}シリーズ` 
                      : language === "pt" 
                      ? `${seriesLetter}. Série ${technique.series_name}` 
                      : `${seriesLetter}. ${technique.series_name} Series`}
                  </h2>
                  <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin">
                    {seriesVideos.map((video) => (
                      <Link
                        key={video.id}
                        to={`/video/${video.id}`}
                        className="block group"
                        onMouseEnter={() => prefetchVideo(getTechniqueVideoUrl(video))}
                      >
                         <div className="flex gap-3 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                          <div className="flex-shrink-0 w-40 h-24 relative">
                            <VideoThumbnail
                              videoUrl={getTechniqueVideoUrl(video)}
                              className="w-full h-full object-cover rounded"
                              showPlayButton
                            />
                            {video.series_order && seriesLetter && (
                              <div className={`absolute top-1 left-1 text-xs font-semibold px-2 py-0.5 rounded ${getSeriesPrefixColors(seriesLetter)}`}>
                                {seriesLetter}-{video.series_order}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {getTechniqueName(video)}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {video.category}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
       </main>
      
      <Footer />

      {/* Practice Record Dialog */}
      <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "ja" 
                ? "練習記録を追加" 
                : language === "pt" 
                ? "Adicionar registro de prática" 
                : "Add Practice Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {language === "ja" ? "技術" : language === "pt" ? "Técnica" : "Technique"}
              </Label>
              <Input value={getTechniqueName(technique!)} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>
                {language === "ja" ? "練習日" : language === "pt" ? "Data da prática" : "Practice Date"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.practice_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.practice_date}
                    onSelect={(date) => date && setFormData({ ...formData, practice_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>
                {language === "ja" ? "熟練度" : language === "pt" ? "Proficiência" : "Proficiency Level"}
              </Label>
              <Select
                value={formData.proficiency_level}
                onValueChange={(value) => setFormData({ ...formData, proficiency_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    {language === "ja" ? "初心者" : language === "pt" ? "Iniciante" : "Beginner"}
                  </SelectItem>
                  <SelectItem value="2">
                    {language === "ja" ? "中級者" : language === "pt" ? "Intermediário" : "Intermediate"}
                  </SelectItem>
                  <SelectItem value="3">
                    {language === "ja" ? "上級者" : language === "pt" ? "Avançado" : "Advanced"}
                  </SelectItem>
                  <SelectItem value="4">
                    {language === "ja" ? "エキスパート" : language === "pt" ? "Especialista" : "Expert"}
                  </SelectItem>
                  <SelectItem value="5">
                    {language === "ja" ? "マスター" : language === "pt" ? "Mestre" : "Master"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {language === "ja" ? "練習回数" : language === "pt" ? "Repetições" : "Repetitions"}
              </Label>
              <Input
                type="number"
                min="1"
                value={formData.repetition_count}
                onChange={(e) => setFormData({ ...formData, repetition_count: e.target.value })}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {language === "ja" ? "メモ" : language === "pt" ? "Notas" : "Notes"}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={
                  language === "ja" 
                    ? "練習の詳細や気づきを記録..." 
                    : language === "pt" 
                    ? "Registre detalhes e observações..." 
                    : "Record details and observations..."
                }
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPracticeDialogOpen(false)}>
              {language === "ja" ? "キャンセル" : language === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handlePracticeSubmit}>
              {language === "ja" ? "保存" : language === "pt" ? "Salvar" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Video;
