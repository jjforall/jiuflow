import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

// jiuflow関連のPrice IDsのみを表示
const JIUFLOW_PRICE_IDS = [
  "price_1SR3ZmDqLakc8NxkNdqL5BtO", // Founder Access - ¥980/month
  "price_1SNQoeDqLakc8NxkEUVTTs3k", // Monthly Plan - ¥2,900/month
  "price_1SNQoqDqLakc8NxkOaQIL8wX", // Annual Plan - ¥29,000/year
];

export const PlansTab = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceAmount: "",
    currency: "jpy",
    interval: "month" as "month" | "year" | "",
  });

  useEffect(() => {
    loadPlans();
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
      toast({
        title: "エラー",
        description: error.message || "プラン一覧の取得に失敗しました",
        variant: "destructive",
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

        toast({
          title: "更新完了",
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

        toast({
          title: "プラン作成完了",
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
      toast({
        title: "エラー",
        description: error.message || "処理に失敗しました",
        variant: "destructive",
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

      toast({
        title: "更新完了",
        description: "プランを更新しました",
      });

      loadPlans();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "プランの更新に失敗しました",
        variant: "destructive",
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

      toast({
        title: "アーカイブ完了",
        description: "プランをアーカイブしました",
      });

      loadPlans();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "プランのアーカイブに失敗しました",
        variant: "destructive",
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light">プラン管理</h2>
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
    </div>
  );
};
