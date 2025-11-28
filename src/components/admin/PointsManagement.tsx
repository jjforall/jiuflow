import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Coins, Plus, ArrowDownUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserPoints {
  user_id: string;
  points: number;
  email: string;
}

interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
  email?: string;
}

export const PointsManagement = () => {
  const { language } = useLanguage();
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [pointsAmount, setPointsAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users with points
      const { data: pointsData, error: pointsError } = await supabase
        .from("user_points")
        .select(`
          user_id,
          points,
          profiles!inner(email)
        `);

      if (pointsError) throw pointsError;

      const usersWithPoints = pointsData?.map((p: any) => ({
        user_id: p.user_id,
        points: p.points,
        email: p.profiles.email,
      })) || [];

      setUsers(usersWithPoints);

      // Load recent transactions
      const { data: transData, error: transError } = await supabase
        .from("point_transactions")
        .select(`
          *,
          profiles!inner(email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (transError) throw transError;

      const transWithEmail = transData?.map((t: any) => ({
        ...t,
        email: t.profiles.email,
      })) || [];

      setTransactions(transWithEmail);
    } catch (error) {
      console.error("Error loading points data:", error);
      toast.error(language === "ja" ? "データの読み込みに失敗しました" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedUserId || !pointsAmount || !description.trim()) {
      toast.error(language === "ja" ? "すべての項目を入力してください" : "Please fill all fields");
      return;
    }

    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error(language === "ja" ? "有効な金額を入力してください" : "Please enter a valid amount");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === "ja" ? "認証が必要です" : "Authentication required");
        return;
      }

      const { error } = await supabase.functions.invoke("award-points", {
        body: {
          userId: selectedUserId,
          amount,
          description: description.trim(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(
        language === "ja" 
          ? `${amount}ポイントを付与しました` 
          : `Awarded ${amount} points`
      );

      setDialogOpen(false);
      setSelectedUserId("");
      setPointsAmount("");
      setDescription("");
      loadData();
    } catch (error) {
      console.error("Error awarding points:", error);
      toast.error(language === "ja" ? "ポイント付与に失敗しました" : "Failed to award points");
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      referral_bonus: { 
        label: language === "ja" ? "紹介ボーナス" : "Referral", 
        variant: "default" 
      },
      monthly_referral_bonus: { 
        label: language === "ja" ? "月次紹介" : "Monthly", 
        variant: "default" 
      },
      manual_award: { 
        label: language === "ja" ? "手動付与" : "Manual", 
        variant: "secondary" 
      },
      manual_deduction: { 
        label: language === "ja" ? "手動減算" : "Deduction", 
        variant: "destructive" 
      },
    };

    const config = types[type] || { label: type, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted/50 animate-pulse rounded" />
        <div className="h-64 bg-muted/50 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Award Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6" />
          <h2 className="text-2xl font-light">
            {language === "ja" ? "ポイント管理" : "Points Management"}
          </h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {language === "ja" ? "ポイント付与" : "Award Points"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "ja" ? "ポイントを付与" : "Award Points"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === "ja" ? "ユーザー" : "User"}</Label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background"
                >
                  <option value="">
                    {language === "ja" ? "選択してください" : "Select user"}
                  </option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email} ({user.points}pt)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ja" ? "ポイント数" : "Amount"}</Label>
                <Input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder={language === "ja" ? "正の数: 付与、負の数: 減算" : "Positive: award, Negative: deduct"}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ja" ? "理由" : "Description"}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={language === "ja" ? "付与理由を入力" : "Enter reason"}
                  rows={3}
                />
              </div>
              <Button onClick={handleAwardPoints} className="w-full">
                {language === "ja" ? "付与する" : "Award"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Points Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-light">
            {language === "ja" ? "ユーザー別ポイント" : "User Points"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "ja" ? "メールアドレス" : "Email"}</TableHead>
                <TableHead className="text-right">{language === "ja" ? "ポイント" : "Points"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right font-mono">
                    {user.points.toLocaleString()}pt
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    {language === "ja" ? "データがありません" : "No data"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            <CardTitle className="font-light">
              {language === "ja" ? "取引履歴" : "Transaction History"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "ja" ? "日時" : "Date"}</TableHead>
                <TableHead>{language === "ja" ? "ユーザー" : "User"}</TableHead>
                <TableHead>{language === "ja" ? "種類" : "Type"}</TableHead>
                <TableHead className="text-right">{language === "ja" ? "金額" : "Amount"}</TableHead>
                <TableHead>{language === "ja" ? "詳細" : "Description"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((trans) => (
                <TableRow key={trans.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(trans.created_at).toLocaleString(language === "ja" ? "ja-JP" : "en-US")}
                  </TableCell>
                  <TableCell className="text-sm">{trans.email}</TableCell>
                  <TableCell>{getTransactionTypeBadge(trans.transaction_type)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={trans.amount > 0 ? "text-green-600" : "text-red-600"}>
                      {trans.amount > 0 ? "+" : ""}{trans.amount.toLocaleString()}pt
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {trans.description}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {language === "ja" ? "履歴がありません" : "No history"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
