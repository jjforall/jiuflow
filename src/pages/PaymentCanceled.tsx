import { XCircle, Home, CreditCard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

const PaymentCanceled = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
    // GA4: Track payment cancellation
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'payment_canceled', {
        page_location: window.location.href,
      });
    }
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
                <XCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-destructive" />
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

          {/* Canceled Message */}
          <Card className="border-2 border-destructive/30 shadow-xl bg-gradient-to-br from-card via-card to-destructive/5">
            <CardContent className="p-6 sm:p-8 text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-destructive">
                {language === "ja" 
                  ? "決済がキャンセルされました" 
                  : language === "pt" 
                  ? "Pagamento Cancelado" 
                  : "Payment Canceled"}
              </h2>
              
              <p className="text-base sm:text-lg text-muted-foreground">
                {language === "ja" 
                  ? "決済処理がキャンセルされました。お支払いは完了していません。" 
                  : language === "pt" 
                  ? "O processo de pagamento foi cancelado. Nenhum pagamento foi processado." 
                  : "The payment process was canceled. No payment was processed."}
              </p>

              <div className="border-2 border-primary/20 bg-gradient-to-br from-muted/50 to-primary/5 rounded-xl p-4 sm:p-6 space-y-3">
                <p className="text-sm sm:text-base font-medium">
                  {language === "ja" 
                    ? "💡 いつでも再度お試しいただけます" 
                    : language === "pt" 
                    ? "💡 Você pode tentar novamente a qualquer momento" 
                    : "💡 You can try again anytime"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "準備ができたら、プラン選択ページから再度お申し込みください。" 
                    : language === "pt" 
                    ? "Quando estiver pronto, retorne à página de planos para se inscrever novamente." 
                    : "When you're ready, return to the plans page to sign up again."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Help Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-primary/5">
              <CardContent className="p-4 sm:p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "複数の支払い方法" 
                    : language === "pt" 
                    ? "Métodos de Pagamento" 
                    : "Multiple Payment Methods"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "クレジットカード、デビットカードなど" 
                    : language === "pt" 
                    ? "Cartão de crédito, débito e mais" 
                    : "Credit card, debit card, and more"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-card to-accent/5">
              <CardContent className="p-4 sm:p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {language === "ja" 
                    ? "サポート" 
                    : language === "pt" 
                    ? "Suporte" 
                    : "Support"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "ご不明な点はお問い合わせください" 
                    : language === "pt" 
                    ? "Entre em contato para dúvidas" 
                    : "Contact us for any questions"}
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
                    ? "安全な決済" 
                    : language === "pt" 
                    ? "Pagamento Seguro" 
                    : "Secure Payment"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === "ja" 
                    ? "Stripeによる安全な決済処理" 
                    : language === "pt" 
                    ? "Processamento seguro via Stripe" 
                    : "Secure processing via Stripe"}
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
                ? "プラン選択に戻る" 
                : language === "pt" 
                ? "Voltar aos Planos" 
                : "Back to Plans"}
            </Button>
          </div>

          {/* Brand Footer Message */}
          <div className="text-center space-y-2 pt-4">
            <p className="text-base font-medium bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              {language === "ja" 
                ? "いつでもお待ちしています 🥋" 
                : language === "pt" 
                ? "Estamos sempre aqui 🥋" 
                : "We're always here 🥋"}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === "ja" 
                ? "準備ができたら、またお越しください" 
                : language === "pt" 
                ? "Volte quando estiver pronto" 
                : "Come back when you're ready"}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentCanceled;
