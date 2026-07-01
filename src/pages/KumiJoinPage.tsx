import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface Kumi {
  id: string;
  name: string;
  description: string | null;
}

const KumiJoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kumi, setKumi] = useState<Kumi | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetchKumi();
  }, [code]);

  useEffect(() => {
    if (kumi && user) checkMembership();
  }, [kumi, user]);

  const fetchKumi = async () => {
    const { data, error } = await supabase
      .from("kumis")
      .select("id, name, description")
      .eq("invite_code", code!)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      toast.error("招待リンクが無効です");
      navigate("/");
      return;
    }
    setKumi(data);

    const { count } = await supabase
      .from("kumi_members")
      .select("*", { count: "exact", head: true })
      .eq("kumi_id", data.id);
    setMemberCount(count ?? 0);
    setLoading(false);
  };

  const checkMembership = async () => {
    if (!kumi || !user) return;
    const { data } = await supabase
      .from("kumi_members")
      .select("user_id")
      .eq("kumi_id", kumi.id)
      .eq("user_id", user.id)
      .single();
    if (data) {
      setAlreadyMember(true);
    }
  };

  const join = async () => {
    if (!kumi || !user) return;
    setJoining(true);

    const { error } = await supabase.from("kumi_members").insert({
      kumi_id: kumi.id,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      toast.error("参加に失敗しました");
      setJoining(false);
      return;
    }

    toast.success(`${kumi.name} に参加しました！`);
    navigate(`/kumi/${kumi.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!kumi) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-black" />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">組への招待</p>
          <h1 className="text-3xl font-black">{kumi.name}</h1>
          {kumi.description && (
            <p className="text-sm text-[var(--fg-muted)]">{kumi.description}</p>
          )}
          <p className="text-sm text-[var(--fg-muted)]">{memberCount}人が参加中</p>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--fg-muted)]">参加するにはログインが必要です</p>
            <Link to={`/ja/login?redirect=/kumi/join/${code}`}>
              <Button className="w-full bg-[var(--accent)] text-black font-black py-6 hover:opacity-90">
                ログインして参加する
              </Button>
            </Link>
          </div>
        ) : alreadyMember ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--fg-muted)]">すでにこの組のメンバーです</p>
            <Button
              onClick={() => navigate(`/kumi/${kumi.id}`)}
              className="w-full bg-[var(--accent)] text-black font-black py-6 hover:opacity-90"
            >
              組のページへ →
            </Button>
          </div>
        ) : (
          <Button
            onClick={join}
            disabled={joining}
            className="w-full bg-[var(--accent)] text-black font-black py-6 text-base hover:opacity-90"
          >
            {joining ? "参加中..." : `${kumi.name} に参加する`}
          </Button>
        )}

        <Link to="/" className="block text-xs text-[var(--fg-muted)] hover:underline">
          JiuFlow トップへ
        </Link>
      </div>
    </div>
  );
};

export default KumiJoinPage;
