import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Filter, Download, Check, X, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DojoBookingsManagementProps {
  dojoId: string;
}

type DateFilter = "today" | "week" | "month" | "all";
type StatusFilter = "all" | "confirmed" | "waitlist" | "attended" | "cancelled" | "no_show";

export default function DojoBookingsManagement({ dojoId }: DojoBookingsManagementProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { locale: ja }), end: endOfWeek(now, { locale: ja }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const { data: classes } = useQuery({
    queryKey: ["dojo-classes", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_classes")
        .select("id, name, name_ja")
        .eq("dojo_id", dojoId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["dojo-bookings", dojoId, dateFilter, statusFilter, classFilter],
    queryFn: async () => {
      let query = supabase
        .from("dojo_class_bookings")
        .select(`
          id,
          booking_date,
          status,
          checked_in_at,
          notes,
          created_at,
          user_id,
          schedule_id,
          dojo_class_schedules!inner (
            id,
            start_time,
            end_time,
            day_of_week,
            class_id,
            dojo_classes!inner (
              id,
              name,
              name_ja,
              dojo_id
            )
          )
        `)
        .eq("dojo_class_schedules.dojo_classes.dojo_id", dojoId)
        .order("booking_date", { ascending: false });

      const dateRange = getDateRange();
      if (dateRange) {
        query = query
          .gte("booking_date", format(dateRange.start, "yyyy-MM-dd"))
          .lte("booking_date", format(dateRange.end, "yyyy-MM-dd"));
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (classFilter !== "all") {
        query = query.eq("dojo_class_schedules.class_id", classFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(b => b.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data?.map(booking => ({
        ...booking,
        profile: profileMap.get(booking.user_id),
      }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase
        .from("dojo_class_bookings")
        .update({ status })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-bookings", dojoId] });
      toast.success("ステータスを更新しました");
    },
    onError: () => {
      toast.error("更新に失敗しました");
    },
  });

  const exportToCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast.error("エクスポートするデータがありません");
      return;
    }

    const headers = ["予約日", "クラス名", "時間", "会員名", "ステータス", "チェックイン時刻"];
    const rows = bookings.map(booking => [
      booking.booking_date,
      booking.dojo_class_schedules?.dojo_classes?.name_ja || booking.dojo_class_schedules?.dojo_classes?.name,
      `${booking.dojo_class_schedules?.start_time} - ${booking.dojo_class_schedules?.end_time}`,
      booking.profile?.display_name || "不明",
      getStatusLabel(booking.status),
      booking.checked_in_at ? format(new Date(booking.checked_in_at), "HH:mm") : "-",
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookings_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSVをエクスポートしました");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "確認済み";
      case "waitlist": return "キャンセル待ち";
      case "attended": return "出席";
      case "cancelled": return "キャンセル";
      case "no_show": return "欠席";
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-blue-500">確認済み</Badge>;
      case "waitlist":
        return <Badge variant="secondary">キャンセル待ち</Badge>;
      case "attended":
        return <Badge variant="default" className="bg-green-500">出席</Badge>;
      case "cancelled":
        return <Badge variant="outline">キャンセル</Badge>;
      case "no_show":
        return <Badge variant="destructive">欠席</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">今週</SelectItem>
              <SelectItem value="month">今月</SelectItem>
              <SelectItem value="all">すべて</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              <SelectItem value="confirmed">確認済み</SelectItem>
              <SelectItem value="waitlist">キャンセル待ち</SelectItem>
              <SelectItem value="attended">出席</SelectItem>
              <SelectItem value="cancelled">キャンセル</SelectItem>
              <SelectItem value="no_show">欠席</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="クラス選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全クラス</SelectItem>
              {classes?.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name_ja || cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSVエクスポート
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{bookings?.length || 0}</div>
          <div className="text-xs text-muted-foreground">総予約数</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {bookings?.filter(b => b.status === "confirmed").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">確認済み</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {bookings?.filter(b => b.status === "attended").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">出席</div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {bookings?.filter(b => b.status === "waitlist").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">キャンセル待ち</div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">
            {bookings?.filter(b => b.status === "no_show").length || 0}
          </div>
          <div className="text-xs text-muted-foreground">欠席</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>予約日</TableHead>
              <TableHead>クラス</TableHead>
              <TableHead>時間</TableHead>
              <TableHead>会員</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  予約がありません
                </TableCell>
              </TableRow>
            ) : (
              bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {format(new Date(booking.booking_date), "M/d (E)", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    {booking.dojo_class_schedules?.dojo_classes?.name_ja || 
                     booking.dojo_class_schedules?.dojo_classes?.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {booking.dojo_class_schedules?.start_time?.slice(0, 5)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {booking.profile?.display_name || "不明"}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          変更
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                        >
                          <Check className="h-4 w-4 mr-2 text-blue-500" />
                          確認済みに変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "attended" })}
                        >
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          出席に変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "no_show" })}
                        >
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          欠席に変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                        >
                          <X className="h-4 w-4 mr-2" />
                          キャンセル
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
