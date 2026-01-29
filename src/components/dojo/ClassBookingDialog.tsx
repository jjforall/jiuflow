import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, Users, User, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ClassSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  room_name: string | null;
  dojo_classes: {
    id: string;
    name: string;
    name_ja: string | null;
    class_type: string;
    level: string | null;
    color: string | null;
    duration_minutes: number;
    instructor_name: string | null;
  };
}

interface ClassBookingDialogProps {
  schedule: ClassSchedule;
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const levelLabels: Record<string, string> = {
  all: "全レベル",
  beginner: "初心者",
  intermediate: "中級",
  advanced: "上級",
};

export default function ClassBookingDialog({
  schedule,
  date,
  open,
  onOpenChange,
  onSuccess,
}: ClassBookingDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const classInfo = schedule.dojo_classes;
  const dateStr = format(date, "yyyy-MM-dd");

  // 既存の予約を確認
  const { data: existingBooking, isLoading: checkingBooking } = useQuery({
    queryKey: ["my-booking", schedule.id, dateStr],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("dojo_class_bookings")
        .select("id, status")
        .eq("schedule_id", schedule.id)
        .eq("booking_date", dateStr)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  // 現在の予約数を取得
  const { data: currentBookings } = useQuery({
    queryKey: ["booking-count", schedule.id, dateStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dojo_class_bookings")
        .select("id", { count: "exact", head: true })
        .eq("schedule_id", schedule.id)
        .eq("booking_date", dateStr)
        .in("status", ["confirmed", "attended"]);

      if (error) throw error;
      return count || 0;
    },
    enabled: open,
  });

  const isFull = schedule.max_capacity && currentBookings && currentBookings >= schedule.max_capacity;
  const hasActiveBooking = existingBooking && existingBooking.status !== "cancelled";

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("ログインが必要です");

      const { data, error } = await supabase
        .from("dojo_class_bookings")
        .insert({
          schedule_id: schedule.id,
          user_id: user.id,
          booking_date: dateStr,
          status: isFull ? "waitlist" : "confirmed",
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("すでに予約済みです");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["my-booking"] });
      queryClient.invalidateQueries({ queryKey: ["booking-count"] });
      queryClient.invalidateQueries({ queryKey: ["booking-counts"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success(isFull ? "キャンセル待ちに登録しました" : "予約が完了しました", {
        description: `${format(date, "M月d日(E)", { locale: ja })} ${schedule.start_time.slice(0, 5)} - ${classInfo.name_ja || classInfo.name}`,
      });
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error("予約に失敗しました", {
        description: error.message,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!existingBooking) throw new Error("予約が見つかりません");

      const { error } = await supabase
        .from("dojo_class_bookings")
        .update({ status: "cancelled" })
        .eq("id", existingBooking.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-booking"] });
      queryClient.invalidateQueries({ queryKey: ["booking-count"] });
      queryClient.invalidateQueries({ queryKey: ["booking-counts"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success("予約をキャンセルしました");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("キャンセルに失敗しました", {
        description: error.message,
      });
    },
  });

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {isFull ? "キャンセル待ち登録完了" : "予約完了"}
            </h3>
            <p className="text-muted-foreground text-center">
              {format(date, "M月d日(E)", { locale: ja })} {schedule.start_time.slice(0, 5)}
              <br />
              {classInfo.name_ja || classInfo.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: classInfo.color || "#3b82f6" }}
            />
            {classInfo.name_ja || classInfo.name}
          </DialogTitle>
          <DialogDescription>
            クラスの詳細を確認して予約してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 日時情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(date, "M月d日(E)", { locale: ja })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
              </span>
            </div>
          </div>

          {/* クラス情報 */}
          <div className="space-y-2">
            {classInfo.instructor_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>講師: {classInfo.instructor_name}</span>
              </div>
            )}
            {schedule.room_name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{schedule.room_name}</span>
              </div>
            )}
            {schedule.max_capacity && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {currentBookings || 0} / {schedule.max_capacity} 名
                </span>
                {isFull && (
                  <Badge variant="secondary" className="text-xs">
                    満員
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* レベル・タイプバッジ */}
          <div className="flex flex-wrap gap-2">
            {classInfo.level && (
              <Badge variant="outline">
                {levelLabels[classInfo.level] || classInfo.level}
              </Badge>
            )}
            <Badge variant="outline">{classInfo.duration_minutes}分</Badge>
          </div>

          {/* メモ入力 */}
          {!hasActiveBooking && (
            <div className="space-y-2">
              <Label htmlFor="notes">メモ（任意）</Label>
              <Textarea
                id="notes"
                placeholder="怪我や特記事項があれば記入してください"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* 既存予約の表示 */}
          {hasActiveBooking && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ このクラスは予約済みです
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasActiveBooking ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                閉じる
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                予約をキャンセル
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button
                onClick={() => bookMutation.mutate()}
                disabled={bookMutation.isPending || checkingBooking}
              >
                {bookMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isFull ? "キャンセル待ちに登録" : "予約する"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
