import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { TrendingUp, Calendar, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AttendanceHistoryProps {
  dojoId?: string;
  months?: number;
}

interface CheckInData {
  id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  dojo_id: string;
  dojos: {
    name: string;
    name_ja: string;
  };
}

export default function AttendanceHistory({ dojoId, months = 3 }: AttendanceHistoryProps) {
  const { user } = useAuth();

  const { data: checkIns, isLoading } = useQuery({
    queryKey: ["my-check-ins", user?.id, dojoId, months],
    queryFn: async () => {
      if (!user) return [];

      const startDate = format(subMonths(new Date(), months - 1), "yyyy-MM-01");

      let query = supabase
        .from("dojo_check_ins")
        .select(`
          id,
          checked_in_at,
          checked_out_at,
          dojo_id,
          dojos (
            name,
            name_ja
          )
        `)
        .eq("user_id", user.id)
        .gte("checked_in_at", startDate)
        .order("checked_in_at", { ascending: false });

      if (dojoId) {
        query = query.eq("dojo_id", dojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CheckInData[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    if (!checkIns || checkIns.length === 0) {
      return {
        totalVisits: 0,
        thisMonth: 0,
        streak: 0,
        avgDuration: 0,
        monthlyData: [],
      };
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    // 今月の出席数
    const thisMonth = checkIns.filter((c) => {
      const date = new Date(c.checked_in_at);
      return date >= thisMonthStart && date <= thisMonthEnd;
    }).length;

    // 平均滞在時間（分）
    const durationsMinutes = checkIns
      .filter((c) => c.checked_out_at)
      .map((c) => {
        const inTime = new Date(c.checked_in_at).getTime();
        const outTime = new Date(c.checked_out_at!).getTime();
        return (outTime - inTime) / 1000 / 60;
      })
      .filter((d) => d > 0 && d < 480); // 8時間以上は異常値として除外

    const avgDuration =
      durationsMinutes.length > 0
        ? Math.round(durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length)
        : 0;

    // 連続出席日数（簡易計算）
    const visitDates = [...new Set(checkIns.map((c) => format(new Date(c.checked_in_at), "yyyy-MM-dd")))].sort().reverse();
    let streak = 0;
    const today = format(now, "yyyy-MM-dd");
    const yesterday = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");
    
    if (visitDates[0] === today || visitDates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < visitDates.length; i++) {
        const prev = new Date(visitDates[i - 1]);
        const curr = new Date(visitDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff <= 7) { // 週1回以上を連続とみなす
          streak++;
        } else {
          break;
        }
      }
    }

    // 月別データ
    const monthlyData: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const count = checkIns.filter((c) => {
        const date = new Date(c.checked_in_at);
        return date >= monthStart && date <= monthEnd;
      }).length;
      monthlyData.push({
        month: format(monthStart, "M月", { locale: ja }),
        count,
      });
    }

    return {
      totalVisits: checkIns.length,
      thisMonth,
      streak,
      avgDuration,
      monthlyData,
    };
  }, [checkIns, months]);

  // カレンダー用の日付データ
  const calendarData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const visitDates = new Set(
      checkIns?.map((c) => format(new Date(c.checked_in_at), "yyyy-MM-dd")) || []
    );

    return days.map((day) => ({
      date: day,
      hasVisit: visitDates.has(format(day, "yyyy-MM-dd")),
      isToday: isSameDay(day, now),
    }));
  }, [checkIns]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          出席統計
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{stats.totalVisits}</div>
            <div className="text-xs text-muted-foreground mt-1">総出席回数</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{stats.thisMonth}</div>
            <div className="text-xs text-muted-foreground mt-1">今月の出席</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{stats.streak}</div>
            <div className="text-xs text-muted-foreground mt-1">継続週数</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">
              {stats.avgDuration > 0 ? `${stats.avgDuration}分` : "-"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">平均滞在</div>
          </div>
        </div>

        {/* 月別グラフ */}
        {stats.monthlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">月別出席回数</h4>
            <div className="flex items-end gap-2 h-24">
              {stats.monthlyData.map((data, i) => {
                const maxCount = Math.max(...stats.monthlyData.map((d) => d.count), 1);
                const height = (data.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-muted-foreground">{data.count}</div>
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <div className="text-xs text-muted-foreground">{data.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 今月のカレンダー */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(), "yyyy年M月", { locale: ja })}
          </h4>
          <div className="grid grid-cols-7 gap-1">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground py-1">
                {day}
              </div>
            ))}
            {/* 月初の空白 */}
            {Array.from({ length: calendarData[0]?.date.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* 日付 */}
            {calendarData.map(({ date, hasVisit, isToday }) => (
              <div
                key={date.toISOString()}
                className={cn(
                  "aspect-square flex items-center justify-center text-xs rounded-full",
                  hasVisit && "bg-primary text-primary-foreground",
                  isToday && !hasVisit && "ring-2 ring-primary",
                  !hasVisit && !isToday && "text-muted-foreground"
                )}
              >
                {date.getDate()}
              </div>
            ))}
          </div>
        </div>

        {/* 出席がない場合のメッセージ */}
        {stats.totalVisits === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">まだ出席記録がありません</p>
            <p className="text-xs mt-1">道場でチェックインすると記録されます</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
