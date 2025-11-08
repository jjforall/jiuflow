import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: string;
  } | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: Price[];
}

interface Coupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  valid: boolean;
}

// jiuflow関連のPrice IDsのみを表示
const JIUFLOW_PRICE_IDS = [
  "price_1SR3ZmDqLakc8NxkNdqL5BtO", // Founder Access - ¥980/month
  "price_1SNQoeDqLakc8NxkEUVTTs3k", // Monthly Plan - ¥2,900/month
  "price_1SNQoqDqLakc8NxkOaQIL8wX", // Annual Plan - ¥29,000/year
];

export const PlansTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showEditCouponDialog, setShowEditCouponDialog] = useState(false);
  const [showCreateCouponDialog, setShowCreateCouponDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceAmount: "",
    currency: "jpy",
    interval: "month" as "month" | "year" | "",
  });

  const [couponFormData, setCouponFormData] = useState({
    name: "",
  });

  const [newCouponFormData, setNewCouponFormData] = useState({
    id: "",
    name: "",
    percent_off: "",
    duration: "once" as "once" | "forever" | "repeating",
    duration_in_months: "",
  });

  useEffect(() => {
    loadPlans();
    loadCoupons();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("管理者としてログインが必要です（セッションが見つかりません）");
      }

      const { data, error } = await supabase.functions.invoke("manage-plans", {
        body: { action: "list" },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);

      // jiuflow関連のプランのみフィルタリング
      const allProducts = (data as any).products || [];
      const jiuflowProducts = allProducts.filter((product: Product) => 
        product.prices.some(price => JIUFLOW_PRICE_IDS.includes(price.id))
      );
      
      setProducts(jiuflowProducts);
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "プラン一覧の取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です（セッションが見つかりません）");
      }

      if (editingProduct) {
        // 更新モード
        const { data, error } = await supabase.functions.invoke("manage-plans", {
          body: {
            action: "update",
            productId: editingProduct.id,
            name: formData.name,
            description: formData.description,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast.success("更新完了", {
          description: "プランを更新しました",
        });
      } else {
        // 作成モード
        const { data, error } = await supabase.functions.invoke("manage-plans", {
          body: {
            action: "create",
            name: formData.name,
            description: formData.description,
            priceAmount: parseInt(formData.priceAmount),
            currency: formData.currency,
            interval: formData.interval || undefined,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast.success("プラン作成完了", {
          description: "新しいプランを作成しました",
        });
      }

      setShowCreateDialog(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        priceAmount: "",
        currency: "jpy",
        interval: "month",
      });
      loadPlans();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "処理に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      priceAmount: "",
      currency: "jpy",
      interval: "month",
    });
    setShowCreateDialog(true);
  };

  const handleUpdateProduct = async (productId: string, updates: any) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です（セッションが見つかりません）");
      }

      const { data, error } = await supabase.functions.invoke("manage-plans", {
        body: {
          action: "update",
          productId,
          ...updates,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("更新完了", {
        description: "プランを更新しました",
      });

      loadPlans();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "プランの更新に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    if (!confirm("このプランをアーカイブしますか？")) return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です（セッションが見つかりません）");
      }

      const { data, error } = await supabase.functions.invoke("manage-plans", {
        body: {
          action: "archive",
          productId,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("アーカイブ完了", {
        description: "プランをアーカイブしました",
      });

      loadPlans();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "プランのアーカイブに失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCoupons = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(
        `https://jkiohqfamhiykurxrhsn.supabase.co/functions/v1/list-coupons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ limit: 100 }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch coupons");
      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch (error: any) {
      console.error("Error loading coupons:", error);
    }
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です");
      }

      const { data, error } = await supabase.functions.invoke("update-coupon", {
        body: {
          couponId: editingCoupon.id,
          name: couponFormData.name,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("更新完了", {
        description: `クーポン「${couponFormData.name}」に更新しました`,
      });

      setShowEditCouponDialog(false);
      setEditingCoupon(null);
      setCouponFormData({ name: "" });
      loadCoupons();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "クーポンの更新に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponFormData({ name: coupon.name || "" });
    setShowEditCouponDialog(true);
  };

  const handleCreateCoupon = async () => {
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です");
      }

      const { data, error } = await supabase.functions.invoke("create-coupon", {
        body: {
          id: newCouponFormData.id || undefined,
          name: newCouponFormData.name,
          percent_off: newCouponFormData.percent_off ? parseFloat(newCouponFormData.percent_off) : undefined,
          duration: newCouponFormData.duration,
          duration_in_months: newCouponFormData.duration === "repeating" && newCouponFormData.duration_in_months
            ? parseInt(newCouponFormData.duration_in_months)
            : undefined,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("クーポン作成完了", {
        description: `クーポン「${newCouponFormData.id || data.coupon.id}」を作成しました`,
      });

      setShowCreateCouponDialog(false);
      setNewCouponFormData({
        id: "",
        name: "",
        percent_off: "",
        duration: "once",
        duration_in_months: "",
      });
      loadCoupons();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "クーポンの作成に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string, couponName: string) => {
    if (!confirm(`クーポン「${couponName || couponId}」を削除しますか？\n\n※ 使用済みのクーポンは削除できません。`)) {
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("ログインが必要です");
      }

      const { data, error } = await supabase.functions.invoke("delete-coupon", {
        body: { couponId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("削除完了", {
        description: `クーポン「${couponName || couponId}」を削除しました`,
      });

      loadCoupons();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message || "クーポンの削除に失敗しました。使用済みのクーポンは削除できません。",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    // JPYは最小単位が「円」なので100で割らない。USD、EUR等は「セント」なので100で割る
    const actualAmount = currency.toLowerCase() === 'jpy' ? amount : amount / 100;
    const formatted = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(actualAmount);
    return formatted;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light">プラン・クーポン管理</h2>
      
      <Tabs defaultValue="plans" className="w-full">
        <TabsList>
          <TabsTrigger value="plans">プラン管理</TabsTrigger>
          <TabsTrigger value="coupons">クーポン管理</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
        <div className="flex justify-between items-center">
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setEditingProduct(null);
            setFormData({
              name: "",
              description: "",
              priceAmount: "",
              currency: "jpy",
              interval: "month",
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新規プラン作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "プラン編集" : "新規プラン作成"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">プラン名</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: プレミアムプラン"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">説明</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="プランの説明"
                  rows={3}
                />
              </div>
              {!editingProduct && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">価格（円）</label>
                      <Input
                        type="number"
                        value={formData.priceAmount}
                        onChange={(e) => setFormData({ ...formData, priceAmount: e.target.value })}
                        placeholder="1000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">通貨</label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jpy">JPY (¥)</SelectItem>
                          <SelectItem value="usd">USD ($)</SelectItem>
                          <SelectItem value="eur">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">請求サイクル</label>
                    <Select value={formData.interval} onValueChange={(value: any) => setFormData({ ...formData, interval: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">一回払い</SelectItem>
                        <SelectItem value="month">月額</SelectItem>
                        <SelectItem value="year">年額</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "処理中..." : editingProduct ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">プランがまだありません</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className={!product.active ? "opacity-50" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    {product.description && (
                      <CardDescription className="mt-2">{product.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditProduct(product)}
                      disabled={loading}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchiveProduct(product.id)}
                      disabled={loading || !product.active}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">価格情報:</div>
                  {product.prices.length === 0 ? (
                    <div className="text-sm text-muted-foreground">価格が設定されていません</div>
                  ) : (
                    product.prices.map((price) => (
                      <div key={price.id} className="flex justify-between items-center border-t pt-2">
                        <div>
                          <div className="font-medium">
                            {formatPrice(price.unit_amount, price.currency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {price.recurring
                              ? price.recurring.interval === "month"
                                ? "月額"
                                : "年額"
                              : "一回払い"}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Price ID: {price.id.substring(0, 12)}...
                        </div>
                      </div>
                    ))
                  )}
                  <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
                    Product ID: {product.id}
                  </div>
                  {!product.active && (
                    <div className="text-sm text-destructive">アーカイブ済み</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </TabsContent>

      <TabsContent value="coupons" className="space-y-6">
        <div className="flex justify-between items-center">
          <div></div>
          <Button onClick={() => setShowCreateCouponDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新規クーポン作成
          </Button>
        </div>
        
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">クーポンがまだありません</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <Card key={coupon.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        {coupon.name || coupon.id}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        コード: <code className="bg-muted px-2 py-1 rounded">{coupon.id}</code>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCoupon(coupon)}
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.name || "")}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">割引:</span>
                      <span className="font-medium">
                        {coupon.percent_off
                          ? `${coupon.percent_off}% OFF`
                          : coupon.amount_off && coupon.currency
                          ? formatPrice(coupon.amount_off, coupon.currency)
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">期間:</span>
                      <span>
                        {coupon.duration === "once"
                          ? "1回のみ"
                          : coupon.duration === "forever"
                          ? "永続"
                          : `${coupon.duration_in_months}ヶ月`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状態:</span>
                      <span className={coupon.valid ? "text-green-600" : "text-red-600"}>
                        {coupon.valid ? "有効" : "無効"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      </Tabs>

      <Dialog open={showEditCouponDialog} onOpenChange={setShowEditCouponDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クーポン名を変更</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">クーポンコード（変更不可）</label>
              <Input value={editingCoupon?.id || ""} disabled />
            </div>
            <div>
              <label className="block text-sm mb-2">表示名</label>
              <Input
                value={couponFormData.name}
                onChange={(e) => setCouponFormData({ name: e.target.value })}
                placeholder="例: FIRSTMOVE"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditCouponDialog(false)}
              >
                キャンセル
              </Button>
              <Button onClick={handleUpdateCoupon} disabled={loading}>
                {loading ? "更新中..." : "更新"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateCouponDialog} onOpenChange={setShowCreateCouponDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規クーポン作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">クーポンコード（英数字のみ、空欄で自動生成）</label>
              <Input
                value={newCouponFormData.id}
                onChange={(e) => setNewCouponFormData({ ...newCouponFormData, id: e.target.value.toUpperCase() })}
                placeholder="例: FIRSTMOVE"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">表示名</label>
              <Input
                value={newCouponFormData.name}
                onChange={(e) => setNewCouponFormData({ ...newCouponFormData, name: e.target.value })}
                placeholder="例: 1ヶ月無料クーポン"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">割引率（%）</label>
              <Input
                type="number"
                value={newCouponFormData.percent_off}
                onChange={(e) => setNewCouponFormData({ ...newCouponFormData, percent_off: e.target.value })}
                placeholder="例: 100"
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">期間</label>
              <Select
                value={newCouponFormData.duration}
                onValueChange={(value: any) => setNewCouponFormData({ ...newCouponFormData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">1回のみ</SelectItem>
                  <SelectItem value="forever">永続</SelectItem>
                  <SelectItem value="repeating">指定期間</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCouponFormData.duration === "repeating" && (
              <div>
                <label className="block text-sm mb-2">適用期間（ヶ月）</label>
                <Input
                  type="number"
                  value={newCouponFormData.duration_in_months}
                  onChange={(e) => setNewCouponFormData({ ...newCouponFormData, duration_in_months: e.target.value })}
                  placeholder="例: 1"
                  min="1"
                  required
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateCouponDialog(false);
                  setNewCouponFormData({
                    id: "",
                    name: "",
                    percent_off: "",
                    duration: "once",
                    duration_in_months: "",
                  });
                }}
              >
                キャンセル
              </Button>
              <Button onClick={handleCreateCoupon} disabled={loading}>
                {loading ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
