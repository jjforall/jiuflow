import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { Music, Headphones, AlertTriangle, BookOpen, Users, Map, Clock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapLoadingStateProps {
  startTime: number;
}

export const MapLoadingState = ({ startTime }: MapLoadingStateProps) => {
  const { language } = useLanguage();
  const { isPlaying, play, loadPlaylist, playlist } = useMusic();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 60) {
        setShowTimeout(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handlePlayMusic = async () => {
    if (playlist.length === 0) {
      await loadPlaylist();
    }
    play();
  };

  const tips = [
    {
      ja: "柔術は「柔よく剛を制す」の精神",
      en: "Jiu-Jitsu embodies 'softness overcomes hardness'",
      pt: "Jiu-Jitsu representa 'a suavidade vence a força'"
    },
    {
      ja: "呼吸を整えてリラックス",
      en: "Control your breathing and relax",
      pt: "Controle sua respiração e relaxe"
    },
    {
      ja: "基本が最も大切",
      en: "Fundamentals are most important",
      pt: "Os fundamentos são mais importantes"
    },
    {
      ja: "毎日少しずつ上達しよう",
      en: "Improve a little every day",
      pt: "Melhore um pouco a cada dia"
    }
  ];

  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);

  const tip = tips[currentTip];

  if (showTimeout) {
    return (
      <div className="animate-fade-in">
        <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-destructive/10 animate-pulse" />
            </div>
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive relative z-10" />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {language === "ja" 
                ? "接続に時間がかかっています" 
                : language === "pt" 
                ? "A conexão está demorando" 
                : "Connection is taking longer than expected"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ja" 
                ? "現在、一部のユーザーで接続の問題が発生しています。問題を認識しており、対応中です。" 
                : language === "pt" 
                ? "Alguns usuários estão tendo problemas de conexão. Estamos cientes e trabalhando nisso." 
                : "Some users are experiencing connection issues. We're aware and working on it."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              {language === "ja" ? "ページを再読み込み" : language === "pt" ? "Recarregar página" : "Reload Page"}
            </Button>
            <Link to="/contact">
              <Button className="gap-2 w-full">
                <MessageCircle className="w-4 h-4" />
                {language === "ja" ? "管理者に連絡" : language === "pt" ? "Contatar administrador" : "Contact Admin"}
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              {language === "ja" 
                ? "その間、他のコンテンツをお楽しみください" 
                : language === "pt" 
                ? "Enquanto isso, aproveite outros conteúdos" 
                : "Meanwhile, enjoy other content"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/about" className="group">
                <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{language === "ja" ? "jiuflowについて" : language === "pt" ? "Sobre jiuflow" : "About jiuflow"}</p>
                </div>
              </Link>
              <Link to="/athletes" className="group">
                <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                  <Users className="w-8 h-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{language === "ja" ? "アスリート" : language === "pt" ? "Atletas" : "Athletes"}</p>
                </div>
              </Link>
              <Link to="/dojos" className="group">
                <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                  <Map className="w-8 h-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                  <p className="font-medium">{language === "ja" ? "道場一覧" : language === "pt" ? "Academias" : "Dojos"}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Loading Animation */}
      <div className="flex flex-col items-center justify-center py-12 space-y-8">
        {/* Animated Belt Loading */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary/50 border-b-transparent border-l-transparent animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary animate-pulse">柔</span>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium text-foreground">
            {language === "ja" 
              ? "技マップを読み込み中..." 
              : language === "pt" 
              ? "Carregando mapa de técnicas..." 
              : "Loading technique map..."}
          </h3>
          <p className="text-sm text-muted-foreground">
            {elapsedSeconds > 0 && `${elapsedSeconds}${language === "ja" ? "秒" : "s"}`}
          </p>
        </div>

        {/* Tip of the moment */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 max-w-md text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2">💡 {language === "ja" ? "豆知識" : "Tip"}</p>
          <p className="text-foreground font-medium transition-all duration-500">
            {language === "ja" ? tip.ja : language === "pt" ? tip.pt : tip.en}
          </p>
        </div>

        {/* Music Prompt */}
        {!isPlaying && (
          <div className={cn(
            "bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 max-w-md",
            "animate-fade-in"
          )}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Headphones className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent animate-ping" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {language === "ja" 
                    ? "音楽を聴きながら待ちませんか？" 
                    : language === "pt" 
                    ? "Que tal ouvir música enquanto espera?" 
                    : "Want to listen to music while waiting?"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "BGMでリラックス" 
                    : language === "pt" 
                    ? "Relaxe com a música" 
                    : "Relax with some BGM"}
                </p>
              </div>
            </div>
            <Button 
              onClick={handlePlayMusic}
              className="w-full mt-4 gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Music className="w-4 h-4" />
              {language === "ja" ? "音楽を再生" : language === "pt" ? "Tocar música" : "Play Music"}
            </Button>
          </div>
        )}

        {/* Now Playing Indicator */}
        {isPlaying && (
          <div className="flex items-center gap-2 text-sm text-primary animate-fade-in">
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{ 
                    height: `${Math.random() * 12 + 4}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.5s'
                  }}
                />
              ))}
            </div>
            <span>{language === "ja" ? "再生中" : "Playing"}</span>
          </div>
        )}
      </div>

      {/* Skeleton Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mt-8 opacity-50">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="space-y-2" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="aspect-video w-full bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};
