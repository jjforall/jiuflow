import { AlertCircle, Home, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

const PaymentError = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-destructive/5">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-4xl w-full space-y-8 animate-fade-up">
          {/* Brand Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full animate-pulse" />
                <AlertCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-destructive" />
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

          {/* Error Message */}
          <Card className="border-2 border-destructive/30 shadow-xl bg-gradient-to-br from-card via-card to-destructive/5">
            <CardContent className="p-6 sm:p-8 text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-destructive">
                {language === "ja" 
                  ? "決済処理中にエラーが発生しました" 
                  : language === "pt" 
                  ? "Erro no Processamento do Pagamento" 
                  : "Payment Processing Error"}
              </h2>
              
              <p className="text-base sm:text-lg text-muted-foreground">
                {language === "ja" 
                  ? "申し訳ございません。決済処理中に問題が発生しました。" 
                  : language === "pt" 
                  ? "Desculpe, ocorreu um problema ao processar seu pagamento." 
                  : "We're sorry, but there was a problem processing your payment."}
              </p>

              {errorMessage && (
                <div className="border-2 border-destructive/20 bg-destructive/10 rounded-xl p-4 sm:p-6">
                  <p className="text-sm sm:text-base text-destructive font-medium">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="border-2 border-primary/20 bg-gradient-to-br from-muted/50 to-primary/5 rounded-xl p-4 sm:p-6 space-y-3">
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "🔧 以下をお試しください" 
                    : language === "pt" 
                    ? "🔧 Tente o seguinte" 
                    : "🔧 Please try the following"}
                </h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {language === "ja" 
                        ? "カード情報が正しいことを確認してください" 
                        : language === "pt" 
                        ? "Verifique se as informações do cartão estão corretas" 
                        : "Verify your card information is correct"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {language === "ja" 
                        ? "カードに十分な残高があることを確認してください" 
                        : language === "pt" 
                        ? "Certifique-se de ter saldo suficiente no cartão" 
                        : "Ensure you have sufficient balance"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {language === "ja" 
                        ? "別の支払い方法をお試しください" 
                        : language === "pt" 
                        ? "Tente um método de pagamento diferente" 
                        : "Try a different payment method"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {language === "ja" 
                        ? "問題が続く場合は、サポートにお問い合わせください" 
                        : language === "pt" 
                        ? "Entre em contato com o suporte se o problema persistir" 
                        : "Contact support if the problem persists"}
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Help Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-primary/5">
              <CardContent className="p-4 sm:p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "再試行" 
                    : language === "pt" 
                    ? "Tentar Novamente" 
                    : "Try Again"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "もう一度お試しいただけます" 
                    : language === "pt" 
                    ? "Você pode tentar novamente" 
                    : "You can try again"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-accent/5">
              <CardContent className="p-4 sm:p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "サポートに連絡" 
                    : language === "pt" 
                    ? "Contatar Suporte" 
                    : "Contact Support"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "お困りの際はお気軽にどうぞ" 
                    : language === "pt" 
                    ? "Estamos aqui para ajudar" 
                    : "We're here to help"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 hover:border-secondary/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-secondary/5">
              <CardContent className="p-4 sm:p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-secondary/10">
                    <Home className="w-8 h-8 sm:w-10 sm:h-10 text-secondary" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "ホームに戻る" 
                    : language === "pt" 
                    ? "Voltar ao Início" 
                    : "Back to Home"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "また後でお試しください" 
                    : language === "pt" 
                    ? "Tente novamente mais tarde" 
                    : "Try again later"}
                </p>
              </CardContent>
            </Card>
          </div>

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
              onClick={() => navigate("/join")}
              className="w-full sm:w-auto"
            >
              {language === "ja" 
                ? "再度試す" 
                : language === "pt" 
                ? "Tentar Novamente" 
                : "Try Again"}
            </Button>
          </div>

          {/* Brand Footer Message */}
          <div className="text-center space-y-2 pt-4">
            <p className="text-base font-medium bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              {language === "ja" 
                ? "サポートが必要ですか？ 🥋" 
                : language === "pt" 
                ? "Precisa de ajuda? 🥋" 
                : "Need help? 🥋"}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === "ja" 
                ? "お気軽にお問い合わせください" 
                : language === "pt" 
                ? "Entre em contato conosco" 
                : "Feel free to contact us"}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentError;
