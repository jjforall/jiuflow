import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ClassBookingDialog from "./ClassBookingDialog";

interface ClassCalendarProps {
  dojoId: string;
  onBookingSuccess?: () => void;
}

interface ClassSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  room_name: string | null;
  is_active: boolean;
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

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const levelLabels: Record<string, string> = {
  all: "全レベル",
  beginner: "初心者",
  intermediate: "中級",
  advanced: "上級",
};

const classTypeLabels: Record<string, string> = {
  regular: "通常",
  open_mat: "オープンマット",
  competition: "試合",
  private: "プライベート",
  kids: "キッズ",
  nogi: "ノーギ",
};

export default function ClassCalendar({ dojoId, onBookingSuccess }: ClassCalendarProps) {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["dojo-schedules", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_class_schedules")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          max_capacity,
          room_name,
          is_active,
          dojo_classes!inner (
            id,
            name,
            name_ja,
            class_type,
            level,
            color,
            duration_minutes,
            instructor_name
          )
        `)
        .eq("dojo_classes.dojo_id", dojoId)
        .eq("is_active", true)
        .eq("dojo_classes.is_active", true)
        .order("start_time");

      if (error) throw error;
      return data as unknown as ClassSchedule[];
    },
  });

  const { data: bookingCounts } = useQuery({
    queryKey: ["booking-counts", dojoId, weekStart.toISOString()],
    queryFn: async () => {
      const dates = weekDays.map(d => format(d, "yyyy-MM-dd"));
      const scheduleIds = schedules?.map(s => s.id) || [];
      
      if (scheduleIds.length === 0) return {};

      const { data, error } = await supabase
        .from("dojo_class_bookings")
        .select("schedule_id, booking_date")
        .in("schedule_id", scheduleIds)
        .in("booking_date", dates)
        .in("status", ["confirmed", "attended"]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(b => {
        const key = `${b.schedule_id}-${b.booking_date}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
    enabled: !!schedules && schedules.length > 0,
  });

  const getSchedulesForDay = (dayOfWeek: number) => {
    return schedules?.filter(s => s.day_of_week === dayOfWeek) || [];
  };

  const getBookingCount = (scheduleId: string, date: Date) => {
    const key = `${scheduleId}-${format(date, "yyyy-MM-dd")}`;
    return bookingCounts?.[key] || 0;
  };

  const handlePrevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7));
  const handleToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleScheduleClick = (schedule: ClassSchedule, date: Date) => {
    if (!user) {
      // TODO: ログインを促す
      return;
    }
    setSelectedSchedule(schedule);
    setSelectedDate(date);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">クラススケジュール</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              今週
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* ヘッダー行 */}
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              const dayOfWeek = (i + 1) % 7; // 月曜始まり
              return (
                <div
                  key={i}
                  className={cn(
                    "text-center py-2 rounded-t-lg text-sm font-medium",
                    isToday && "bg-primary text-primary-foreground",
                    dayOfWeek === 0 && !isToday && "text-red-500",
                    dayOfWeek === 6 && !isToday && "text-blue-500"
                  )}
                >
                  <div>{dayNames[dayOfWeek]}</div>
                  <div className="text-xs opacity-80">
                    {format(day, "M/d", { locale: ja })}
                  </div>
                </div>
              );
            })}

            {/* スケジュールセル */}
            {weekDays.map((day, i) => {
              const dayOfWeek = (i + 1) % 7;
              const daySchedules = getSchedulesForDay(dayOfWeek);
              const isPast = day < new Date() && !isSameDay(day, new Date());

              return (
                <div
                  key={`cell-${i}`}
                  className={cn(
                    "min-h-[120px] border rounded-b-lg p-1 space-y-1",
                    isPast && "opacity-50"
                  )}
                >
                  {daySchedules.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      クラスなし
                    </div>
                  ) : (
                    daySchedules.map(schedule => {
                      const count = getBookingCount(schedule.id, day);
                      const isFull = schedule.max_capacity && count >= schedule.max_capacity;
                      const classInfo = schedule.dojo_classes;

                      return (
                        <button
                          key={schedule.id}
                          onClick={() => !isPast && handleScheduleClick(schedule, day)}
                          disabled={isPast}
                          className={cn(
                            "w-full text-left p-2 rounded-md text-xs transition-colors",
                            "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring",
                            isPast && "cursor-not-allowed"
                          )}
                          style={{
                            backgroundColor: classInfo.color || "#3b82f6",
                            color: "white",
                          }}
                        >
                          <div className="font-medium truncate">
                            {classInfo.name_ja || classInfo.name}
                          </div>
                          <div className="flex items-center gap-1 mt-1 opacity-90">
                            <Clock className="h-3 w-3" />
                            <span>
                              {schedule.start_time.slice(0, 5)}
                            </span>
                          </div>
                          {schedule.max_capacity && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" />
                              <span className={cn(isFull && "text-yellow-200")}>
                                {count}/{schedule.max_capacity}
                              </span>
                              {isFull && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  満員
                                </Badge>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-medium">レベル:</span>
            {Object.entries(levelLabels).map(([key, label]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSchedule && selectedDate && (
        <ClassBookingDialog
          schedule={selectedSchedule}
          date={selectedDate}
          open={!!selectedSchedule}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSchedule(null);
              setSelectedDate(null);
            }
          }}
          onSuccess={() => {
            setSelectedSchedule(null);
            setSelectedDate(null);
            onBookingSuccess?.();
          }}
        />
      )}
    </>
  );
}
