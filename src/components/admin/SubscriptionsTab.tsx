import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, X } from "lucide-react";
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
    </div>
  );
};
