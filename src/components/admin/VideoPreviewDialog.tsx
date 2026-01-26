import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getAvailableVideoLanguages, type TechniqueVideoData } from "@/lib/videoLanguages";
import { Check, Globe, X } from "lucide-react";

export interface VideoPreviewTechnique extends TechniqueVideoData {
  name?: string;
  name_ja?: string;
}

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technique: VideoPreviewTechnique | null;
  initialLanguage?: string;
}

export function VideoPreviewDialog({ open, onOpenChange, technique, initialLanguage }: VideoPreviewDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage || "ja");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  // ★ VideoPlayerを確実にアンマウントするためのkey
  const [playerKey, setPlayerKey] = useState(0);

  // メモ化してレンダリングごとの再計算を防ぐ
  const availableLanguages = useMemo(() => {
    return technique ? getAvailableVideoLanguages(technique) : [];
  }, [technique]);

  // ダイアログの開閉時の処理
  useEffect(() => {
    if (open && technique) {
      const startLang = initialLanguage && availableLanguages.some(l => l.code === initialLanguage) 
        ? initialLanguage 
        : "ja";
      setSelectedLanguage(startLang);
      // 初期動画URLを設定
      const langData = availableLanguages.find((l) => l.code === startLang);
      setCurrentVideoUrl(langData?.videoUrl || technique.video_url || null);
      // 新しいtechniqueの時はkeyを更新
      setPlayerKey(prev => prev + 1);
    } else if (!open) {
      // ★ 重要: ダイアログが閉じられたら即座にビデオURLをクリア
      setCurrentVideoUrl(null);
    }
  }, [open, technique, availableLanguages, initialLanguage]);

  // 言語切り替え時のURL更新
  useEffect(() => {
    if (!open) return; // ダイアログが閉じている時は処理しない
    
    const lang = availableLanguages.find((l) => l.code === selectedLanguage);
    if (lang && lang.videoUrl !== currentVideoUrl) {
      setCurrentVideoUrl(lang.videoUrl);
    }
  }, [selectedLanguage, availableLanguages, open, currentVideoUrl]);

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  if (!technique) return null;

  const techniqueName = technique.name_ja || technique.name || "動画プレビュー";
  const selectedLangInfo = availableLanguages.find((l) => l.code === selectedLanguage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{techniqueName}</span>
            {availableLanguages.length > 1 && (
              <Badge variant="secondary" className="ml-2">
                <Globe className="h-3 w-3 mr-1" />
                {availableLanguages.length}言語
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language selector - Dropdown */}
          {availableLanguages.length > 0 && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">音声言語:</span>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue>
                    {selectedLangInfo && (
                      <span className="flex items-center gap-2">
                        {selectedLangInfo.isOriginal && <Check className="h-3 w-3" />}
                        {selectedLangInfo.label}
                        {selectedLangInfo.isOriginal && " (オリジナル)"}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        {lang.isOriginal && <Check className="h-3 w-3 text-primary" />}
                        <span>{lang.label}</span>
                        {lang.isOriginal && (
                          <span className="text-xs text-muted-foreground">(オリジナル)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Video Player */}
          <div className="w-full bg-black rounded-lg overflow-hidden" style={{ maxHeight: "65vh" }}>
            {currentVideoUrl ? (
              <VideoPlayer
                key={`preview-${playerKey}-${currentVideoUrl}`}
                videoUrl={currentVideoUrl}
                autoPlay={true}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <X className="h-8 w-8 mr-2" />
                動画がありません
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
