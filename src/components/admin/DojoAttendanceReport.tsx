import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ja } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Calendar, Award } from "lucide-react";

interface DojoAttendanceReportProps {
  dojoId: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DojoAttendanceReport({ dojoId }: DojoAttendanceReportProps) {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  // Fetch check-ins data
  const { data: checkIns, isLoading: checkInsLoading } = useQuery({
    queryKey: ["dojo-checkins-report", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_check_ins")
        .select("id, checked_in_at, user_id")
        .eq("dojo_id", dojoId)
        .gte("checked_in_at", format(sixMonthsAgo, "yyyy-MM-dd"))
        .order("checked_in_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch memberships data
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["dojo-memberships-report", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_memberships")
        .select("id, status, created_at, user_id")
        .eq("dojo_id", dojoId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch class bookings with class info
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["dojo-bookings-report", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_class_bookings")
        .select(`
          id,
          status,
          booking_date,
          dojo_class_schedules!inner (
            day_of_week,
            start_time,
            dojo_classes!inner (
              id,
              name,
              name_ja,
              class_type,
              dojo_id
            )
          )
        `)
        .eq("dojo_class_schedules.dojo_classes.dojo_id", dojoId)
        .gte("booking_date", format(sixMonthsAgo, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  const isLoading = checkInsLoading || membershipsLoading || bookingsLoading;

  // Calculate monthly check-ins
  const monthlyCheckIns = () => {
    if (!checkIns) return [];
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const count = checkIns.filter(c => {
        const date = new Date(c.checked_in_at);
        return date >= start && date <= end;
      }).length;
      return {
        month: format(month, "M月", { locale: ja }),
        count,
      };
    });
  };

  // Calculate class type distribution
  const classTypeDistribution = () => {
    if (!bookings) return [];
    const typeCount: Record<string, number> = {};
    bookings.forEach(b => {
      const type = b.dojo_class_schedules?.dojo_classes?.class_type || "other";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const typeLabels: Record<string, string> = {
      regular: "レギュラー",
      beginner: "初心者",
      advanced: "上級者",
      open_mat: "オープンマット",
      kids: "キッズ",
      competition: "競技",
      other: "その他",
    };
    return Object.entries(typeCount).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count,
    }));
  };

  // Calculate day of week popularity
  const dayOfWeekPopularity = () => {
    if (!bookings) return [];
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach(b => {
      const day = b.dojo_class_schedules?.day_of_week;
      if (day !== undefined && day !== null) {
        dayCount[day]++;
      }
    });
    const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
    return dayLabels.map((label, i) => ({
      day: label,
      count: dayCount[i],
    }));
  };

  // Calculate member stats
  const memberStats = () => {
    if (!memberships) return { active: 0, inactive: 0, total: 0 };
    const active = memberships.filter(m => m.status === "active").length;
    const inactive = memberships.filter(m => m.status !== "active").length;
    return { active, inactive, total: memberships.length };
  };

  // Calculate class rankings
  const classRankings = () => {
    if (!bookings) return [];
    const classCount: Record<string, { name: string; count: number }> = {};
    bookings.forEach(b => {
      const classId = b.dojo_class_schedules?.dojo_classes?.id;
      const className = b.dojo_class_schedules?.dojo_classes?.name_ja || 
                       b.dojo_class_schedules?.dojo_classes?.name;
      if (classId && className) {
        if (!classCount[classId]) {
          classCount[classId] = { name: className, count: 0 };
        }
        classCount[classId].count++;
      }
    });
    return Object.values(classCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Calculate monthly new members
  const monthlyNewMembers = () => {
    if (!memberships) return [];
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const count = memberships.filter(m => {
        const date = new Date(m.created_at);
        return date >= start && date <= end;
      }).length;
      return {
        month: format(month, "M月", { locale: ja }),
        count,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const stats = memberStats();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">総会員数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-xs text-muted-foreground">アクティブ会員</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{checkIns?.length || 0}</div>
                <div className="text-xs text-muted-foreground">総チェックイン</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{bookings?.length || 0}</div>
                <div className="text-xs text-muted-foreground">総予約数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">月別チェックイン数</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyCheckIns()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">クラスタイプ別参加比率</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={classTypeDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classTypeDistribution().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">曜日別人気度</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayOfWeekPopularity()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規会員数推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyNewMembers()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Class Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人気クラスランキング</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classRankings().length === 0 ? (
              <p className="text-muted-foreground text-center py-4">データがありません</p>
            ) : (
              classRankings().map((cls, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? "bg-yellow-500 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-amber-700 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm text-muted-foreground">{cls.count}回予約</div>
                  </div>
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(cls.count / (classRankings()[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
