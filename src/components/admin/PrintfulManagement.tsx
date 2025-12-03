import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Package, RefreshCw, ExternalLink, Image as ImageIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import jiuflowLogoBlack from "@/assets/jiuflow-logo-black.png";

interface PrintfulVariant {
  id: number;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  sku: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
}

interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  thumbnail_url: string;
  variants: PrintfulVariant[];
  sync_product?: {
    id: number;
    external_id: string;
    name: string;
    variants: number;
    synced: number;
    thumbnail_url: string;
  };
}

export function PrintfulManagement() {
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-printful-products");
      
      if (error) {
        throw error;
      }

      if (data?.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("商品の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string, currency: string) => {
    const num = parseFloat(price);
    if (currency === "JPY") {
      return `¥${num.toLocaleString()}`;
    }
    return `${currency} ${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Printful 商品管理</h2>
          <p className="text-muted-foreground">Printfulの商品を管理します</p>
        </div>
        <Button onClick={fetchProducts} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          更新
        </Button>
      </div>

      {/* Logo Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            利用可能なロゴ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="bg-background border rounded-lg p-4">
              <img 
                src={jiuflowLogoBlack} 
                alt="jiuFlow Logo (Black)" 
                className="h-16 object-contain"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">黒背景バージョン</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            商品一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>商品がありません</p>
              <p className="text-sm mt-2">Printfulで商品を追加してください</p>
              <a 
                href="https://www.printful.com/dashboard/store" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary mt-4 hover:underline"
              >
                Printful Dashboard
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>画像</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead>バリエーション数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.thumbnail_url ? (
                        <img 
                          src={product.thumbnail_url} 
                          alt={product.name}
                          className="h-16 w-16 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.variants?.length || 0}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedProduct(product)}
                      >
                        詳細
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Printful Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Printful で商品を追加</h3>
              <p className="text-sm text-muted-foreground">
                新しい商品はPrintfulダッシュボードから追加できます
              </p>
            </div>
            <a 
              href="https://www.printful.com/dashboard/store" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Printful を開く
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.thumbnail_url && (
                <img 
                  src={selectedProduct.thumbnail_url} 
                  alt={selectedProduct.name}
                  className="w-full max-h-64 object-contain rounded"
                />
              )}
              
              <div>
                <h4 className="font-medium mb-2">バリエーション</h4>
                {selectedProduct.variants?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名前</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>価格</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProduct.variants.map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell>{variant.name}</TableCell>
                          <TableCell className="font-mono text-sm">{variant.sku || "-"}</TableCell>
                          <TableCell>
                            {variant.retail_price 
                              ? formatPrice(variant.retail_price, variant.currency || "JPY")
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">バリエーションがありません</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
