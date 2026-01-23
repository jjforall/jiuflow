import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mic, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  video_url: string | null;
  video_url_ja?: string | null;
  video_url_pt?: string | null;
  video_metadata?: Record<string, { video_url?: string; created_at?: string }> | null;
  series_prefix?: string | null;
  series_order?: number | null;
  transcription?: unknown;
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
];

interface TranslationQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technique: Technique | null;
  onTranslationStarted?: () => void;
}

export function TranslationQuickDialog({
  open,
  onOpenChange,
  technique,
  onTranslationStarted,
}: TranslationQuickDialogProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<string>("ja");
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [translationProvider, setTranslationProvider] = useState<'elevenlabs' | 'rask' | 'heygen'>('elevenlabs');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);

  useEffect(() => {
    const savedProvider = localStorage.getItem('translation_provider');
    if (savedProvider === 'rask' || savedProvider === 'elevenlabs' || savedProvider === 'heygen') {
      setTranslationProvider(savedProvider);
    }
  }, []);

  useEffect(() => {
    if (open && technique) {
      const available = getAvailableSourceLanguages(technique);
      const firstLang = available[0] || 'ja';
      setSourceLanguage(firstLang);
      
      setVideoDuration(null);
      setIsLoadingDuration(true);
      
      const videoUrl = technique.video_url_ja || technique.video_url;
      if (videoUrl) {
        fetchVideoDuration(videoUrl);
      } else {
        setIsLoadingDuration(false);
      }
    }
  }, [open, technique]);

  const getAvailableSourceLanguages = (tech: Technique | null): string[] => {
    if (!tech) return ['ja'];
    const available: string[] = [];
    
    if (tech.video_url_ja || tech.video_url) available.push('ja');
    if (tech.video_url_pt) available.push('pt');
    if (tech.video_metadata) {
      Object.entries(tech.video_metadata).forEach(([lang, data]) => {
        if (data?.video_url && !available.includes(lang)) {
          available.push(lang);
        }
      });
    }
    
    return available;
  };

  const getSourceVideoUrl = (tech: Technique | null, lang: string): string | null => {
    if (!tech) return null;
    switch (lang) {
      case 'ja':
        return tech.video_url_ja || tech.video_url;
      case 'pt':
        return tech.video_url_pt || null;
      default:
        return tech.video_metadata?.[lang]?.video_url || null;
    }
  };

  const getTranslatedLanguages = (tech: Technique | null): string[] => {
    if (!tech) return [];
    const langs: string[] = [];
    if (tech.video_url_pt) langs.push('pt');
    if (tech.video_metadata) {
      Object.entries(tech.video_metadata).forEach(([lang, data]) => {
        if (data?.video_url && !langs.includes(lang)) {
          langs.push(lang);
        }
      });
    }
    return langs;
  };

  const fetchVideoDuration = (videoUrl: string) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setIsLoadingDuration(false);
      video.remove();
    };
    
    video.onerror = () => {
      console.warn('Could not load video metadata');
      setIsLoadingDuration(false);
      video.remove();
    };
    
    if (videoUrl.includes('videodelivery.net') && videoUrl.includes('/manifest/')) {
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

  const handleTranslate = async () => {
    if (!technique) return;
    
    const sourceVideoUrl = getSourceVideoUrl(technique, sourceLanguage);
    
    if (!sourceVideoUrl) {
      toast.error("エラー", {
        description: `ソース動画（${ALL_LANGUAGES.find(l => l.code === sourceLanguage)?.nativeName || sourceLanguage}）が見つかりません`,
      });
      return;
    }
    
    const functionName = translationProvider === 'rask' 
      ? 'rask-translate-video' 
      : translationProvider === 'heygen' 
        ? 'heygen-translate-video' 
        : 'translate-video';
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          videoUrl: sourceVideoUrl,
          sourceLanguage,
          targetLanguage,
          techniqueId: technique.id,
          techniqueName: technique.name_ja || technique.name,
        }
      });

      if (error) throw error;

      if (data && data.projectId) {
        const providerName = translationProvider === 'rask' ? 'Rask.ai' : translationProvider === 'heygen' ? 'HeyGen' : 'ElevenLabs';
        toast.success("動画翻訳を開始しました", {
          description: `${providerName}で翻訳中。完了すると通知されます。`,
        });
        
        onTranslationStarted?.();
        onOpenChange(false);
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

  if (!technique) return null;

  const availableSourceLangs = getAvailableSourceLanguages(technique);
  const translatedLangs = getTranslatedLanguages(technique);
  const targetOptions = ALL_LANGUAGES.filter(l => l.code !== sourceLanguage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            吹き替え翻訳
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Technique Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="font-medium">{technique.name_ja || technique.name}</div>
            {technique.series_prefix && (
              <div className="text-sm text-muted-foreground">
                {technique.series_prefix}-{technique.series_order}
              </div>
            )}
          </div>

          {/* Existing Translations */}
          {translatedLangs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">翻訳済み:</span>
              {translatedLangs.map(lang => {
                const langInfo = ALL_LANGUAGES.find(l => l.code === lang);
                return (
                  <Badge key={lang} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {langInfo?.name || lang}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">翻訳プロバイダー</label>
            <Select value={translationProvider} onValueChange={(v) => setTranslationProvider(v as typeof translationProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                <SelectItem value="rask">Rask.ai</SelectItem>
                <SelectItem value="heygen">HeyGen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ソース言語</label>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSourceLangs.map(code => {
                  const lang = ALL_LANGUAGES.find(l => l.code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      {lang?.name || code} ({lang?.nativeName || code})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ターゲット言語</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                    {translatedLangs.includes(lang.code) && " ✓"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Warning */}
          {!isLoadingDuration && videoDuration && videoDuration > 300 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                動画が{Math.round(videoDuration / 60)}分あります。翻訳には時間がかかる場合があります。
              </div>
            </div>
          )}

          {/* Translate Button */}
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !technique.video_url}
            className="w-full"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                翻訳開始中...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                翻訳を開始
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
