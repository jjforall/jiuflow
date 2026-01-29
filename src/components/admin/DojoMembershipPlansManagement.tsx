import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, CreditCard, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DojoMembershipPlansManagementProps {
  dojoId: string;
}

interface MembershipPlan {
  id: string;
  name: string;
  name_ja: string | null;
  description: string | null;
  description_ja: string | null;
  price: number;
  interval: string;
  max_bookings_per_month: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  display_order: number | null;
  features: string[] | null;
}

interface PlanFormData {
  name: string;
  name_ja: string;
  description: string;
  description_ja: string;
  price: number;
  interval: string;
  max_bookings_per_month: number | null;
  stripe_price_id: string;
  is_active: boolean;
  features: string;
}

const defaultFormData: PlanFormData = {
  name: "",
  name_ja: "",
  description: "",
  description_ja: "",
  price: 0,
  interval: "month",
  max_bookings_per_month: null,
  stripe_price_id: "",
  is_active: true,
  features: "",
};

export default function DojoMembershipPlansManagement({ dojoId }: DojoMembershipPlansManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["dojo-membership-plans", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_membership_plans")
        .select("*")
        .eq("dojo_id", dojoId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as MembershipPlan[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<MembershipPlan, "id" | "display_order">) => {
      const { error } = await supabase
        .from("dojo_membership_plans")
        .insert({
          ...data,
          dojo_id: dojoId,
          display_order: (plans?.length || 0) + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-membership-plans", dojoId] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("プランを作成しました");
    },
    onError: () => {
      toast.error("作成に失敗しました");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MembershipPlan> }) => {
      const { error } = await supabase
        .from("dojo_membership_plans")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-membership-plans", dojoId] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("プランを更新しました");
    },
    onError: () => {
      toast.error("更新に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dojo_membership_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dojo-membership-plans", dojoId] });
      setDeletingPlanId(null);
      toast.success("プランを削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingPlan(null);
  };

  const handleEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      name_ja: plan.name_ja || "",
      description: plan.description || "",
      description_ja: plan.description_ja || "",
      price: plan.price,
      interval: plan.interval,
      max_bookings_per_month: plan.max_bookings_per_month,
      stripe_price_id: plan.stripe_price_id || "",
      is_active: plan.is_active,
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const featuresArray = formData.features
      .split("\n")
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const planData = {
      name: formData.name,
      name_ja: formData.name_ja || null,
      description: formData.description || null,
      description_ja: formData.description_ja || null,
      price: formData.price,
      interval: formData.interval,
      max_bookings_per_month: formData.max_bookings_per_month,
      stripe_price_id: formData.stripe_price_id || null,
      is_active: formData.is_active,
      features: featuresArray.length > 0 ? featuresArray : null,
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: planData });
    } else {
      createMutation.mutate(planData as Omit<MembershipPlan, "id" | "display_order">);
    }
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case "month": return "月額";
      case "year": return "年額";
      case "week": return "週額";
      case "day": return "日額";
      default: return interval;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {plans?.length || 0}件のプラン
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          新規プラン
        </Button>
      </div>

      {plans?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>会員プランがありません</p>
            <p className="text-sm mt-2">新規プランを作成してください</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans?.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {plan.name_ja || plan.name}
                        {!plan.is_active && (
                          <Badge variant="secondary">非公開</Badge>
                        )}
                      </CardTitle>
                      {plan.description_ja && (
                        <CardDescription className="mt-1">
                          {plan.description_ja}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => setDeletingPlanId(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">¥{plan.price.toLocaleString()}</span>
                  <span className="text-muted-foreground">/{getIntervalLabel(plan.interval)}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  {plan.max_bookings_per_month && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">予約上限: {plan.max_bookings_per_month}回/月</Badge>
                    </div>
                  )}
                  {plan.stripe_price_id && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs font-mono">
                        {plan.stripe_price_id.slice(0, 20)}...
                      </span>
                    </div>
                  )}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "プランを編集" : "新規プラン"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>プラン名（英語）</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Premium"
                />
              </div>
              <div className="space-y-2">
                <Label>プラン名（日本語）</Label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  placeholder="プレミアム"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>料金（円）</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>請求間隔</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(v) => setFormData({ ...formData, interval: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">月額</SelectItem>
                    <SelectItem value="year">年額</SelectItem>
                    <SelectItem value="week">週額</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>月間予約上限（任意）</Label>
              <Input
                type="number"
                value={formData.max_bookings_per_month || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_bookings_per_month: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="無制限の場合は空欄"
              />
            </div>

            <div className="space-y-2">
              <Label>Stripe価格ID（任意）</Label>
              <Input
                value={formData.stripe_price_id}
                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                placeholder="price_..."
              />
              <p className="text-xs text-muted-foreground">
                Stripeで決済を有効にするには価格IDを設定してください
              </p>
            </div>

            <div className="space-y-2">
              <Label>説明（日本語）</Label>
              <Textarea
                value={formData.description_ja}
                onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                placeholder="プランの説明"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>特典（1行に1つ）</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="全クラス受講可能&#10;専用ロッカー付き&#10;道着レンタル無料"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>公開する</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingPlan ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlanId} onOpenChange={() => setDeletingPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プランを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。このプランに関連する会員情報に影響する可能性があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlanId && deleteMutation.mutate(deletingPlanId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
