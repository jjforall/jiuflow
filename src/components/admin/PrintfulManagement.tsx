import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, RefreshCw, ExternalLink, Image as ImageIcon, Plus, Upload, RotateCcw, Sparkles, Pencil, Trash2 } from "lucide-react";
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
  is_ignored?: boolean;
  sync_product?: {
    id: number;
    external_id: string;
    name: string;
    variants: number;
    synced: number;
    thumbnail_url: string;
    is_ignored?: boolean;
  };
}

export function PrintfulManagement() {
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);
  
  // Edit product state
  const [editingProduct, setEditingProduct] = useState<PrintfulProduct | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editVariantPrices, setEditVariantPrices] = useState<Record<number, string>>({});
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);
  
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
  
  // Print area info for accurate preview
  const [printAreaInfo, setPrintAreaInfo] = useState<{
    placement: string;
    width: number;
    height: number;
    areaTop: number;  // percentage
    areaLeft: number; // percentage
    areaWidth: number; // percentage
    areaHeight: number; // percentage
  } | null>(null);
  const [loadingPrintArea, setLoadingPrintArea] = useState(false);

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

  const fetchPrintAreaInfo = async (productId: string) => {
    setLoadingPrintArea(true);
    setPrintAreaInfo(null);
    try {
      // Use the generate-printful-mockup function to get printfiles info
      const response = await fetch(
        `https://api.printful.com/mockup-generator/printfiles/${productId}`,
        {
          headers: {
            // Note: This won't work client-side due to CORS, so we'll use default values
          },
        }
      );
      // Since we can't call Printful API directly from client, use sensible defaults
      // The actual positioning will be handled by the mockup generation API
      setPrintAreaInfo({
        placement: "front",
        width: 4050,
        height: 2700,
        areaTop: 15,    // Print area starts at 15% from top
        areaLeft: 20,   // Print area starts at 20% from left  
        areaWidth: 60,  // Print area is 60% of product width
        areaHeight: 50, // Print area is 50% of product height
      });
    } catch (error) {
      console.log("Using default print area settings");
      // Use default values for T-shirt style products
      setPrintAreaInfo({
        placement: "front",
        width: 4050,
        height: 2700,
        areaTop: 15,
        areaLeft: 20,
        areaWidth: 60,
        areaHeight: 50,
      });
    } finally {
      setLoadingPrintArea(false);
    }
  };

  const handleCatalogProductChange = (productId: string) => {
    setSelectedCatalogProduct(productId);
    fetchCatalogVariants(productId);
    fetchPrintAreaInfo(productId);
    setGeneratedMockupUrl(null); // Reset mockup when product changes
    
    // Set default product name based on selected base product
    const selectedProduct = catalogProducts.find(p => p.id.toString() === productId);
    if (selectedProduct) {
      setNewProductName(`jiuFlow ${selectedProduct.title}`);
    }
  };

  const toggleVariant = (variantId: number) => {
    setSelectedVariants(prev => {
      const newSelection = prev.includes(variantId) 
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId];
      
      // Calculate 30% markup on highest base price of selected variants
      if (newSelection.length > 0) {
        const selectedVariantPrices = catalogVariants
          .filter(v => newSelection.includes(v.id))
          .map(v => parseFloat(v.price));
        const maxBasePrice = Math.max(...selectedVariantPrices);
        const markupPrice = Math.ceil(maxBasePrice * 1.3);
        // Ensure never below base price
        const finalPrice = Math.max(markupPrice, maxBasePrice);
        setRetailPrice(finalPrice.toString());
      }
      
      return newSelection;
    });
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
    if (!selectedVariants.length || !logoUrl || !selectedCatalogProduct) {
      toast.error("ベース商品、バリエーション、ロゴを選択してください");
      return;
    }
    
    setGeneratingMockup(true);
    setGeneratedMockupUrl(null);
    try {
      // Use print area info if available, otherwise use defaults
      const areaWidth = printAreaInfo?.areaWidth || 1800;
      const areaHeight = printAreaInfo?.areaHeight || 2400;
      
      const { data, error } = await supabase.functions.invoke("generate-printful-mockup", {
        body: {
          product_id: parseInt(selectedCatalogProduct),
          variant_ids: selectedVariants,
          format: "jpg",
          save_to_storage: true,
          product_name: newProductName || `product_${selectedCatalogProduct}`,
          files: [{
            placement: "front",
            image_url: logoUrl,
            position: {
              area_width: areaWidth,
              area_height: areaHeight,
              width: Math.round(areaWidth * (logoSize / 100)),
              height: Math.round(areaWidth * (logoSize / 100)),
              top: Math.round(areaHeight * (logoPositionY / 100)),
              left: Math.round(areaWidth * (logoPositionX / 100)),
            }
          }]
        }
      });

      if (error) throw error;
      
      // Prefer saved storage URL over original Printful URL
      if (data?.saved_mockups?.[0]?.storage_url) {
        setGeneratedMockupUrl(data.saved_mockups[0].storage_url);
        toast.success("モックアップを生成・保存しました");
      } else if (data?.mockups?.[0]?.mockup_url) {
        setGeneratedMockupUrl(data.mockups[0].mockup_url);
        toast.success("モックアップを生成しました（保存に失敗）");
      } else if (data?.task_key) {
        toast.info("モックアップ生成中です。しばらくお待ちください");
      } else {
        toast.warning("モックアップの取得に失敗しました");
      }
    } catch (error) {
      console.error("Mockup error:", error);
      toast.error("モックアップ生成に失敗しました");
    } finally {
      setGeneratingMockup(false);
    }
  };

  const handleEditProduct = (product: PrintfulProduct) => {
    setEditingProduct(product);
    setEditProductName(product.name);
    const prices: Record<number, string> = {};
    product.variants?.forEach(v => {
      prices[v.id] = v.retail_price || "";
    });
    setEditVariantPrices(prices);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    setUpdating(true);
    try {
      const variantsToUpdate = Object.entries(editVariantPrices)
        .filter(([_, price]) => price)
        .map(([id, price]) => ({
          id: parseInt(id),
          retail_price: price,
        }));

      const { error } = await supabase.functions.invoke("update-printful-product", {
        body: {
          product_id: editingProduct.id,
          sync_product: editProductName !== editingProduct.name ? { name: editProductName } : undefined,
          sync_variants: variantsToUpdate.length > 0 ? variantsToUpdate : undefined,
        },
      });

      if (error) throw error;

      toast.success("商品を更新しました");
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("商品の更新に失敗しました");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("この商品を削除してもよろしいですか？")) return;
    
    setDeleting(productId);
    try {
      const { error } = await supabase.functions.invoke("delete-printful-product", {
        body: { product_id: productId },
      });

      if (error) throw error;

      toast.success("商品を削除しました");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("商品の削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (product: PrintfulProduct) => {
    const newIsIgnored = !product.is_ignored;
    setTogglingStatus(product.id);
    try {
      const { error } = await supabase.functions.invoke("update-printful-product", {
        body: {
          product_id: product.id,
          is_ignored: newIsIgnored,
        },
      });

      if (error) throw error;

      toast.success(newIsIgnored ? "商品を非公開にしました" : "商品を販売中にしました");
      fetchProducts();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("ステータスの更新に失敗しました");
    } finally {
      setTogglingStatus(null);
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
                  <TableHead className="w-24">画像</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead className="w-24">バリエーション</TableHead>
                  <TableHead className="w-32">ステータス</TableHead>
                  <TableHead className="w-40">操作</TableHead>
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
                          className="h-20 w-20 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.variants?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {togglingStatus === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Switch
                              checked={!product.is_ignored}
                              onCheckedChange={() => handleToggleStatus(product)}
                              disabled={togglingStatus !== null}
                            />
                            <Badge variant={product.is_ignored ? "secondary" : "default"}>
                              {product.is_ignored ? "非公開" : "販売中"}
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          詳細
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deleting === product.id}
                        >
                          {deleting === product.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
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
            {/* Base Product Selection */}
            <div className="space-y-2">
              <Label>1. ベース商品を選択</Label>
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
                <Label>2. バリエーションを選択</Label>
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

            {/* Product Name - shown after base product and variants are selected */}
            {selectedCatalogProduct && selectedVariants.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="productName">3. 商品名を編集</Label>
                <Input
                  id="productName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="例: jiuFlow Tシャツ"
                />
                <p className="text-xs text-muted-foreground">
                  ベース商品名をもとに自動設定されています。必要に応じて編集してください。
                </p>
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
                  
                  <div className="flex items-center justify-center bg-white rounded-lg p-4 border min-h-[280px] overflow-hidden">
                    {(() => {
                      const selectedProduct = catalogProducts.find(
                        p => p.id.toString() === selectedCatalogProduct
                      );
                      if (selectedProduct?.image) {
                        return (
                          <div className="relative w-full h-[260px]">
                            {/* Base product image */}
                            <img
                              src={selectedProduct.image}
                              alt={selectedProduct.title}
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                            {/* Print area indicator */}
                            {printAreaInfo && (
                              <div 
                                className="absolute border-2 border-dashed border-blue-400/50 bg-blue-100/20 pointer-events-none"
                                style={{
                                  top: `${printAreaInfo.areaTop}%`,
                                  left: `${printAreaInfo.areaLeft}%`,
                                  width: `${printAreaInfo.areaWidth}%`,
                                  height: `${printAreaInfo.areaHeight}%`,
                                }}
                              >
                                <span className="absolute -top-5 left-0 text-[10px] text-blue-500 bg-white px-1 rounded">
                                  プリント領域
                                </span>
                              </div>
                            )}
                            {/* Logo overlay - positioned within print area */}
                            {logoUrl && printAreaInfo && (
                              <img
                                src={logoUrl}
                                alt="Logo overlay"
                                className="absolute object-contain drop-shadow-lg pointer-events-none"
                                style={{
                                  // Position logo within the print area
                                  width: `${(logoSize / 100) * printAreaInfo.areaWidth}%`,
                                  maxWidth: `${printAreaInfo.areaWidth}%`,
                                  left: `${printAreaInfo.areaLeft + (logoPositionX / 100) * printAreaInfo.areaWidth}%`,
                                  top: `${printAreaInfo.areaTop + (logoPositionY / 100) * printAreaInfo.areaHeight}%`,
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
                  
                  {/* Hint about preview vs actual mockup */}
                  {selectedCatalogProduct && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      ※ 青い点線はプリント領域の目安です。正確な仕上がりは「モックアップ生成」ボタンで確認できます。
                    </p>
                  )}
                  
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
                  
                  {/* Mockup Generation Button */}
                  {logoUrl && selectedVariants.length > 0 && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={handleGenerateMockup}
                        disabled={generatingMockup}
                      >
                        {generatingMockup ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            モックアップ生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Printful APIでモックアップ生成
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Generated Mockup Display */}
                  {generatedMockupUrl && (
                    <div className="mt-4 p-3 border rounded-lg bg-background">
                      <p className="text-sm font-medium mb-2 text-foreground">APIモックアップ:</p>
                      <img
                        src={generatedMockupUrl}
                        alt="Generated mockup"
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    {logoUrl ? "※ APIモックアップを生成すると実際の印刷イメージを確認できます" : "ロゴ画像を追加するとプレビューが表示されます"}
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

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>商品を編集</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="editProductName">商品名</Label>
                <Input
                  id="editProductName"
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                />
              </div>

              {/* Variant Prices */}
              {editingProduct.variants && editingProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <Label>バリエーション価格</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                    {editingProduct.variants.map((variant) => (
                      <div key={variant.id} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">{variant.name}</span>
                        <Input
                          type="number"
                          className="w-32"
                          value={editVariantPrices[variant.id] || ""}
                          onChange={(e) => setEditVariantPrices(prev => ({
                            ...prev,
                            [variant.id]: e.target.value,
                          }))}
                          placeholder="価格"
                        />
                        <span className="text-sm text-muted-foreground">円</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdateProduct} disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    "更新"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
