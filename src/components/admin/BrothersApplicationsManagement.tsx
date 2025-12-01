import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Award, CheckCircle, XCircle } from "lucide-react";

export function BrothersApplicationsManagement() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("brothers_applications")
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            email
          )
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("申請取得エラー:", error);
      toast.error("申請の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("この申請を承認しますか？")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未認証");

      const { error } = await supabase
        .from("brothers_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("申請を承認しました");
      fetchApplications();
    } catch (error) {
      console.error("承認エラー:", error);
      toast.error("申請の承認に失敗しました");
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast.error("却下理由を入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未認証");

      const { error } = await supabase.rpc("reject_brothers_application", {
        application_id: selectedApp.id,
        reason: rejectionReason,
      });

      if (error) throw error;
      toast.success("申請を却下しました");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error("却下エラー:", error);
      toast.error("申請の却下に失敗しました");
    }
  };

  const openRejectDialog = (app: any) => {
    setSelectedApp(app);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "審査中", variant: "secondary" },
      approved: { label: "承認済", variant: "default" },
      rejected: { label: "却下", variant: "destructive" },
      renewal_pending: { label: "更新審査中", variant: "secondary" },
      renewal_approved: { label: "更新承認済", variant: "default" },
      renewal_rejected: { label: "更新却下", variant: "destructive" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Brothers申請管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請者</TableHead>
                <TableHead>申請年度</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>申請日</TableHead>
                <TableHead>審査日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <div>{app.profiles?.display_name || app.profiles?.username || "不明"}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.profiles?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{app.application_year}年</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {format(new Date(app.submitted_at), "yyyy/MM/dd", {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>
                    {app.reviewed_at
                      ? format(new Date(app.reviewed_at), "yyyy/MM/dd", {
                          locale: ja,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {(app.status === "pending" || app.status === "renewal_pending") && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          承認
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openRejectDialog(app)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          却下
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申請の却下</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">却下理由</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="却下理由を入力してください"
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setSelectedApp(null);
                }}
              >
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                却下する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
