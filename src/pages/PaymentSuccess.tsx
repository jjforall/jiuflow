import { CheckCircle, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-2xl w-full text-center space-y-8 animate-fade-up">
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
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  <CheckCircle className="relative w-24 h-24 text-primary" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-light">
                {language === "ja" 
                  ? "決済が完了しました！" 
                  : language === "pt" 
                  ? "Pagamento concluído!" 
                  : "Payment Complete!"}
              </h1>

              {/* Message */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-xl text-muted-foreground">
                  <Mail className="w-6 h-6" />
                  <p>
                    {language === "ja" 
                      ? "メールを確認してログインしてください" 
                      : language === "pt" 
                      ? "Verifique seu e-mail para fazer login" 
                      : "Check your email to log in"}
                  </p>
                </div>

                <div className="border border-border p-6 space-y-3">
                  <p className="font-light">
                    {email ? (
                      <>
                        {language === "ja" 
                          ? <><strong>{email}</strong> にログイン用のマジックリンクをメールで送信しました。</> 
                          : language === "pt" 
                          ? <>Enviamos um link mágico para <strong>{email}</strong>.</> 
                          : <>We've sent a magic link to <strong>{email}</strong>.</>}
                      </>
                    ) : (
                      <>
                        {language === "ja" 
                          ? "ログイン用のマジックリンクをメールで送信しました。" 
                          : language === "pt" 
                          ? "Enviamos um link mágico para seu e-mail." 
                          : "We've sent a magic link to your email."}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ja" 
                      ? "メール内のリンクをクリックするだけでログインできます。" 
                      : language === "pt" 
                      ? "Basta clicar no link no e-mail para fazer login." 
                      : "Simply click the link in the email to log in."}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4 pt-8">
                <h2 className="text-xl font-light">
                  {language === "ja" 
                    ? "次のステップ" 
                    : language === "pt" 
                    ? "Próximos passos" 
                    : "Next Steps"}
                </h2>
                <ol className="text-left max-w-md mx-auto space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      {language === "ja" 
                        ? "メールボックスを確認してください" 
                        : language === "pt" 
                        ? "Verifique sua caixa de entrada" 
                        : "Check your email inbox"}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      {language === "ja" 
                        ? "「ログインする」というメールを開いてください" 
                        : language === "pt" 
                        ? "Abra o e-mail 'Fazer login'" 
                        : "Open the 'Log in' email"}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      {language === "ja" 
                        ? "メール内のリンクをクリックしてログイン" 
                        : language === "pt" 
                        ? "Clique no link no e-mail para fazer login" 
                        : "Click the link in the email to log in"}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Note */}
              <div className="pt-4">
                <p className="text-xs text-muted-foreground">
                  {language === "ja" 
                    ? "メールが届かない場合は、迷惑メールフォルダもご確認ください。" 
                    : language === "pt" 
                    ? "Se não receber o e-mail, verifique sua pasta de spam." 
                    : "If you don't receive the email, please check your spam folder."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/")}
                >
                  {language === "ja" 
                    ? "ホームに戻る" 
                    : language === "pt" 
                    ? "Voltar ao início" 
                    : "Back to Home"}
                </Button>
                <Button
                  size="lg"
                  onClick={() => window.open("https://mail.google.com", "_blank")}
                >
                  {language === "ja" 
                    ? "メールを確認" 
                    : language === "pt" 
                    ? "Verificar e-mail" 
                    : "Check Email"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
