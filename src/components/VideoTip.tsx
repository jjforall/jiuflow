import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";

interface VideoTipProps {
  videoId: string;
}

export const VideoTip = ({ videoId }: VideoTipProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("500");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const predefinedAmounts = [100, 500, 1000, 3000, 5000];

  const handleTip = async () => {
    const tipAmount = parseInt(amount);
    
    if (!tipAmount || tipAmount < 100) {
      toast.error(
        language === "ja" 
          ? "最低金額は100円です" 
          : language === "pt" 
          ? "Valor mínimo é 100 ienes" 
          : "Minimum amount is 100 yen"
      );
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-video-tip", {
        body: {
          amount: tipAmount,
          videoId,
          message: message.trim(),
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        setIsOpen(false);
        setAmount("500");
        setMessage("");
      }
    } catch (error) {
      console.error("Error creating tip:", error);
      toast.error(
        language === "ja" 
          ? "投げ銭の処理に失敗しました" 
          : language === "pt" 
          ? "Erro ao processar gorjeta" 
          : "Failed to process tip"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Heart className="w-5 h-5 text-primary" />
          {language === "ja" ? "投げ銭" : language === "pt" ? "Gorjeta" : "Tip"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "ja" 
              ? "投げ銭で応援" 
              : language === "pt" 
              ? "Apoiar com gorjeta" 
              : "Support with a tip"}
          </DialogTitle>
          <DialogDescription>
            {language === "ja" 
              ? "この動画への応援をお願いします" 
              : language === "pt" 
              ? "Mostre seu apoio a este vídeo" 
              : "Show your support for this video"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Predefined Amounts */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === "ja" ? "金額を選択" : language === "pt" ? "Selecione o valor" : "Select amount"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {predefinedAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={amount === amt.toString() ? "default" : "outline"}
                  onClick={() => setAmount(amt.toString())}
                  className="text-sm"
                >
                  ¥{amt.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === "ja" ? "カスタム金額" : language === "pt" ? "Valor personalizado" : "Custom amount"}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">¥</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="100"
                step="100"
                placeholder="500"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "ja" 
                ? "※最低100円から" 
                : language === "pt" 
                ? "※Mínimo 100 ienes" 
                : "※Minimum 100 yen"}
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === "ja" ? "メッセージ（任意）" : language === "pt" ? "Mensagem (opcional)" : "Message (optional)"}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                language === "ja" 
                  ? "応援メッセージを入力..." 
                  : language === "pt" 
                  ? "Escreva uma mensagem de apoio..." 
                  : "Write a support message..."
              }
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/200
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleTip} 
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === "ja" ? "処理中..." : language === "pt" ? "Processando..." : "Processing..."}
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                {language === "ja" 
                  ? `¥${parseInt(amount || "0").toLocaleString()}を投げ銭` 
                  : language === "pt" 
                  ? `Enviar ¥${parseInt(amount || "0").toLocaleString()}` 
                  : `Tip ¥${parseInt(amount || "0").toLocaleString()}`}
              </>
            )}
          </Button>

          <Card className="p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground">
              {language === "ja" 
                ? "※ Stripeで安全に決済されます。再生数に応じた収益として動画投稿者に還元されます。" 
                : language === "pt" 
                ? "※ Pagamento seguro via Stripe. Será revertido ao criador do vídeo como receita." 
                : "※ Secure payment via Stripe. Will be distributed to video creator as revenue."}
            </p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};