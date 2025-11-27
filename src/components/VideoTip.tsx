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
import { Heart, Loader2, Coffee, Wine, Droplet, Pizza, Medal, Gem } from "lucide-react";
import confetti from "canvas-confetti";

interface VideoTipProps {
  videoId: string;
}

interface TipItem {
  amount: number;
  icon: React.ReactNode;
  label: { ja: string; en: string; pt: string };
}

export const VideoTip = ({ videoId }: VideoTipProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("500");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const tipItems: TipItem[] = [
    { 
      amount: 300, 
      icon: <Coffee className="w-4 h-4" />, 
      label: { ja: "コーヒー", en: "Coffee", pt: "Café" } 
    },
    { 
      amount: 500, 
      icon: <Droplet className="w-4 h-4" />, 
      label: { ja: "コーラ", en: "Cola", pt: "Cola" } 
    },
    { 
      amount: 60000, 
      icon: <Pizza className="w-4 h-4" />, 
      label: { ja: "寿司", en: "Sushi", pt: "Sushi" } 
    },
    { 
      amount: 40000, 
      icon: <Pizza className="w-4 h-4" />, 
      label: { ja: "焼肉", en: "BBQ", pt: "Churrasco" } 
    },
    { 
      amount: 30000, 
      icon: <Wine className="w-4 h-4" />, 
      label: { ja: "シャンパン", en: "Champagne", pt: "Champanhe" } 
    },
    { 
      amount: 1000000, 
      icon: <Gem className="w-4 h-4" />, 
      label: { ja: "ダイヤモンド", en: "Diamond", pt: "Diamante" } 
    },
  ];

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
        // 金額に応じたエフェクト
        if (tipAmount <= 500) {
          // コーヒー・コーラ: 小規模な紙吹雪
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#fbbf24', '#f59e0b', '#d97706']
          });
        } else if (tipAmount <= 30000) {
          // シャンパン: 中規模の紙吹雪（金色）
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#f59e0b', '#fde047']
          });
          setTimeout(() => {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          }, 200);
        } else if (tipAmount <= 40000) {
          // 焼肉: 中規模の紙吹雪（赤系）
          confetti({
            particleCount: 120,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#dc2626', '#ef4444', '#f87171', '#fca5a5']
          });
          setTimeout(() => {
            confetti({
              particleCount: 60,
              angle: 60,
              spread: 55,
              origin: { x: 0 }
            });
          }, 150);
          setTimeout(() => {
            confetti({
              particleCount: 60,
              angle: 120,
              spread: 55,
              origin: { x: 1 }
            });
          }, 150);
        } else if (tipAmount <= 60000) {
          // 寿司: 大規模な紙吹雪（赤白）
          const count = 150;
          const defaults = {
            origin: { y: 0.7 }
          };
          
          function fire(particleRatio: number, opts: any) {
            confetti({
              ...defaults,
              ...opts,
              particleCount: Math.floor(count * particleRatio),
              colors: ['#dc2626', '#ffffff', '#ef4444', '#fecaca']
            });
          }
          
          fire(0.25, { spread: 26, startVelocity: 55 });
          fire(0.2, { spread: 60 });
          fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
          fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
          fire(0.1, { spread: 120, startVelocity: 45 });
        } else if (tipAmount >= 1000000) {
          // ダイヤモンド: 超派手な紙吹雪（虹色、複数回発射）
          const duration = 3000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
          
          function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
          }
          
          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            
            if (timeLeft <= 0) {
              return clearInterval(interval);
            }
            
            const particleCount = 50 * (timeLeft / duration);
            
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
            });
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
            });
          }, 250);
          
          // 追加の大爆発エフェクト
          setTimeout(() => {
            confetti({
              particleCount: 200,
              spread: 160,
              origin: { y: 0.5 },
              colors: ['#ffd700', '#ffed4e', '#fff59d', '#ffffff']
            });
          }, 500);
        }
        
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
      <DialogContent className="sm:max-w-lg">
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
            <div className="grid grid-cols-2 gap-2">
              {tipItems.map((item) => (
                <Button
                  key={item.amount}
                  type="button"
                  variant={amount === item.amount.toString() ? "default" : "outline"}
                  onClick={() => setAmount(item.amount.toString())}
                  className="flex items-center gap-2 h-auto py-3"
                >
                  {item.icon}
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-normal">
                      {item.label[language as keyof typeof item.label]}
                    </span>
                    <span className="font-semibold">
                      ¥{item.amount.toLocaleString()}
                    </span>
                  </div>
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