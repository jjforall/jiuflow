import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

export function VideoPreviewDialog({ open, onOpenChange, technique }: VideoPreviewDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ja");
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  // Get available languages for this technique
  const availableLanguages = technique ? getAvailableVideoLanguages(technique) : [];

  // Reset to Japanese when dialog opens with new technique
  useEffect(() => {
    if (open && technique) {
      setSelectedLanguage("ja");
      // Set initial video URL
      const jaLang = availableLanguages.find((l) => l.code === "ja");
      setCurrentVideoUrl(jaLang?.videoUrl || technique.video_url || null);
    }
  }, [open, technique?.video_url]);

  // Update video URL when language changes
  useEffect(() => {
    const lang = availableLanguages.find((l) => l.code === selectedLanguage);
    if (lang) {
      setCurrentVideoUrl(lang.videoUrl);
    }
  }, [selectedLanguage, availableLanguages]);

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
  };

  if (!technique) return null;

  const techniqueName = technique.name_ja || technique.name || "動画プレビュー";

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
          {/* Language selector */}
          {availableLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map((lang) => (
                <Button
                  key={lang.code}
                  variant={selectedLanguage === lang.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLanguageChange(lang.code)}
                  className="min-w-[80px]"
                >
                  {lang.isOriginal && <Check className="h-3 w-3 mr-1" />}
                  {lang.label}
                </Button>
              ))}
            </div>
          )}

          {/* Video Player */}
          <div className="w-full bg-black rounded-lg overflow-hidden" style={{ maxHeight: "65vh" }}>
            {currentVideoUrl ? (
              <VideoPlayer
                key={`${technique.video_url}-${selectedLanguage}`}
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

          {/* Language info */}
          <div className="text-sm text-muted-foreground">
            {selectedLanguage === "ja" ? (
              <span>🇯🇵 オリジナル音声（日本語）</span>
            ) : (
              <span>
                翻訳版音声（{availableLanguages.find((l) => l.code === selectedLanguage)?.label}）
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
