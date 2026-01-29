import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, MapPin, X, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MyBookingsProps {
  dojoId?: string;
  limit?: number;
  showPast?: boolean;
}

interface BookingData {
  id: string;
  booking_date: string;
  status: string;
  checked_in_at: string | null;
  notes: string | null;
  dojo_class_schedules: {
    id: string;
    start_time: string;
    end_time: string;
    room_name: string | null;
    dojo_classes: {
      id: string;
      name: string;
      name_ja: string | null;
      color: string | null;
      dojo_id: string;
      dojos: {
        name: string;
        name_ja: string;
      };
    };
  };
}

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "予約済", icon: CheckCircle, variant: "default" },
  attended: { label: "出席", icon: CheckCircle, variant: "default" },
  cancelled: { label: "キャンセル", icon: XCircle, variant: "destructive" },
  no_show: { label: "欠席", icon: XCircle, variant: "destructive" },
  waitlist: { label: "キャンセル待ち", icon: AlertCircle, variant: "secondary" },
};

export default function MyBookings({ dojoId, limit = 10, showPast = false }: MyBookingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id, dojoId, showPast],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("dojo_class_bookings")
        .select(`
          id,
          booking_date,
          status,
          checked_in_at,
          notes,
          dojo_class_schedules!inner (
            id,
            start_time,
            end_time,
            room_name,
            dojo_classes!inner (
              id,
              name,
              name_ja,
              color,
              dojo_id,
              dojos (
                name,
                name_ja
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: true })
        .limit(limit);

      if (dojoId) {
        query = query.eq("dojo_class_schedules.dojo_classes.dojo_id", dojoId);
      }

      if (!showPast) {
        query = query.gte("booking_date", format(new Date(), "yyyy-MM-dd"));
        query = query.neq("status", "cancelled");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BookingData[];
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("dojo_class_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-counts"] });
      toast.success("予約をキャンセルしました");
    },
    onError: (error: Error) => {
      toast.error("キャンセルに失敗しました", {
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">予約一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>予約がありません</p>
            <p className="text-sm mt-1">クラスを予約するとここに表示されます</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">予約一覧</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map((booking) => {
          const schedule = booking.dojo_class_schedules;
          const classInfo = schedule.dojo_classes;
          const dojoInfo = classInfo.dojos;
          const bookingDate = new Date(booking.booking_date);
          const isPastBooking = isPast(bookingDate) && !isToday(bookingDate);
          const statusInfo = statusConfig[booking.status] || statusConfig.confirmed;
          const StatusIcon = statusInfo.icon;
          const canCancel = !isPastBooking && (booking.status === "confirmed" || booking.status === "waitlist");

          return (
            <div
              key={booking.id}
              className={cn(
                "p-4 rounded-lg border transition-colors",
                isPastBooking && "opacity-60 bg-muted/50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* クラス名 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: classInfo.color || "#3b82f6" }}
                    />
                    <span className="font-medium truncate">
                      {classInfo.name_ja || classInfo.name}
                    </span>
                  </div>

                  {/* 日時・場所情報 */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(bookingDate, "M月d日(E)", { locale: ja })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* 道場名（dojoIdが指定されていない場合のみ表示） */}
                  {!dojoId && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {dojoInfo.name_ja || dojoInfo.name}
                    </div>
                  )}
                </div>

                {/* ステータスとアクション */}
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>

                  {canCancel && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          キャンセル
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            {format(bookingDate, "M月d日(E)", { locale: ja })} {schedule.start_time.slice(0, 5)} -
                            {classInfo.name_ja || classInfo.name}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>戻る</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelMutation.mutate(booking.id)}
                            disabled={cancelMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {cancelMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            キャンセルする
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
