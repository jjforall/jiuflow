import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, RefreshCw, ExternalLink, Image as ImageIcon, Plus, Upload, RotateCcw, Sparkles, Pencil, Trash2, ImagePlus, Save } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadedLogos, setUploadedLogos] = useState<{ name: string; url: string }[]>([]);
  
  // Per-placement design configuration
  interface PlacementConfig {
    logoUrl: string;
    logoSize: number;
    logoPositionX: number;
    logoPositionY: number;
    enabled: boolean;
  }
  const [placementConfigs, setPlacementConfigs] = useState<Record<string, PlacementConfig>>({});
  const [activePlacement, setActivePlacement] = useState<string>("front");
  
  // Helper to get current placement config
  const getPlacementConfig = (placement: string): PlacementConfig => {
    return placementConfigs[placement] || {
      logoUrl: "",
      logoSize: 50,
      logoPositionX: 50,
      logoPositionY: 50,
      enabled: false,
    };
  };
  
  // Helper to update placement config
  const updatePlacementConfig = (placement: string, updates: Partial<PlacementConfig>) => {
    setPlacementConfigs(prev => ({
      ...prev,
      [placement]: {
        ...getPlacementConfig(placement),
        ...updates,
      }
    }));
  };
  
  // Get enabled placements with logos
  const getEnabledPlacements = () => {
    return Object.entries(placementConfigs)
      .filter(([_, config]) => config.enabled && config.logoUrl)
      .map(([placement, config]) => ({ placement, ...config }));
  };
  
  // Mockup generation state
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState<string | null>(null);
  const [uploadingNewLogo, setUploadingNewLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [generatedMockupUrl, setGeneratedMockupUrl] = useState<string | null>(null);
  const [savingMockup, setSavingMockup] = useState(false);
  
  // Saved mockups state
  const [savedMockups, setSavedMockups] = useState<{ name: string; url: string; created: string }[]>([]);
  const [loadingMockups, setLoadingMockups] = useState(false);
  const [deletingMockup, setDeletingMockup] = useState<string | null>(null);
  
  // Set thumbnail state
  const [settingThumbnail, setSettingThumbnail] = useState<string | null>(null);
  const [showThumbnailDialog, setShowThumbnailDialog] = useState(false);
  const [selectedMockupForThumbnail, setSelectedMockupForThumbnail] = useState<string | null>(null);
  
  // Placement selection state
  const [availablePlacements, setAvailablePlacements] = useState<Record<string, string>>({});
  
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

  // Fetch uploaded logos and mockups on mount
  useEffect(() => {
    fetchUploadedLogos();
    fetchSavedMockups();
  }, []);

  const fetchUploadedLogos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("product-logos")
        .list("", { limit: 100 });
      
      if (error) throw error;
      
      if (data) {
        const logos = data
          .filter(file => file.name !== ".emptyFolderPlaceholder" && file.name !== "mockups")
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

  const fetchSavedMockups = async () => {
    setLoadingMockups(true);
    try {
      const { data, error } = await supabase.storage
        .from("product-logos")
        .list("mockups", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      
      if (error) throw error;
      
      if (data) {
        const mockups = data
          .filter(file => file.name !== ".emptyFolderPlaceholder")
          .map(file => ({
            name: file.name,
            url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-logos/mockups/${file.name}`,
            created: file.created_at || "",
          }));
        setSavedMockups(mockups);
      }
    } catch (error) {
      console.error("Error fetching mockups:", error);
    } finally {
      setLoadingMockups(false);
    }
  };

  const handleDeleteMockup = async (fileName: string) => {
    setDeletingMockup(fileName);
    try {
      const { error } = await supabase.storage
        .from("product-logos")
        .remove([`mockups/${fileName}`]);
      
      if (error) throw error;
      
      setSavedMockups(prev => prev.filter(m => m.name !== fileName));
      toast.success("モックアップを削除しました");
    } catch (error) {
      console.error("Error deleting mockup:", error);
      toast.error("削除に失敗しました");
    } finally {
      setDeletingMockup(null);
    }
  };

  const handleSetThumbnail = async (productId: number) => {
    if (!selectedMockupForThumbnail) return;
    
    setSettingThumbnail(selectedMockupForThumbnail);
    try {
      const { error } = await supabase.functions.invoke("update-printful-product", {
        body: {
          product_id: productId,
          sync_product: { thumbnail: selectedMockupForThumbnail },
        },
      });

      if (error) throw error;

      toast.success("サムネイルを設定しました");
      setShowThumbnailDialog(false);
      setSelectedMockupForThumbnail(null);
      fetchProducts();
    } catch (error) {
      console.error("Error setting thumbnail:", error);
      toast.error("サムネイルの設定に失敗しました");
    } finally {
      setSettingThumbnail(null);
    }
  };

  const openThumbnailDialog = (mockupUrl: string) => {
    setSelectedMockupForThumbnail(mockupUrl);
    setShowThumbnailDialog(true);
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
      // Set logo for active placement
      updatePlacementConfig(activePlacement, { logoUrl: publicUrl, enabled: true });
      setUploadedLogos(prev => [...prev, { name: fileName, url: publicUrl }]);
      toast.success("イメージをアップロードしました");
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
      
      // Set available placements from printfiles data
      if (response.data?.printfiles?.available_placements) {
        setAvailablePlacements(response.data.printfiles.available_placements);
        const placementKeys = Object.keys(response.data.printfiles.available_placements);
        // Default to front if available, otherwise first placement
        if (placementKeys.includes("front")) {
          setActivePlacement("front");
        } else if (placementKeys.length > 0) {
          setActivePlacement(placementKeys[0]);
        }
        // Reset placement configs
        setPlacementConfigs({});
      } else {
        setAvailablePlacements({});
        setActivePlacement("front");
        setPlacementConfigs({});
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
      // Since we can't call Printful API directly from client, use sensible defaults
      // These values are calibrated for standard T-shirt product images
      // The actual positioning will be handled by the mockup generation API
      setPrintAreaInfo({
        placement: "front",
        width: 4050,
        height: 2700,
        areaTop: 28,    // Print area starts at 28% from top (below collar)
        areaLeft: 28,   // Print area starts at 28% from left (centered on chest)
        areaWidth: 44,  // Print area is 44% of product width
        areaHeight: 38, // Print area is 38% of product height
      });
    } catch (error) {
      console.log("Using default print area settings");
      // Use default values for T-shirt style products
      setPrintAreaInfo({
        placement: "front",
        width: 4050,
        height: 2700,
        areaTop: 28,
        areaLeft: 28,
        areaWidth: 44,
        areaHeight: 38,
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

    const enabledPlacements = getEnabledPlacements();
    if (enabledPlacements.length === 0) {
      toast.error("少なくとも1つの印刷位置にイメージを設定してください");
      return;
    }

    setCreating(true);
    try {
      // Create files array for all enabled placements
      const files = enabledPlacements.map(p => ({
        url: p.logoUrl,
        type: p.placement,
      }));

      const syncVariants = selectedVariants.map(variantId => ({
        variant_id: variantId,
        retail_price: retailPrice,
        files,
      }));

      // Use generated mockup as thumbnail if available
      const thumbnailUrl = generatedMockupUrl || undefined;

      const { data, error } = await supabase.functions.invoke("create-printful-product", {
        body: {
          sync_product: {
            name: newProductName,
            thumbnail: thumbnailUrl,
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
      setPlacementConfigs({});
      fetchProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("商品の作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMockup = async () => {
    const activeConfig = getPlacementConfig(activePlacement);
    if (!selectedVariants.length || !activeConfig.logoUrl || !selectedCatalogProduct) {
      toast.error("ベース商品、バリエーション、イメージを選択してください");
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
          save_to_storage: false,
          product_name: newProductName || `product_${selectedCatalogProduct}`,
          files: [{
            placement: activePlacement,
            image_url: activeConfig.logoUrl,
            position: {
              area_width: areaWidth,
              area_height: areaHeight,
              width: Math.round(areaWidth * (activeConfig.logoSize / 100)),
              height: Math.round(areaWidth * (activeConfig.logoSize / 100)),
              top: Math.round(areaHeight * (activeConfig.logoPositionY / 100)),
              left: Math.round(areaWidth * (activeConfig.logoPositionX / 100)),
            }
          }]
        }
      });

      if (error) throw error;
      
      // Show the mockup URL
      if (data?.saved_mockups?.[0]?.storage_url) {
        setGeneratedMockupUrl(data.saved_mockups[0].storage_url);
        toast.success("モックアップを生成・保存しました");
        fetchSavedMockups();
      } else if (data?.mockups?.[0]?.mockup_url) {
        setGeneratedMockupUrl(data.mockups[0].mockup_url);
        toast.success("モックアップを生成しました");
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

  const handleSaveMockup = async () => {
    if (!generatedMockupUrl) return;
    
    setSavingMockup(true);
    try {
      // Fetch the image
      const response = await fetch(generatedMockupUrl);
      const blob = await response.blob();
      
      // Generate filename
      const timestamp = Date.now();
      const productName = newProductName || `product_${selectedCatalogProduct}`;
      const fileName = `mockups/${productName.replace(/\s+/g, '_')}_${timestamp}.jpg`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('product-logos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });
      
      if (uploadError) throw uploadError;
      
      toast.success("モックアップを保存しました");
      fetchSavedMockups();
    } catch (error) {
      console.error("Error saving mockup:", error);
      toast.error("モックアップの保存に失敗しました");
    } finally {
      setSavingMockup(false);
    }
  };

  const handleDeleteLogo = async (logoName: string) => {
    if (!confirm('このイメージを削除しますか？')) return;
    
    setDeletingLogo(logoName);
    try {
      const { error } = await supabase.storage
        .from('product-logos')
        .remove([logoName]);
      
      if (error) throw error;
      
      toast.success("イメージを削除しました");
      fetchUploadedLogos();
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast.error("イメージの削除に失敗しました");
    } finally {
      setDeletingLogo(null);
    }
  };

  const handleUploadNewLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingNewLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
        });
      
      if (uploadError) throw uploadError;
      
      toast.success("イメージをアップロードしました");
      fetchUploadedLogos();
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("イメージのアップロードに失敗しました");
    } finally {
      setUploadingNewLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
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

      {/* Uploaded Logos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              保存済みのイメージ
            </CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleUploadNewLogo}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingNewLogo}
              >
                {uploadingNewLogo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                イメージ追加
              </Button>
              <Button variant="outline" size="sm" onClick={fetchUploadedLogos}>
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {uploadedLogos.filter(l => !l.name.startsWith('mockups/')).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>保存済みのイメージはありません</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingNewLogo}
              >
                {uploadingNewLogo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                イメージをアップロード
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {uploadedLogos.filter(l => !l.name.startsWith('mockups/')).map((logo) => (
                <div key={logo.name} className="relative group border rounded-lg overflow-hidden bg-muted/30">
                  <img 
                    src={logo.url} 
                    alt={logo.name}
                    className="w-full aspect-square object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-white text-xs px-2 text-center truncate max-w-full">
                      {logo.name}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => {
                          // Set the logo for the default/first placement
                          const firstPlacement = Object.keys(availablePlacements)[0] || "front";
                          updatePlacementConfig(firstPlacement, { logoUrl: logo.url, enabled: true });
                          setActivePlacement(firstPlacement);
                          handleOpenCreateDialog();
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        商品作成
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteLogo(logo.name)}
                        disabled={deletingLogo === logo.name}
                      >
                        {deletingLogo === logo.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Saved Mockups Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              保存済みモックアップ
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSavedMockups} disabled={loadingMockups}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingMockups ? "animate-spin" : ""}`} />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMockups ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : savedMockups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>保存済みモックアップはありません</p>
              <p className="text-sm">商品作成時にモックアップを生成すると自動で保存されます</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedMockups.map((mockup) => (
                <div key={mockup.name} className="relative group border rounded-lg overflow-hidden">
                  <img 
                    src={mockup.url} 
                    alt={mockup.name}
                    className="w-full aspect-square object-cover"
                  />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-white text-xs px-2 text-center truncate max-w-full">
                      {mockup.name.replace(/^mockups\//, "")}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => openThumbnailDialog(mockup.url)}
                        title="商品サムネイルに設定"
                      >
                        <ImagePlus className="h-3 w-3" />
                      </Button>
                      <a href={mockup.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="secondary">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteMockup(mockup.name)}
                        disabled={deletingMockup === mockup.name}
                      >
                        {deletingMockup === mockup.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>新規商品を作成</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 w-full overflow-hidden">
            {/* Step 1: Base Product Selection */}
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

            {/* Step 2: Variants Selection */}
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

            {/* Step 3: Placement & Design Configuration */}
            {selectedCatalogProduct && selectedVariants.length > 0 && Object.keys(availablePlacements).length > 0 && (
              <div className="space-y-4">
                <Label>3. 印刷位置とデザインを設定</Label>
                
                {/* Placement tabs */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(availablePlacements).map(([key, label]) => {
                    const config = getPlacementConfig(key);
                    const isActive = activePlacement === key;
                    const hasLogo = config.enabled && config.logoUrl;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivePlacement(key)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                          isActive
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5 font-medium"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span>{label}</span>
                        {hasLogo && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            設定済
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active placement design settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {availablePlacements[activePlacement]} の設定
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">有効</span>
                      <Switch
                        checked={getPlacementConfig(activePlacement).enabled}
                        onCheckedChange={(checked) => updatePlacementConfig(activePlacement, { enabled: checked })}
                      />
                    </div>
                  </div>

                  {getPlacementConfig(activePlacement).enabled && (
                    <>
                      {/* Logo selection for this placement */}
                      <div className="space-y-2">
                        <Label className="text-xs">イメージを選択</Label>
                        {uploadedLogos.filter(l => !l.name.startsWith('mockups/')).length > 0 ? (
                          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                            {uploadedLogos.filter(l => !l.name.startsWith('mockups/')).map((logo) => (
                              <button
                                key={logo.name}
                                type="button"
                                onClick={() => updatePlacementConfig(activePlacement, { logoUrl: logo.url })}
                                className={`relative p-1 rounded border transition-all ${
                                  getPlacementConfig(activePlacement).logoUrl === logo.url 
                                    ? "border-primary ring-2 ring-primary/20" 
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <img
                                  src={logo.url}
                                  alt={logo.name}
                                  className="w-full aspect-square object-contain"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">保存済みのイメージがありません</p>
                        )}
                        
                        <div className="flex gap-2">
                          <Input
                            value={getPlacementConfig(activePlacement).logoUrl}
                            onChange={(e) => updatePlacementConfig(activePlacement, { logoUrl: e.target.value })}
                            placeholder="画像URLを入力..."
                            className="flex-1 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            onClick={() => document.getElementById("logo-upload")?.click()}
                          >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Size and position controls */}
                      {getPlacementConfig(activePlacement).logoUrl && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">サイズ</Label>
                              <span className="text-xs text-muted-foreground">{getPlacementConfig(activePlacement).logoSize}%</span>
                            </div>
                            <Slider
                              value={[getPlacementConfig(activePlacement).logoSize]}
                              onValueChange={([value]) => updatePlacementConfig(activePlacement, { logoSize: value })}
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
                                <span className="text-xs text-muted-foreground">{getPlacementConfig(activePlacement).logoPositionX}%</span>
                              </div>
                              <Slider
                                value={[getPlacementConfig(activePlacement).logoPositionX]}
                                onValueChange={([value]) => updatePlacementConfig(activePlacement, { logoPositionX: value })}
                                min={0}
                                max={100}
                                step={5}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">縦位置</Label>
                                <span className="text-xs text-muted-foreground">{getPlacementConfig(activePlacement).logoPositionY}%</span>
                              </div>
                              <Slider
                                value={[getPlacementConfig(activePlacement).logoPositionY]}
                                onValueChange={([value]) => updatePlacementConfig(activePlacement, { logoPositionY: value })}
                                min={0}
                                max={100}
                                step={5}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updatePlacementConfig(activePlacement, { logoSize: 50, logoPositionX: 50, logoPositionY: 50 })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            位置リセット
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Summary of enabled placements */}
                {getEnabledPlacements().length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    設定済み: {getEnabledPlacements().map(p => availablePlacements[p.placement]).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input for upload */}
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />

            {/* Product Name */}
            {selectedCatalogProduct && selectedVariants.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="productName">4. 商品名を編集</Label>
                <Input
                  id="productName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="例: jiuFlow Tシャツ"
                />
              </div>
            )}

            {/* Mockup Preview */}
            {selectedCatalogProduct && getPlacementConfig(activePlacement).logoUrl && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">プレビュー ({availablePlacements[activePlacement]})</p>
                </div>
                
                <div className="flex items-center justify-center bg-white rounded-lg p-4 border min-h-[200px]">
                  {(() => {
                    const selectedProduct = catalogProducts.find(p => p.id.toString() === selectedCatalogProduct);
                    const selectedVariant = selectedVariants.length > 0 
                      ? catalogVariants.find(v => v.id === selectedVariants[0])
                      : null;
                    const previewImage = selectedVariant?.image || selectedProduct?.image;
                    const activeConfig = getPlacementConfig(activePlacement);
                    
                    if (previewImage) {
                      return (
                        <div className="relative w-full h-[180px]">
                          <img
                            src={previewImage}
                            alt="Product"
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                          {printAreaInfo && activeConfig.logoUrl && (
                            <img
                              src={activeConfig.logoUrl}
                              alt="Logo"
                              className="absolute object-contain drop-shadow-lg pointer-events-none"
                              style={{
                                width: `${(activeConfig.logoSize / 100) * printAreaInfo.areaWidth}%`,
                                left: `${printAreaInfo.areaLeft + (activeConfig.logoPositionX / 100) * printAreaInfo.areaWidth}%`,
                                top: `${printAreaInfo.areaTop + (activeConfig.logoPositionY / 100) * printAreaInfo.areaHeight}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          )}
                        </div>
                      );
                    }
                    return <p className="text-sm text-muted-foreground">プレビューを表示できません</p>;
                  })()}
                </div>
                
                {/* Mockup Generation Button */}
                {selectedVariants.length > 0 && (
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
                          モックアップ生成 ({availablePlacements[activePlacement]})
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Generated Mockup Display */}
                {generatedMockupUrl && (
                  <div className="mt-4 p-3 border rounded-lg bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">生成されたモックアップ:</p>
                      <Button size="sm" variant="outline" onClick={handleSaveMockup} disabled={savingMockup}>
                        {savingMockup ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </div>
                    <img src={generatedMockupUrl} alt="Mockup" className="w-full rounded-lg" />
                  </div>
                )}
              </div>
            )}

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

      {/* Set Thumbnail Dialog */}
      <Dialog open={showThumbnailDialog} onOpenChange={setShowThumbnailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>サムネイルを設定する商品を選択</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMockupForThumbnail && (
              <div className="border rounded-lg p-2">
                <img 
                  src={selectedMockupForThumbnail} 
                  alt="Selected mockup"
                  className="w-full aspect-square object-cover rounded"
                />
              </div>
            )}
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  商品がありません
                </p>
              ) : (
                products.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => handleSetThumbnail(product.id)}
                    disabled={settingThumbnail !== null}
                  >
                    {product.thumbnail_url && (
                      <img 
                        src={product.thumbnail_url} 
                        alt={product.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}
                    <span className="truncate">{product.name}</span>
                    {settingThumbnail === selectedMockupForThumbnail && (
                      <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    )}
                  </Button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
