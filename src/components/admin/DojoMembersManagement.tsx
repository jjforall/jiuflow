import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Users, Search, Plus, Pencil, CreditCard, MoreHorizontal, QrCode, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DojoMembersManagementProps {
  dojoId: string;
}

interface MembershipData {
  id: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  qr_token: string;
  member_number: string | null;
  notes: string | null;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email?: string;
  };
  dojo_membership_plans: {
    id: string;
    name: string;
    name_ja: string | null;
  } | null;
}

interface PlanData {
  id: string;
  name: string;
  name_ja: string | null;
  price: number;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "有効", variant: "default" },
  trial: { label: "体験中", variant: "secondary" },
  paused: { label: "休会中", variant: "outline" },
  cancelled: { label: "退会済", variant: "destructive" },
  expired: { label: "期限切れ", variant: "destructive" },
};

export default function DojoMembersManagement({ dojoId }: DojoMembersManagementProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MembershipData | null>(null);
  const [editForm, setEditForm] = useState({
    status: "active",
    plan_id: "",
    valid_until: "",
    member_number: "",
    notes: "",
  });

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["dojo-memberships-admin", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_memberships")
        .select(`
          id,
          status,
          valid_from,
          valid_until,
          qr_token,
          member_number,
          notes,
          created_at,
          profiles (
            id,
            display_name,
            avatar_url
          ),
          dojo_membership_plans (
            id,
            name,
            name_ja
          )
        `)
        .eq("dojo_id", dojoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as MembershipData[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["dojo-plans", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_membership_plans")
        .select("id, name, name_ja, price")
        .eq("dojo_id", dojoId)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as PlanData[];
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      const updateData: Record<string, unknown> = {
        status: data.status,
        plan_id: data.plan_id || null,
        member_number: data.member_number || null,
        notes: data.notes || null,
      };

      if (data.valid_until) {
        updateData.valid_until = data.valid_until;
      }

      const { error } = await supabase
        .from("dojo_memberships")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-memberships-admin", dojoId] });
      setEditDialogOpen(false);
      setSelectedMember(null);
      toast.success("会員情報を更新しました");
    },
    onError: (error: Error) => {
      toast.error("会員情報の更新に失敗しました", { description: error.message });
    },
  });

  const handleEditMember = (member: MembershipData) => {
    setSelectedMember(member);
    setEditForm({
      status: member.status,
      plan_id: member.dojo_membership_plans?.id || "",
      valid_until: member.valid_until ? member.valid_until.split("T")[0] : "",
      member_number: member.member_number || "",
      notes: member.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    updateMembershipMutation.mutate({ id: selectedMember.id, data: editForm });
  };

  const filteredMemberships = memberships?.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.profiles.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: memberships?.length || 0,
    active: memberships?.filter((m) => m.status === "active").length || 0,
    trial: memberships?.filter((m) => m.status === "trial").length || 0,
    paused: memberships?.filter((m) => m.status === "paused").length || 0,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              会員管理
            </CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              会員追加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 統計 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">総会員数</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold text-primary">{stats.active}</div>
              <div className="text-xs text-muted-foreground">有効</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold text-secondary-foreground">{stats.trial}</div>
              <div className="text-xs text-muted-foreground">体験中</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">{stats.paused}</div>
              <div className="text-xs text-muted-foreground">休会中</div>
            </div>
          </div>

          {/* フィルター */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="名前・会員番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(statusLabels).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 会員テーブル */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会員</TableHead>
                  <TableHead>プラン</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredMemberships || filteredMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      会員が見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMemberships.map((member) => {
                    const statusInfo = statusLabels[member.status] || statusLabels.active;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.profiles.avatar_url || undefined} />
                              <AvatarFallback>
                                {member.profiles.display_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.profiles.display_name || "名前未設定"}
                              </div>
                              {member.member_number && (
                                <div className="text-xs text-muted-foreground">
                                  #{member.member_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.dojo_membership_plans ? (
                            <Badge variant="outline">
                              {member.dojo_membership_plans.name_ja || member.dojo_membership_plans.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {member.valid_until ? (
                            <span className={cn(
                              new Date(member.valid_until) < new Date() && "text-destructive"
                            )}>
                              {format(new Date(member.valid_until), "yyyy/MM/dd", { locale: ja })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">無期限</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.created_at), "yyyy/MM/dd", { locale: ja })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditMember(member)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(member.qr_token);
                                toast.success("QRトークンをコピーしました");
                              }}>
                                <QrCode className="mr-2 h-4 w-4" />
                                QRトークンをコピー
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CreditCard className="mr-2 h-4 w-4" />
                                決済履歴
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>会員情報を編集</DialogTitle>
            <DialogDescription>
              {selectedMember?.profiles.display_name || "会員"}の情報を編集
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_id">プラン</Label>
              <Select
                value={editForm.plan_id}
                onValueChange={(value) => setEditForm({ ...editForm, plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プランを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">なし</SelectItem>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name_ja || plan.name} (¥{plan.price.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">有効期限</Label>
              <Input
                id="valid_until"
                type="date"
                value={editForm.valid_until}
                onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_number">会員番号</Label>
              <Input
                id="member_number"
                value={editForm.member_number}
                onChange={(e) => setEditForm({ ...editForm, member_number: e.target.value })}
                placeholder="例: BJJ-0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">メモ</Label>
              <Input
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={updateMembershipMutation.isPending}>
                {updateMembershipMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                更新
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
