import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Package, RefreshCw, ExternalLink, Image as ImageIcon, Plus, Upload, RotateCcw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import jiuflowLogoBlack from "@/assets/jiuflow-logo-black.png";

interface CatalogProduct {
  id: number;
  title: string;
  type_name: string;
  image: string;
}

interface CatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  price: string;
  in_stock: boolean;
  image?: string;
}

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
  
  // Create product state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogVariants, setCatalogVariants] = useState<CatalogVariant[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newProductName, setNewProductName] = useState("");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<string>("");
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [retailPrice, setRetailPrice] = useState("3500");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedLogos, setUploadedLogos] = useState<{ name: string; url: string }[]>([]);
  
  // Logo adjustment state
  const [logoSize, setLogoSize] = useState(50); // percentage
  const [logoPositionX, setLogoPositionX] = useState(50); // percentage from left
  const [logoPositionY, setLogoPositionY] = useState(50); // percentage from top
  
  // Mockup generation state
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [generatedMockupUrl, setGeneratedMockupUrl] = useState<string | null>(null);

  // Fetch uploaded logos on mount
  useEffect(() => {
    fetchUploadedLogos();
  }, []);

  const fetchUploadedLogos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("product-logos")
        .list("", { limit: 100 });
      
      if (error) throw error;
      
      if (data) {
        const logos = data
          .filter(file => file.name !== ".emptyFolderPlaceholder")
          .map(file => ({
            name: file.name,
            url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-logos/${file.name}`,
          }));
        setUploadedLogos(logos);
      }
    } catch (error) {
      console.error("Error fetching logos:", error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルのみアップロードできます");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-logos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-logos/${fileName}`;
      setLogoUrl(publicUrl);
      setUploadedLogos(prev => [...prev, { name: fileName, url: publicUrl }]);
      toast.success("ロゴをアップロードしました");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

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

  const fetchCatalogProducts = async () => {
    setLoadingCatalog(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-printful-catalog");
      if (error) throw error;
      if (data?.products) {
        setCatalogProducts(data.products);
      }
    } catch (error) {
      console.error("Error fetching catalog:", error);
      toast.error("カタログの取得に失敗しました");
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchCatalogVariants = async (productId: string) => {
    setLoadingVariants(true);
    setSelectedVariants([]);
    try {
      const { data, error } = await supabase.functions.invoke("get-printful-catalog", {
        body: null,
      });
      
      // Fetch variants directly with query param
      const response = await supabase.functions.invoke(`get-printful-catalog?product_id=${productId}`);
      if (response.error) throw response.error;
      if (response.data?.variants) {
        setCatalogVariants(response.data.variants);
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("バリエーションの取得に失敗しました");
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleOpenCreateDialog = async () => {
    setShowCreateDialog(true);
    if (catalogProducts.length === 0) {
      await fetchCatalogProducts();
    }
  };

  const handleCatalogProductChange = (productId: string) => {
    setSelectedCatalogProduct(productId);
    fetchCatalogVariants(productId);
  };

  const toggleVariant = (variantId: number) => {
    setSelectedVariants(prev => 
      prev.includes(variantId) 
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleCreateProduct = async () => {
    if (!newProductName || !selectedCatalogProduct || selectedVariants.length === 0) {
      toast.error("商品名、ベース商品、バリエーションを選択してください");
      return;
    }

    if (!logoUrl) {
      toast.error("ロゴURLを入力してください");
      return;
    }

    setCreating(true);
    try {
      const syncVariants = selectedVariants.map(variantId => ({
        variant_id: variantId,
        retail_price: retailPrice,
        files: [
          {
            url: logoUrl,
            type: "default",
          }
        ]
      }));

      const { data, error } = await supabase.functions.invoke("create-printful-product", {
        body: {
          sync_product: {
            name: newProductName,
          },
          sync_variants: syncVariants,
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("商品を作成しました");
      setShowCreateDialog(false);
      setNewProductName("");
      setSelectedCatalogProduct("");
      setSelectedVariants([]);
      setLogoUrl("");
      fetchProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("商品の作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMockup = async () => {
    if (!selectedVariants.length || !logoUrl) {
      toast.error("バリエーションとロゴを選択してください");
      return;
    }
    
    setGeneratingMockup(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-printful-mockup", {
        body: {
          variant_ids: selectedVariants,
          format: "jpg",
          files: [{
            placement: "default",
            image_url: logoUrl,
            position: {
              area_width: 1800,
              area_height: 2400,
              width: Math.round(1800 * (logoSize / 100)),
              height: Math.round(1800 * (logoSize / 100)),
              top: Math.round(2400 * (logoPositionY / 100)),
              left: Math.round(1800 * (logoPositionX / 100)),
            }
          }]
        }
      });

      if (error) throw error;
      
      if (data?.mockups?.[0]?.mockup_url) {
        setGeneratedMockupUrl(data.mockups[0].mockup_url);
        toast.success("モックアップを生成しました");
      } else {
        toast.info("モックアップ生成中です。しばらくお待ちください");
      }
    } catch (error) {
      console.error("Mockup error:", error);
      toast.error("モックアップ生成に失敗しました");
    } finally {
      setGeneratingMockup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Printful 商品管理</h2>
          <p className="text-muted-foreground">Printfulの商品を管理します</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            商品を作成
          </Button>
          <Button variant="outline" onClick={fetchProducts} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            更新
          </Button>
        </div>
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
              <h3 className="font-medium">Printful Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                詳細設定はPrintfulダッシュボードで管理できます
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

      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規商品を作成</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="productName">商品名</Label>
              <Input
                id="productName"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="例: jiuFlow Tシャツ"
              />
            </div>

            {/* Base Product Selection */}
            <div className="space-y-2">
              <Label>ベース商品</Label>
              {loadingCatalog ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  カタログを読み込み中...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                  {catalogProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleCatalogProductChange(product.id.toString())}
                      className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                        selectedCatalogProduct === product.id.toString()
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-16 h-16 object-contain mb-1"
                      />
                      <span className="text-xs text-center line-clamp-2">{product.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variants Selection */}
            {selectedCatalogProduct && (
              <div className="space-y-2">
                <Label>バリエーション選択</Label>
                {loadingVariants ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    バリエーションを読み込み中...
                  </div>
                ) : catalogVariants.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                    {catalogVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => toggleVariant(variant.id)}
                        disabled={!variant.in_stock}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                          selectedVariants.includes(variant.id)
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : variant.in_stock 
                              ? "border-border hover:border-primary/50"
                              : "border-border opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {variant.image ? (
                          <img
                            src={variant.image}
                            alt={variant.name}
                            className="w-14 h-14 object-contain mb-1"
                          />
                        ) : (
                          <div 
                            className="w-14 h-14 rounded mb-1 flex items-center justify-center border"
                            style={{ backgroundColor: variant.color_code || '#f0f0f0' }}
                          >
                            <span className="text-[10px] text-center px-1">{variant.size}</span>
                          </div>
                        )}
                        <span className="text-xs text-center line-clamp-1">{variant.size}</span>
                        <span className="text-[10px] text-muted-foreground">{variant.color}</span>
                        {!variant.in_stock && (
                          <span className="text-[10px] text-destructive">在庫切れ</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">バリエーションがありません</p>
                )}
                {selectedVariants.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedVariants.length}個のバリエーションを選択中
                  </p>
                )}
              </div>
            )}

            {/* Logo URL */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">ロゴ画像</Label>
              <div className="flex gap-2">
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              
              {/* Uploaded logos */}
              {uploadedLogos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">アップロード済みロゴ:</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedLogos.map((logo) => (
                      <button
                        key={logo.name}
                        type="button"
                        onClick={() => setLogoUrl(logo.url)}
                        className={`relative p-1 border rounded hover:border-primary transition-colors ${
                          logoUrl === logo.url ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <img
                          src={logo.url}
                          alt={logo.name}
                          className="h-12 w-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mockup Preview */}
              {(logoUrl || selectedCatalogProduct) && (
                <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">商品プレビュー</p>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLogoSize(50);
                          setLogoPositionX(50);
                          setLogoPositionY(50);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        リセット
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center bg-white rounded-lg p-4 border min-h-[220px] overflow-hidden">
                    {(() => {
                      const selectedProduct = catalogProducts.find(
                        p => p.id.toString() === selectedCatalogProduct
                      );
                      if (selectedProduct?.image) {
                        return (
                          <div className="relative w-full h-[200px]">
                            {/* Base product image */}
                            <img
                              src={selectedProduct.image}
                              alt={selectedProduct.title}
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                            {/* Logo overlay */}
                            {logoUrl && (
                              <img
                                src={logoUrl}
                                alt="Logo overlay"
                                className="absolute object-contain drop-shadow-lg pointer-events-none"
                                style={{
                                  width: `${logoSize}%`,
                                  maxWidth: `${logoSize}%`,
                                  left: `${logoPositionX}%`,
                                  top: `${logoPositionY}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        );
                      } else if (logoUrl) {
                        return (
                          <img
                            src={logoUrl}
                            alt="Selected logo"
                            className="max-h-40 max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        );
                      }
                      return (
                        <p className="text-sm text-muted-foreground">
                          ベース商品を選択してください
                        </p>
                      );
                    })()}
                  </div>
                  
                  {/* Logo adjustment controls */}
                  {logoUrl && selectedCatalogProduct && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">サイズ</Label>
                          <span className="text-xs text-muted-foreground">{logoSize}%</span>
                        </div>
                        <Slider
                          value={[logoSize]}
                          onValueChange={([value]) => setLogoSize(value)}
                          min={10}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">横位置</Label>
                            <span className="text-xs text-muted-foreground">{logoPositionX}%</span>
                          </div>
                          <Slider
                            value={[logoPositionX]}
                            onValueChange={([value]) => setLogoPositionX(value)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">縦位置</Label>
                            <span className="text-xs text-muted-foreground">{logoPositionY}%</span>
                          </div>
                          <Slider
                            value={[logoPositionY]}
                            onValueChange={([value]) => setLogoPositionY(value)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    {logoUrl ? "※ 実際の印刷位置とは異なる場合があります" : "ロゴ画像を追加するとプレビューが表示されます"}
                  </p>
                </div>
              )}
            </div>

            {/* Retail Price */}
            <div className="space-y-2">
              <Label htmlFor="retailPrice">販売価格 (円)</Label>
              <Input
                id="retailPrice"
                type="number"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="3500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={handleCreateProduct}
                disabled={creating || !newProductName || !selectedCatalogProduct || selectedVariants.length === 0}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "作成"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
