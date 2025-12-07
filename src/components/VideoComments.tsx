import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageSquare, Trash2, Coffee, Wine, Droplet, Pizza, Medal, Gem, Heart, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja, ptBR } from "date-fns/locale";
import confetti from "canvas-confetti";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_email?: string;
  tip_amount?: number;
}

interface VideoCommentsProps {
  videoId: string;
  userId: string;
}

interface TipItem {
  amount: number;
  icon: React.ReactNode;
  label: { ja: string; en: string; pt: string };
}

const tipItems: TipItem[] = [
  { 
    amount: 0, 
    icon: <Medal className="w-4 h-4" />, 
    label: { ja: "金メダル", en: "Gold Medal", pt: "Medalha de Ouro" } 
  },
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
    amount: 30000, 
    icon: <Wine className="w-4 h-4" />, 
    label: { ja: "シャンパン", en: "Champagne", pt: "Champanhe" } 
  },
  { 
    amount: 40000, 
    icon: <Pizza className="w-4 h-4" />, 
    label: { ja: "焼肉", en: "BBQ", pt: "Churrasco" } 
  },
  { 
    amount: 60000, 
    icon: <Pizza className="w-4 h-4" />, 
    label: { ja: "寿司", en: "Sushi", pt: "Sushi" } 
  },
  { 
    amount: 100000, 
    icon: <Gem className="w-4 h-4" />, 
    label: { ja: "ダイヤモンド", en: "Diamond", pt: "Diamante" } 
  },
];

