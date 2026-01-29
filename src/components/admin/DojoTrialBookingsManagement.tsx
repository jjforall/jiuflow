import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Mail, Phone, Calendar, MessageSquare, Check, X, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DojoTrialBookingsManagementProps {
  dojoId: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed";

interface TrialBooking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  experience_level: string | null;
  message: string | null;
  status: string;
  staff_notes: string | null;
  created_at: string;
  schedule_id: string | null;
  dojo_class_schedules?: {
    start_time: string;
    dojo_classes: {
      name: string;
      name_ja: string | null;
    };
  } | null;
}

export default function DojoTrialBookingsManagement({ dojoId }: DojoTrialBookingsManagementProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBooking, setSelectedBooking] = useState<TrialBooking | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["dojo-trial-bookings", dojoId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("dojo_trial_bookings")
        .select(`
          *,
          dojo_class_schedules (
            start_time,
            dojo_classes (
              name,
              name_ja
            )
          )
        `)
        .eq("dojo_id", dojoId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrialBooking[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, notes }: { bookingId: string; status: string; notes?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (notes !== undefined) {
        updateData.staff_notes = notes;
      }
      const { error } = await supabase
        .from("dojo_trial_bookings")
        .update(updateData)
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-trial-bookings", dojoId] });
      setSelectedBooking(null);
      toast.success("ステータスを更新しました");
    },
    onError: () => {
      toast.error("更新に失敗しました");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">申請中</Badge>;
      case "confirmed":
        return <Badge variant="default" className="bg-blue-500">確認済み</Badge>;
      case "cancelled":
        return <Badge variant="outline">キャンセル</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExperienceLabel = (level: string | null) => {
    switch (level) {
      case "none": return "なし";
      case "beginner": return "初心者（1年未満）";
      case "intermediate": return "中級者（1-3年）";
      case "advanced": return "上級者（3年以上）";
      default: return level || "未回答";
    }
  };

  const handleOpenDetails = (booking: TrialBooking) => {
    setSelectedBooking(booking);
    setStaffNotes(booking.staff_notes || "");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pending">申請中</SelectItem>
            <SelectItem value="confirmed">確認済み</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {bookings?.length || 0}件の体験予約
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {bookings?.filter(b => b.status === "pending").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">申請中</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {bookings?.filter(b => b.status === "confirmed").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">確認済み</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {bookings?.filter(b => b.status === "completed").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">完了</div>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">
            {bookings?.filter(b => b.status === "cancelled").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">キャンセル</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申請日</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>希望日</TableHead>
              <TableHead>経験</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  体験予約がありません
                </TableCell>
              </TableRow>
            ) : (
              bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {format(new Date(booking.created_at), "M/d", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {booking.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(booking.preferred_date), "M/d (E)", { locale: ja })}
                      {booking.preferred_time && (
                        <span className="text-muted-foreground ml-1">
                          {booking.preferred_time}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{getExperienceLabel(booking.experience_level)}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(booking)}>
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>体験予約詳細</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedBooking.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${selectedBooking.email}`} className="text-primary hover:underline">
                    {selectedBooking.email}
                  </a>
                </div>
                {selectedBooking.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedBooking.phone}`} className="text-primary hover:underline">
                      {selectedBooking.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedBooking.preferred_date), "yyyy年M月d日 (E)", { locale: ja })}
                    {selectedBooking.preferred_time && ` ${selectedBooking.preferred_time}`}
                  </span>
                </div>
                {selectedBooking.dojo_class_schedules && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedBooking.dojo_class_schedules.dojo_classes.name_ja || 
                       selectedBooking.dojo_class_schedules.dojo_classes.name}
                      （{selectedBooking.dojo_class_schedules.start_time.slice(0, 5)}〜）
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">経験レベル</div>
                <div className="text-sm">{getExperienceLabel(selectedBooking.experience_level)}</div>
              </div>

              {selectedBooking.message && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    メッセージ
                  </div>
                  <div className="text-sm bg-muted p-3 rounded-lg">{selectedBooking.message}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">スタッフメモ</div>
                <Textarea 
                  value={staffNotes} 
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="内部メモを入力..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">ステータス:</div>
                {getStatusBadge(selectedBooking.status)}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedBooking?.status === "pending" && (
              <>
                <Button
                  onClick={() => updateStatusMutation.mutate({ 
                    bookingId: selectedBooking.id, 
                    status: "confirmed",
                    notes: staffNotes 
                  })}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Check className="h-4 w-4 mr-2" />
                  確認済みにする
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ 
                    bookingId: selectedBooking.id, 
                    status: "cancelled",
                    notes: staffNotes 
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  キャンセル
                </Button>
              </>
            )}
            {selectedBooking?.status === "confirmed" && (
              <Button
                onClick={() => updateStatusMutation.mutate({ 
                  bookingId: selectedBooking.id, 
                  status: "completed",
                  notes: staffNotes 
                })}
                className="bg-green-500 hover:bg-green-600"
              >
                <Check className="h-4 w-4 mr-2" />
                完了にする
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                if (staffNotes !== selectedBooking?.staff_notes) {
                  updateStatusMutation.mutate({
                    bookingId: selectedBooking!.id,
                    status: selectedBooking!.status,
                    notes: staffNotes,
                  });
                } else {
                  setSelectedBooking(null);
                }
              }}
            >
              {staffNotes !== selectedBooking?.staff_notes ? "メモを保存" : "閉じる"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
