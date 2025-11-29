import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscription {
  id: string;
  customer_email: string;
  customer_name: string;
  customer_id: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  product_name: string;
  current_period_start: string;
  current_period_end: string;
  created: string;
}

export const SubscriptionsTab = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [isRefunding, setIsRefunding] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("list-subscriptions");

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      setSubscriptions(data?.subscriptions || []);
      toast.success(`${data?.subscriptions?.length || 0}件のサブスクリプションを読み込みました`);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      const errorMessage = error instanceof Error ? error.message : "サブスクリプション情報の取得に失敗しました";
      toast.error("エラー", {
        description: errorMessage,
      });
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCancelClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowCancelDialog(true);
  };

  const handleRefundClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setRefundAmount("");
    setRefundReason("");
    setShowRefundDialog(true);
  };

  const handleRefundConfirm = async () => {
    if (!selectedSubscription) return;

    try {
      setIsRefunding(true);

      // Convert amount to cents (minor currency units)
      const amountInCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;

      const { data, error } = await supabase.functions.invoke("create-refund", {
        body: { 
          subscriptionId: selectedSubscription.id,
          amount: amountInCents,
          reason: refundReason || undefined
        }
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      toast.success("返金処理が完了しました", {
        description: data.refund 
          ? `${formatCurrency(data.refund.amount, data.refund.currency)}を返金しました`
          : "返金が完了しました"
      });
      setShowRefundDialog(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error("Error processing refund:", error);
      const errorMessage = error instanceof Error ? error.message : "返金処理に失敗しました";
      toast.error("エラー", {
        description: errorMessage,
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;

    try {
      setCancelingId(selectedSubscription.id);
      
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscriptionId: selectedSubscription.id }
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      toast.success("サブスクリプションをキャンセルしました");
      setShowCancelDialog(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      const errorMessage = error instanceof Error ? error.message : "キャンセルに失敗しました";
      toast.error("エラー", {
        description: errorMessage,
      });
    } finally {
      setCancelingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "有効", variant: "default" },
      past_due: { label: "支払遅延", variant: "destructive" },
      canceled: { label: "解約済み", variant: "secondary" },
      incomplete: { label: "未完了", variant: "outline" },
      trialing: { label: "トライアル中", variant: "outline" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">サブスクリプション管理</h2>
        <Button onClick={fetchSubscriptions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          サブスクリプションがありません
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>次回請求日</TableHead>
                <TableHead>開始日</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sub.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{sub.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{sub.product_name}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sub.amount, sub.currency)}
                    <span className="text-xs text-muted-foreground">/{sub.interval === 'month' ? '月' : '年'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(sub.current_period_start)} ～ {formatDate(sub.current_period_end)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(sub.current_period_end)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(sub.created)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {(sub.status === 'active' || sub.status === 'canceled') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefundClick(sub)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          返金
                        </Button>
                      )}
                      {sub.status === 'active' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelClick(sub)}
                          disabled={cancelingId === sub.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {cancelingId === sub.id ? 'キャンセル中...' : 'キャンセル'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        合計: {subscriptions.length}件のサブスクリプション
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>サブスクリプションをキャンセル</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSubscription && (
                <>
                  <div className="mt-2">
                    <p className="font-medium">{selectedSubscription.customer_name} ({selectedSubscription.customer_email})</p>
                    <p className="text-sm mt-1">プラン: {selectedSubscription.product_name}</p>
                    <p className="text-sm">金額: {formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}/{selectedSubscription.interval === 'month' ? '月' : '年'}</p>
                  </div>
                  <p className="mt-4">
                    このサブスクリプションをキャンセルしてもよろしいですか？この操作は取り消せません。
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              キャンセル実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>返金処理</DialogTitle>
            <DialogDescription>
              {selectedSubscription && (
                <>
                  <div className="mt-2">
                    <p className="font-medium">{selectedSubscription.customer_name} ({selectedSubscription.customer_email})</p>
                    <p className="text-sm mt-1">プラン: {selectedSubscription.product_name}</p>
                    <p className="text-sm">金額: {formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}/{selectedSubscription.interval === 'month' ? '月' : '年'}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">返金額（円）</Label>
              <Input
                id="refund-amount"
                type="number"
                placeholder="例: 980 (空欄で全額返金)"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                disabled={isRefunding}
              />
              <p className="text-xs text-muted-foreground">
                空欄の場合は全額返金されます
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-reason">返金理由</Label>
              <Select value={refundReason} onValueChange={setRefundReason} disabled={isRefunding}>
                <SelectTrigger>
                  <SelectValue placeholder="返金理由を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duplicate">重複請求</SelectItem>
                  <SelectItem value="fraudulent">不正利用</SelectItem>
                  <SelectItem value="requested_by_customer">顧客からの要望</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)} disabled={isRefunding}>
              キャンセル
            </Button>
            <Button onClick={handleRefundConfirm} disabled={isRefunding}>
              {isRefunding ? "処理中..." : "返金実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
