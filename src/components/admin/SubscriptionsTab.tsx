import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "エラー",
          description: "認証が必要です",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("list-subscriptions", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast({
        title: "エラー",
        description: "サブスクリプション情報の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        合計: {subscriptions.length}件のサブスクリプション
      </div>
    </div>
  );
};
