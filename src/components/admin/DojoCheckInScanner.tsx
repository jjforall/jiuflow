import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Camera, CheckCircle2, XCircle, Loader2, User, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DojoCheckInScannerProps {
  dojoId: string;
}

interface MemberInfo {
  membership_id: string;
  user_id: string;
  dojo_id: string;
  status: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_name: string | null;
}

interface CheckInResult {
  success: boolean;
  memberInfo?: MemberInfo;
  error?: string;
  checkInId?: string;
}

export default function DojoCheckInScanner({ dojoId }: DojoCheckInScannerProps) {
  const queryClient = useQueryClient();
  const [manualToken, setManualToken] = useState("");
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // バーコードスキャナー対応（キーボード入力を監視）
  useEffect(() => {
    let buffer = "";
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // 入力欄にフォーカスがある場合はスキップ
      if (document.activeElement === inputRef.current) return;

      // Enterキーでスキャン完了
      if (e.key === "Enter" && buffer.length >= 16) {
        processToken(buffer);
        buffer = "";
        return;
      }

      // 英数字のみを受け付け
      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        buffer += e.key;
        
        // タイムアウトでバッファをクリア
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [dojoId]);

  const checkInMutation = useMutation({
    mutationFn: async (qrToken: string): Promise<CheckInResult> => {
      // QRトークンから会員情報を取得
      const { data: memberData, error: memberError } = await supabase
        .rpc("get_membership_by_qr_token", { p_qr_token: qrToken });

      if (memberError) throw memberError;
      if (!memberData || memberData.length === 0) {
        return { success: false, error: "会員が見つかりません" };
      }

      const member = memberData[0] as MemberInfo;

      // 道場IDの確認
      if (member.dojo_id !== dojoId) {
        return { success: false, error: "この道場の会員ではありません" };
      }

      // ステータス確認
      if (member.status !== "active") {
        return { success: false, error: "会員資格が有効ではありません", memberInfo: member };
      }

      // チェックイン記録を作成
      const { data: checkIn, error: checkInError } = await supabase
        .from("dojo_check_ins")
        .insert({
          dojo_id: dojoId,
          user_id: member.user_id,
          membership_id: member.membership_id,
          method: "qr",
        })
        .select()
        .single();

      if (checkInError) throw checkInError;

      return {
        success: true,
        memberInfo: member,
        checkInId: checkIn.id,
      };
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["dojo-check-ins", dojoId] });
      
      if (result.success) {
        toast.success("チェックイン完了", {
          description: `${result.memberInfo?.display_name || "会員"}さん、ようこそ！`,
        });
      } else {
        toast.error("チェックイン失敗", {
          description: result.error,
        });
      }
    },
    onError: (error: Error) => {
      setLastResult({ success: false, error: error.message });
      toast.error("エラーが発生しました", {
        description: error.message,
      });
    },
  });

  const processToken = async (token: string) => {
    if (isProcessing || !token.trim()) return;
    
    setIsProcessing(true);
    setLastResult(null);
    
    try {
      await checkInMutation.mutateAsync(token.trim().toLowerCase());
    } finally {
      setIsProcessing(false);
      setManualToken("");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processToken(manualToken);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QRコードチェックイン
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* スキャナー状態表示 */}
          <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
            {isProcessing ? (
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">処理中...</p>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  QRコードをスキャンしてください
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  またはバーコードリーダーでスキャン
                </p>
              </div>
            )}
          </div>

          {/* 手動入力 */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Label htmlFor="manual-token">手動入力（会員トークン）</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="manual-token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="QRトークンを入力..."
                className="font-mono"
              />
              <Button type="submit" disabled={isProcessing || !manualToken.trim()}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "チェックイン"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 結果表示 */}
      {lastResult && (
        <Card className={cn(
          "border-2",
          lastResult.success ? "border-green-500" : "border-destructive"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {lastResult.success ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}

              {lastResult.memberInfo ? (
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lastResult.memberInfo.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {lastResult.memberInfo.display_name || "会員"}
                      </h3>
                      {lastResult.memberInfo.plan_name && (
                        <Badge variant="secondary">{lastResult.memberInfo.plan_name}</Badge>
                      )}
                    </div>
                  </div>
                  
                  {lastResult.success && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(), "yyyy年M月d日 HH:mm", { locale: ja })} チェックイン
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-destructive">
                    チェックイン失敗
                  </h3>
                  <p className="text-muted-foreground">{lastResult.error}</p>
                </div>
              )}
            </div>

            {!lastResult.success && lastResult.memberInfo && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">{lastResult.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ヒント */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">使い方</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 会員のスマホに表示されたQRコードをカメラでスキャン</li>
            <li>• USBバーコードリーダーでQRコードを読み取り</li>
            <li>• 手動でトークンを入力することも可能</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
