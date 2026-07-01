import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Flame, Copy, ClipboardCheck, BookOpen, ChevronRight } from "lucide-react";
import { format, isToday, isThisWeek, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

interface Kumi {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
}

interface MemberLog {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  practice_date: string;
  technique_name: string | null;
  repetition_count: number | null;
  record_id: string;
}

interface WeekStat {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  session_count: number;
}

const KumiPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kumi, setKumi] = useState<Kumi | null>(null);
  const [logs, setLogs] = useState<MemberLog[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStat[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [userLoggedToday, setUserLoggedToday] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    load();
  }, [id, user]);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);

    const [kumiRes, memberRes, logsRes] = await Promise.all([
      supabase.from("kumis").select("*").eq("id", id).single(),
      supabase.from("kumi_members").select("user_id, role").eq("kumi_id", id),
      supabase
        .from("practice_records")
        .select("id, user_id, practice_date, repetition_count, technique_id, techniques(name_ja)")
        .eq("kumi_id", id)
        .order("practice_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (kumiRes.error || !kumiRes.data) {
      toast.error("組が見つかりません");
      navigate("/");
      return;
    }

    setKumi(kumiRes.data);

    const members = memberRes.data ?? [];
    setMemberCount(members.length);
    const myMembership = members.find((m) => m.user_id === user.id);
    setIsMember(!!myMembership);
    setIsAdmin(myMembership?.role === "admin");

    // Enrich logs with profiles
    const rawLogs = logsRes.data ?? [];
    const userIds = [...new Set(rawLogs.map((r) => r.user_id))];

    const profilesRes = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = Object.fromEntries(
      (profilesRes.data ?? []).map((p) => [p.id, p])
    );

    const enriched: MemberLog[] = rawLogs.map((r) => ({
      user_id: r.user_id,
      display_name: profileMap[r.user_id]?.display_name ?? "柔術家",
      avatar_url: profileMap[r.user_id]?.avatar_url ?? null,
      practice_date: r.practice_date,
      technique_name: (r.techniques as any)?.name_ja ?? null,
      repetition_count: r.repetition_count,
      record_id: r.id,
    }));

    setLogs(enriched);

    const today = enriched.filter((l) => isToday(parseISO(l.practice_date)));
    setTodayCount(new Set(today.map((l) => l.user_id)).size);
    setUserLoggedToday(today.some((l) => l.user_id === user.id));

    // Weekly stats
    const thisWeek = enriched.filter((l) => isThisWeek(parseISO(l.practice_date), { weekStartsOn: 1 }));
    const statMap = new Map<string, WeekStat>();
    thisWeek.forEach((l) => {
      if (!statMap.has(l.user_id)) {
        statMap.set(l.user_id, {
          user_id: l.user_id,
          display_name: l.display_name,
          avatar_url: l.avatar_url,
          session_count: 0,
        });
      }
      statMap.get(l.user_id)!.session_count += 1;
    });
    setWeekStats(Array.from(statMap.values()).sort((a, b) => b.session_count - a.session_count));

    setLoading(false);
  };

  const copyInviteLink = async () => {
    if (!kumi) return;
    const url = `${window.location.origin}/kumi/join/${kumi.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const avatarEl = (log: { display_name: string; avatar_url: string | null }) =>
    log.avatar_url ? (
      <img src={log.avatar_url} alt={log.display_name} className="w-9 h-9 rounded-full object-cover" />
    ) : (
      <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-black text-black">
        {getInitials(log.display_name)}
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg">ログインが必要です</p>
        <Link to="/ja/login"><Button>ログイン</Button></Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!kumi) return null;

  // Group logs by date
  const byDate = logs.reduce<Record<string, MemberLog[]>>((acc, log) => {
    const d = log.practice_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">組</p>
          <h1 className="text-3xl font-black">{kumi.name}</h1>
          {kumi.description && (
            <p className="text-sm text-[var(--fg-muted)]">{kumi.description}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <span className="flex items-center gap-1 text-sm text-[var(--fg-muted)]">
              <Users className="w-4 h-4" /> {memberCount}人
            </span>
            {(isAdmin || kumi.created_by === user.id) && (
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1 text-sm text-[var(--accent)] font-bold"
              >
                {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "コピーした！" : "招待リンクをコピー"}
              </button>
            )}
          </div>
        </div>

        {/* Today's mat */}
        <div className="rounded-xl border border-[var(--border)] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">今日の練習</p>
            <p className="text-4xl font-black mt-1">
              {todayCount}
              <span className="text-lg font-normal text-[var(--fg-muted)] ml-1">人が記録</span>
            </p>
          </div>
          {!userLoggedToday ? (
            <Link to="/ja/practice-records">
              <Button size="sm" className="bg-[var(--accent)] text-black font-black hover:opacity-90">
                記録する →
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-1 text-[var(--positive)] font-bold text-sm">
              <Flame className="w-5 h-5" /> 今日も練習した！
            </div>
          )}
        </div>

        {/* Weekly leaderboard */}
        {weekStats.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">今週の練習回数</p>
            <div className="space-y-2">
              {weekStats.map((stat, i) => (
                <div key={stat.user_id} className="flex items-center gap-3">
                  <span className="text-xs font-black w-4 text-[var(--fg-muted)]">{i + 1}</span>
                  {avatarEl(stat)}
                  <span className="flex-1 font-bold text-sm">{stat.display_name}</span>
                  <span className="font-black text-[var(--accent)]">{stat.session_count}回</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">練習ログ</p>

          {Object.keys(byDate).length === 0 && (
            <div className="text-center py-10 text-[var(--fg-muted)]">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">まだ練習ログがありません</p>
              <p className="text-xs mt-1">最初の記録をつけてみよう！</p>
            </div>
          )}

          {Object.entries(byDate).map(([date, dayLogs]) => (
            <div key={date}>
              <p className="text-xs text-[var(--fg-muted)] font-bold mb-2">
                {isToday(parseISO(date))
                  ? "今日"
                  : format(parseISO(date), "M月d日（E）", { locale: ja })}
              </p>
              <div className="space-y-2">
                {dayLogs.map((log) => (
                  <Card key={log.record_id} className="border-[var(--border)] bg-[var(--surface)]">
                    <CardContent className="p-3 flex items-center gap-3">
                      {avatarEl(log)}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{log.display_name}</p>
                        {log.technique_name && (
                          <p className="text-xs text-[var(--fg-muted)] truncate">{log.technique_name}</p>
                        )}
                      </div>
                      {log.repetition_count != null && (
                        <span className="text-xs font-black text-[var(--accent)] whitespace-nowrap">
                          {log.repetition_count}回
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA if not logged today */}
        {!userLoggedToday && logs.length > 0 && (
          <Link to="/ja/practice-records" className="block">
            <Button className="w-full bg-[var(--accent)] text-black font-black text-base py-6 hover:opacity-90">
              今日の練習を記録する <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default KumiPage;
