import { CheckCircle, Award, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
                      ? "技マップですべてのテクニック動画を見ることができます" 
                      : language === "pt" 
                      ? "Você pode assistir a todos os vídeos técnicos no Mapa de Técnicas" 
                      : "You can watch all technique videos on the Technique Map"}
                  </p>

                  <Button
                    size="lg"
                    onClick={() => navigate("/map")}
                    className="w-full sm:w-auto text-lg py-6 px-8"
                  >
                    {language === "ja" 
                      ? "技マップへ移動" 
                      : language === "pt" 
                      ? "Ir para o Mapa de Técnicas" 
                      : "Go to Technique Map"}
                  </Button>
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
