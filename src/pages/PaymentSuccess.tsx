import { CheckCircle, Award, Users, Video, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

type OnboardingStep = 'welcome' | 'experience' | 'style' | 'goal';

interface OnboardingChoice {
  experience?: 'beginner' | 'intermediate' | 'slump';
  style?: 'bottom' | 'top' | 'both';
  goal?: 'submit' | 'sweep' | 'defend';
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [choices, setChoices] = useState<OnboardingChoice>({});
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getRecommendedCategory = (): string => {
    const { experience, style, goal } = choices;
    
    if (goal === 'submit') {
      return 'submission';
    } else if (goal === 'sweep') {
      return 'sweep';
    } else if (goal === 'defend') {
      return 'escape';
    } else if (style === 'bottom') {
      return 'sweep';
    } else if (style === 'top') {
      return 'control';
    } else if (experience === 'beginner') {
      return 'control';
    }
    
    return '';
  };

  const handleExperienceChoice = (exp: 'beginner' | 'intermediate' | 'slump') => {
    setChoices({ ...choices, experience: exp });
    if (exp === 'beginner') {
      // 初心者は直接技マップへ
      navigate('/map');
    } else {
      setCurrentStep('style');
    }
  };

  const handleStyleChoice = (style: 'bottom' | 'top' | 'both') => {
    setChoices({ ...choices, style });
    if (style === 'both') {
      // 両方苦手な場合は守りへ
      navigate('/map?category=escape');
    } else {
      setCurrentStep('goal');
    }
  };

  const handleGoalChoice = (goal: 'submit' | 'sweep' | 'defend') => {
    setChoices({ ...choices, goal });
    const category = goal === 'submit' ? 'submission' : goal === 'sweep' ? 'sweep' : 'escape';
    navigate(`/map?category=${category}`);
  };

  if (currentStep === 'experience') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
          <div className="max-w-3xl w-full space-y-8 animate-fade-up">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">
                {language === "ja" ? "今の帯の色（または経験）は？" : "What's your belt level?"}
              </h2>
              <p className="text-muted-foreground">
                {language === "ja" ? "あなたに最適な動画を提案します" : "We'll recommend the best videos for you"}
              </p>
            </div>

            <div className="grid gap-4">
              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleExperienceChoice('beginner')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "白帯 / 始めたばかり 🐣" : "White Belt / Beginner"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "基礎から学びたい方" : "Learn from the basics"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleExperienceChoice('intermediate')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "青帯以上 / 経験者 🥋" : "Blue Belt+ / Intermediate"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "応用技を学びたい方" : "Learn advanced techniques"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleExperienceChoice('slump')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "伸び悩み中 / スランプ 🌀" : "In a Slump"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "新しい視点が欲しい方" : "Need a fresh perspective"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  if (currentStep === 'style') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
          <div className="max-w-3xl w-full space-y-8 animate-fade-up">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">
                {language === "ja" ? "どちらかというと得意なのは？" : "What's your preferred style?"}
              </h2>
            </div>

            <div className="grid gap-4">
              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleStyleChoice('bottom')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "下からのガード（ボトム）" : "Guard / Bottom"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "クローズドガード、スイープが得意" : "Closed guard, sweeps"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleStyleChoice('top')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "上からの攻め（トップ）" : "Top Control"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "コンバットベース、パスガードが得意" : "Combat base, passing"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleStyleChoice('both')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "正直、どっちも苦手..." : "Both are challenging"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "まずは守りと解除から" : "Focus on defense first"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={() => setCurrentStep('experience')}>
                {language === "ja" ? "戻る" : "Back"}
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  if (currentStep === 'goal') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
          <div className="max-w-3xl w-full space-y-8 animate-fade-up">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">
                {language === "ja" ? "今日の練習でやりたいことは？" : "What's your goal today?"}
              </h2>
            </div>

            <div className="grid gap-4">
              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleGoalChoice('submit')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "一本を取りたい！🎯" : "Get the submission!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "キムラ、アームバー、腕十字など" : "Kimura, armbar, cross"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleGoalChoice('sweep')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "相手をひっくり返したい！🔄" : "Sweep them!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "スイープ、テレフォンなど" : "Various sweeps"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleGoalChoice('defend')}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {language === "ja" ? "とにかく守り抜きたい！🛡️" : "Defend and escape!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "姿勢、マウントエスケープなど" : "Posture, mount escape"}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={() => setCurrentStep('style')}>
                {language === "ja" ? "戻る" : "Back"}
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-4xl w-full space-y-8 animate-fade-up">
          <>
              {/* Brand Header */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                    <CheckCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-success" />
                  </div>
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  JiuFlow
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  {language === "ja" 
                    ? "世界をつなぐ柔術プラットフォーム" 
                    : language === "pt" 
                    ? "A Plataforma Global de Jiu-Jitsu" 
                    : "The Global Jiu-Jitsu Platform"}
                </p>
              </div>

              {/* Success Message */}
              <Card className="border-2 border-success/30 shadow-xl bg-gradient-to-br from-card via-card to-success/5">
                <CardContent className="p-6 sm:p-8 text-center space-y-6">
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-success to-accent bg-clip-text text-transparent">
                    {language === "ja" 
                      ? "決済が完了しました！" 
                      : language === "pt" 
                      ? "Pagamento Concluído!" 
                      : "Payment Complete!"}
                  </h2>
                  
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {language === "ja" 
                      ? "あなたに最適な動画をおすすめします" 
                      : language === "pt" 
                      ? "Recomendaremos os melhores vídeos para você" 
                      : "We'll recommend the best videos for you"}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={() => setCurrentStep('experience')}
                      className="text-lg py-6 px-8"
                    >
                      {language === "ja" 
                        ? "おすすめ動画を見る" 
                        : language === "pt" 
                        ? "Ver vídeos recomendados" 
                        : "Get Recommendations"}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/map")}
                      className="text-lg py-6 px-8"
                    >
                      {language === "ja" 
                        ? "技マップへ移動" 
                        : language === "pt" 
                        ? "Ir para o Mapa" 
                        : "Go to Map"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Card className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-primary/5">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">
                      {language === "ja" 
                        ? "4K上面映像" 
                        : language === "pt" 
                        ? "Vídeo 4K Superior" 
                        : "4K Top-View Videos"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === "ja" 
                        ? "技の細部まで見える高画質映像" 
                        : language === "pt" 
                        ? "Vídeos de alta qualidade" 
                        : "Crystal clear technique videos"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-accent/5">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="p-3 rounded-xl bg-accent/10">
                        <Award className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">
                      {language === "ja" 
                        ? "体系的なカリキュラム" 
                        : language === "pt" 
                        ? "Currículo Sistemático" 
                        : "Systematic Curriculum"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === "ja" 
                        ? "引き・制圧・絞め・パスで学ぶ" 
                        : language === "pt" 
                        ? "Aprenda sistematicamente" 
                        : "Learn systematically"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20 hover:border-secondary/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-secondary/5">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="p-3 rounded-xl bg-secondary/10">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10 text-secondary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">
                      {language === "ja" 
                        ? "グローバルコミュニティ" 
                        : language === "pt" 
                        ? "Comunidade Global" 
                        : "Global Community"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === "ja" 
                        ? "世界中の仲間と繋がる" 
                        : language === "pt" 
                        ? "Conecte-se globalmente" 
                        : "Connect worldwide"}
                    </p>
                  </CardContent>
                </Card>
              </div>



              {/* Brand Footer Message */}
              <div className="text-center space-y-2 pt-4">
                <p className="text-base font-medium bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  {language === "ja" 
                    ? "JiuFlowへようこそ 🥋" 
                    : language === "pt" 
                    ? "Bem-vindo ao JiuFlow 🥋" 
                    : "Welcome to JiuFlow 🥋"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "一緒に柔術の旅を始めましょう" 
                    : language === "pt" 
                    ? "Vamos começar sua jornada no Jiu-Jitsu" 
                    : "Let's start your Jiu-Jitsu journey together"}
                </p>
              </div>
          </>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