export const VideoComments = ({ videoId, userId }: VideoCommentsProps) => {
  const { language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(0);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("video_comments")
        .select("id, user_id, comment, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Get tips for this video to match with comments
      const { data: tipsData } = await supabase
        .from("video_tips")
        .select("from_user_id, amount, message, created_at")
        .eq("video_id", videoId);

      // Get user emails separately
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

        const commentsWithEmails = commentsData.map(comment => {
          // Find matching tip by user_id and message content
          const matchingTip = tipsData?.find(tip => 
            tip.from_user_id === comment.user_id && 
            tip.message === comment.comment
          );
          
          return {
            ...comment,
            user_email: profilesMap.get(comment.user_id) || null,
            tip_amount: matchingTip?.amount || undefined
          };
        });

        setComments(commentsWithEmails);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // 金額に応じたエフェクト
      const triggerTipEffect = (amount: number) => {
        if (amount === 0) {
          // 金メダル: 少なめの紙吹雪
          const funnyMessages = {
            ja: [
              "お、ただコメ勢！勇気あるねぇ〜😎",
              "無料は最高のプライス！🎉",
              "気持ちだけいただきました！💪",
              "タダより高いものはない...ってか！😂",
              "投げ銭0円！潔い！👏"
            ],
            en: [
              "Free comment warrior! Respect! 😎",
              "Free is the best price! 🎉",
              "We got your spirit! 💪",
              "Bold move! 😂",
              "Zero tip! Brave! 👏"
            ],
            pt: [
              "Guerreiro dos comentários grátis! 😎",
              "Grátis é o melhor preço! 🎉",
              "Recebemos seu espírito! 💪",
              "Movimento ousado! 😂",
              "Gorjeta zero! Corajoso! 👏"
            ]
          };
          
          const messages = funnyMessages[language as keyof typeof funnyMessages];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          
          confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#94a3b8', '#cbd5e1', '#e2e8f0']
          });
          
          toast.success(randomMessage, { duration: 3000 });
        } else if (amount <= 500) {
          // コーヒー・コーラ: 小規模な紙吹雪
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#fbbf24', '#f59e0b', '#d97706']
          });
        } else if (amount <= 30000) {
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
        } else if (amount <= 40000) {
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
        } else if (amount <= 60000) {
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
        } else if (amount >= 100000) {
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
      };

      // コメント投稿
      const { error: commentError } = await supabase
        .from("video_comments")
        .insert({
          user_id: userId,
          video_id: videoId,
          comment: newComment.trim(),
        });

      if (commentError) throw commentError;

      // エフェクト発動
      triggerTipEffect(selectedTipAmount);

      // 投げ銭処理（0円以外の場合）
      if (selectedTipAmount > 0) {
        const { data, error: tipError } = await supabase.functions.invoke("create-video-tip", {
          body: {
            amount: selectedTipAmount,
            videoId,
            message: newComment.trim(),
          },
        });

        if (tipError) throw tipError;

        if (data?.url) {
          window.open(data.url, "_blank");
          toast.success(
            language === "ja" 
              ? `コメントを投稿し、¥${selectedTipAmount.toLocaleString()}の投げ銭を送信しました！` 
              : language === "pt" 
              ? `Comentário postado e ¥${selectedTipAmount.toLocaleString()} enviado!` 
              : `Comment posted and ¥${selectedTipAmount.toLocaleString()} tip sent!`
          );
        }
      } else {
        // 0円の場合はコメント投稿のみ
        toast.success(
          language === "ja" 
            ? "コメントを投稿しました" 
            : language === "pt" 
            ? "Comentário postado" 
            : "Comment posted"
        );
      }

      setNewComment("");
      setSelectedTipAmount(0); // リセットしてデフォルトに戻す
      loadComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(
        language === "ja" 
          ? "コメントの投稿に失敗しました" 
          : language === "pt" 
          ? "Erro ao postar comentário" 
          : "Failed to post comment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("video_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      loadComments();
      toast.success(
        language === "ja" 
          ? "コメントを削除しました" 
          : language === "pt" 
          ? "Comentário excluído" 
          : "Comment deleted"
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(
        language === "ja" 
          ? "コメントの削除に失敗しました" 
          : language === "pt" 
          ? "Erro ao excluir comentário" 
          : "Failed to delete comment"
      );
    }
  };

  const getTimeAgo = (dateString: string) => {
    const locale = language === "ja" ? ja : language === "pt" ? ptBR : undefined;
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale });
  };

  const getTipIcon = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return <Medal className="w-4 h-4 text-yellow-500" />;
    
    if (amount >= 100000) return <Gem className="w-4 h-4 text-violet-500" />;
    if (amount >= 60000) return <Pizza className="w-4 h-4 text-red-500" />;
    if (amount >= 40000) return <Pizza className="w-4 h-4 text-orange-500" />;
    if (amount >= 30000) return <Wine className="w-4 h-4 text-amber-500" />;
    if (amount >= 500) return <Droplet className="w-4 h-4 text-blue-500" />;
    if (amount >= 300) return <Coffee className="w-4 h-4 text-amber-700" />;
    return <Medal className="w-4 h-4 text-yellow-500" />;
  };

  const getTipLabel = (amount: number | undefined) => {
    if (!amount) return null;
    
    const item = tipItems.find(t => t.amount === amount) || 
      (amount >= 100000 ? tipItems.find(t => t.amount === 100000) :
       amount >= 60000 ? tipItems.find(t => t.amount === 60000) :
       amount >= 40000 ? tipItems.find(t => t.amount === 40000) :
       amount >= 30000 ? tipItems.find(t => t.amount === 30000) :
       amount >= 500 ? tipItems.find(t => t.amount === 500) :
       amount >= 300 ? tipItems.find(t => t.amount === 300) :
       tipItems.find(t => t.amount === 0));
    
    return item?.label[language as keyof typeof item.label] || `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-xl font-medium">
          {language === "ja" ? "コメント" : language === "pt" ? "Comentários" : "Comments"}
          {comments.length > 0 && ` (${comments.length})`}
        </h3>
      </div>

      {/* Comment Form */}
      <Card className="p-4 space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            language === "ja" 
              ? "コメントを入力..." 
              : language === "pt" 
              ? "Escreva um comentário..." 
              : "Write a comment..."
          }
          className="min-h-[100px]"
        />
        
        {/* Tip Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <label className="text-sm font-medium">
              {language === "ja" ? "投げ銭を選択" : language === "pt" ? "Selecione gorjeta" : "Select tip"}
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tipItems.map((item) => (
              <Button
                key={item.amount}
                type="button"
                variant={selectedTipAmount === item.amount ? "default" : "outline"}
                onClick={() => setSelectedTipAmount(item.amount)}
                className="flex items-center gap-2 h-auto py-2 text-xs"
              >
                {item.icon}
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-normal leading-tight">
                    {item.label[language as keyof typeof item.label]}
                  </span>
                  <span className="font-semibold text-xs">
                    {item.amount === 0 ? "¥0" : `¥${item.amount.toLocaleString()}`}
                  </span>
                </div>
              </Button>
            ))}
          </div>
          {selectedTipAmount === 0 && (
            <p className="text-xs text-muted-foreground animate-fade-in">
              {language === "ja" 
                ? "💪 お金より気持ち派！" 
                : language === "pt" 
                ? "💪 Sentimento é mais importante que dinheiro!" 
                : "💪 Feeling over money!"}
            </p>
          )}
        </div>

        <Button 
          onClick={handleSubmitComment} 
          disabled={isSubmitting || !newComment.trim()}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {language === "ja" ? "投稿中..." : language === "pt" ? "Postando..." : "Posting..."}
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              {language === "ja" 
                ? selectedTipAmount === 0 
                  ? "コメント投稿" 
                  : `¥${selectedTipAmount.toLocaleString()}で投稿`
                : language === "pt" 
                ? selectedTipAmount === 0 
                  ? "Postar comentário" 
                  : `Postar com ¥${selectedTipAmount.toLocaleString()}`
                : selectedTipAmount === 0 
                ? "Post comment" 
                : `Post with ¥${selectedTipAmount.toLocaleString()}`}
            </>
          )}
        </Button>
        
        {selectedTipAmount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {language === "ja" 
              ? "※ 投稿後、Stripeの決済画面が開きます" 
              : language === "pt" 
              ? "※ Após postar, a tela de pagamento do Stripe será aberta" 
              : "※ Stripe payment screen will open after posting"}
          </p>
        )}
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === "ja" 
              ? "まだコメントがありません" 
              : language === "pt" 
              ? "Ainda não há comentários" 
              : "No comments yet"}
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className={`p-4 ${comment.tip_amount ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {comment.user_email?.split("@")[0] || "User"}
                    </span>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full text-xs">
                      {getTipIcon(comment.tip_amount)}
                      {comment.tip_amount && comment.tip_amount > 0 && (
                        <span className="font-medium text-primary">
                          {getTipLabel(comment.tip_amount)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
                {comment.user_id === userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};