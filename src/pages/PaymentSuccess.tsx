import { CheckCircle, Mail, Loader2, Award, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    window.scrollTo(0, 0);

    const sendMagicLink = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "check-payment-and-send-magic-link",
          {
            body: { sessionId },
          }
        );

        if (error) throw error;

        if (data?.email) {
          setEmail(data.email);
        }
        
        toast.success(data?.message || "ログインリンクを送信しました");
      } catch (error: any) {
        console.error("Error sending magic link:", error);
        toast.error(error.message || "エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    sendMagicLink();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-4xl w-full space-y-8 animate-fade-up">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {language === "ja" 
                  ? "処理中..." 
                  : language === "pt" 
                  ? "Processando..." 
                  : "Processing..."}
              </p>
            </div>
          ) : (
            <>
              {/* Brand Header */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                    <CheckCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-primary" />
                  </div>
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  jiufight
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  {language === "ja" 
                    ? "ブラジリアン柔術学習プラットフォーム" 
                    : language === "pt" 
                    ? "Plataforma de Aprendizado de Jiu-Jitsu Brasileiro" 
                    : "Brazilian Jiu-Jitsu Learning Platform"}
                </p>
              </div>

              {/* Success Message */}
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardContent className="p-6 sm:p-8 text-center space-y-6">
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    {language === "ja" 
                      ? "決済が完了しました！" 
                      : language === "pt" 
                      ? "Pagamento Concluído!" 
                      : "Payment Complete!"}
                  </h2>
                  
                  <div className="flex items-center justify-center gap-3 text-base sm:text-lg text-muted-foreground">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                    <p>
                      {language === "ja" 
                        ? "メールを確認してログインしてください" 
                        : language === "pt" 
                        ? "Verifique seu e-mail para fazer login" 
                        : "Check your email to log in"}
                    </p>
                  </div>

                  <div className="border border-border/50 bg-muted/30 rounded-lg p-4 sm:p-6 space-y-3">
                    <p className="text-sm sm:text-base">
                      {email ? (
                        <>
                          {language === "ja" 
                            ? <><strong className="text-primary">{email}</strong> にログイン用のマジックリンクを送信しました。</> 
                            : language === "pt" 
                            ? <>Enviamos um link mágico para <strong className="text-primary">{email}</strong>.</> 
                            : <>We've sent a magic link to <strong className="text-primary">{email}</strong>.</>}
                        </>
                      ) : (
                        <>
                          {language === "ja" 
                            ? "ログイン用のマジックリンクを送信しました。" 
                            : language === "pt" 
                            ? "Enviamos um link mágico para seu e-mail." 
                            : "We've sent a magic link to your email."}
                        </>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === "ja" 
                        ? "メール内のリンクをクリックするだけでログインできます。" 
                        : language === "pt" 
                        ? "Basta clicar no link no e-mail para fazer login." 
                        : "Simply click the link in the email to log in."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
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

                <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <Award className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
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

                <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
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

              {/* Instructions */}
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-center">
                    {language === "ja" 
                      ? "次のステップ" 
                      : language === "pt" 
                      ? "Próximos Passos" 
                      : "Next Steps"}
                  </h2>
                  <ol className="space-y-3 text-sm sm:text-base">
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        1
                      </span>
                      <span>
                        {language === "ja" 
                          ? "メールボックスを確認してください" 
                          : language === "pt" 
                          ? "Verifique sua caixa de entrada" 
                          : "Check your email inbox"}
                      </span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        2
                      </span>
                      <span>
                        {language === "ja" 
                          ? "「ログインする」というメールを開いてください" 
                          : language === "pt" 
                          ? "Abra o e-mail 'Fazer login'" 
                          : "Open the 'Log in' email from jiufight"}
                      </span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        3
                      </span>
                      <span>
                        {language === "ja" 
                          ? "メール内のリンクをクリックしてログインし、学習を始めましょう！" 
                          : language === "pt" 
                          ? "Clique no link no e-mail e comece a aprender!" 
                          : "Click the link in the email and start learning!"}
                      </span>
                    </li>
                  </ol>
                  
                  <p className="text-xs text-center text-muted-foreground pt-4">
                    {language === "ja" 
                      ? "メールが届かない場合は、迷惑メールフォルダもご確認ください。" 
                      : language === "pt" 
                      ? "Se não receber o e-mail, verifique sua pasta de spam." 
                      : "If you don't receive the email, please check your spam folder."}
                  </p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/")}
                  className="w-full sm:w-auto"
                >
                  {language === "ja" 
                    ? "ホームに戻る" 
                    : language === "pt" 
                    ? "Voltar ao Início" 
                    : "Back to Home"}
                </Button>
                <Button
                  size="lg"
                  onClick={() => window.open("https://mail.google.com", "_blank")}
                  className="w-full sm:w-auto"
                >
                  {language === "ja" 
                    ? "メールを確認" 
                    : language === "pt" 
                    ? "Verificar E-mail" 
                    : "Check Email"}
                </Button>
              </div>

              {/* Brand Footer Message */}
              <p className="text-center text-sm text-muted-foreground pt-4">
                {language === "ja" 
                  ? "jiufightへようこそ。一緒に柔術の旅を始めましょう！🥋" 
                  : language === "pt" 
                  ? "Bem-vindo ao jiufight. Vamos começar sua jornada no Jiu-Jitsu! 🥋" 
                  : "Welcome to jiufight. Let's start your Jiu-Jitsu journey! 🥋"}
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
