import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CreditCard, Calendar, User, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DojoMembershipCardProps {
  dojoId: string;
  className?: string;
}

interface MembershipData {
  id: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  qr_token: string;
  member_number: string | null;
  dojo_membership_plans: {
    name: string;
    name_ja: string | null;
  } | null;
  dojos: {
    name: string;
    name_ja: string;
    logo_url: string | null;
  };
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "有効", variant: "default" },
  trial: { label: "体験中", variant: "secondary" },
  paused: { label: "休会中", variant: "outline" },
  cancelled: { label: "退会済", variant: "destructive" },
  expired: { label: "期限切れ", variant: "destructive" },
};

export default function DojoMembershipCard({ dojoId, className }: DojoMembershipCardProps) {
  const { user } = useAuth();

  const { data: membership, isLoading } = useQuery({
    queryKey: ["my-membership", dojoId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("dojo_memberships")
        .select(`
          id,
          status,
          valid_from,
          valid_until,
          qr_token,
          member_number,
          dojo_membership_plans (
            name,
            name_ja
          ),
          dojos (
            name,
            name_ja,
            logo_url
          )
        `)
        .eq("dojo_id", dojoId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as MembershipData | null;
    },
    enabled: !!user,
  });

  // プロフィール情報を取得
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!membership) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">会員登録がありません</h3>
          <p className="text-sm text-muted-foreground">
            この道場の会員になると、
            <br />
            デジタル会員証が発行されます
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = statusLabels[membership.status] || statusLabels.active;
  const isActive = membership.status === "active" || membership.status === "trial";
  const planName = membership.dojo_membership_plans?.name_ja || membership.dojo_membership_plans?.name || "一般会員";
  const dojoName = membership.dojos?.name_ja || membership.dojos?.name;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* ヘッダー部分（道場ロゴ・名前） */}
      <div className="bg-gradient-to-r from-primary/90 to-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          {membership.dojos?.logo_url ? (
            <img
              src={membership.dojos.logo_url}
              alt={dojoName}
              className="w-10 h-10 rounded-full bg-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold">{dojoName}</h3>
            <p className="text-xs opacity-90">会員証</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* QRコード */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "p-4 bg-white rounded-lg shadow-sm",
            !isActive && "opacity-50"
          )}>
            <QRCodeSVG
              value={membership.qr_token}
              size={160}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* 会員情報 */}
        <div className="space-y-3">
          {/* 名前 */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{profile?.display_name || "会員"}</span>
          </div>

          {/* 会員番号 */}
          {membership.member_number && (
            <div className="text-sm text-muted-foreground">
              会員番号: {membership.member_number}
            </div>
          )}

          {/* プラン */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">プラン</span>
            <span className="font-medium">{planName}</span>
          </div>

          {/* ステータス */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ステータス</span>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          {/* 有効期限 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              有効期限
            </span>
            <span className={cn(
              "text-sm",
              !isActive && "text-destructive"
            )}>
              {membership.valid_until
                ? format(new Date(membership.valid_until), "yyyy年M月d日", { locale: ja })
                : "無期限"}
            </span>
          </div>
        </div>

        {/* 非アクティブの場合の警告 */}
        {!isActive && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            この会員証は現在有効ではありません
          </div>
        )}
      </CardContent>
    </Card>
  );
}
