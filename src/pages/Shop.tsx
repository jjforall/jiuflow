import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, X, Package } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    id: number;
    type: string;
    preview_url: string;
    thumbnail_url: string;
  }>;
}

interface Product {
  id: number;
  external_id: string;
  name: string;
  thumbnail_url: string;
  variants: ProductVariant[];
}

interface CartItem {
  variantId: number;
  quantity: number;
  name: string;
  price: number;
  thumbnail: string;
  size?: string;
}

export default function Shop() {
  const { t, language } = useTranslation();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(language === "ja" ? "ご注文ありがとうございます！" : "Thank you for your order!");
      setCart([]);
    }
    if (searchParams.get("canceled") === "true") {
      toast.info(language === "ja" ? "注文がキャンセルされました" : "Order was canceled");
    }
  }, [searchParams, language]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-printful-products");
      if (error) throw error;
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(language === "ja" ? "商品の取得に失敗しました" : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const selectedVariantId = selectedVariants[product.id];
    const variant = selectedVariantId 
      ? product.variants.find(v => v.id === selectedVariantId)
      : product.variants[0];
    
    if (!variant) {
      toast.error(language === "ja" ? "バリエーションを選択してください" : "Please select a variant");
      return;
    }

    const existingItem = cart.find(item => item.variantId === variant.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.variantId === variant.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const thumbnail = variant.files?.find(f => f.type === "preview")?.preview_url 
        || variant.product?.image 
        || product.thumbnail_url;
      
      setCart([...cart, {
        variantId: variant.id,
        quantity: 1,
        name: variant.name,
        price: parseFloat(variant.retail_price) * (variant.currency === "USD" ? 150 : 1),
        thumbnail,
        size: variant.name.split(" - ").pop(),
      }]);
    }
    
    toast.success(language === "ja" ? "カートに追加しました" : "Added to cart");
  };

  const updateQuantity = (variantId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.variantId === variantId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (variantId: number) => {
    setCart(cart.filter(item => item.variantId !== variantId));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error(language === "ja" ? "カートが空です" : "Cart is empty");
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-printful-checkout", {
        body: { items: cart },
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(language === "ja" ? "チェックアウトに失敗しました" : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    document.title = language === "ja" ? "ショップ | Jiuflow" : "Shop | Jiuflow";
  }, [language]);

  return (
    <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {language === "ja" ? "ショップ" : "Shop"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {language === "ja" ? "Jiuflow公式グッズ" : "Official Jiuflow merchandise"}
              </p>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {language === "ja" ? "カート" : "Cart"}
                  </SheetTitle>
                </SheetHeader>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Package className="h-12 w-12 mb-4" />
                    <p>{language === "ja" ? "カートは空です" : "Your cart is empty"}</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-auto py-4 space-y-4">
                      {cart.map((item) => (
                        <div key={item.variantId} className="flex gap-3 p-3 border rounded-lg">
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ¥{Math.round(item.price).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.variantId, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.variantId, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-auto text-destructive"
                                onClick={() => removeFromCart(item.variantId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>{language === "ja" ? "合計" : "Total"}</span>
                        <span>¥{Math.round(getTotalPrice()).toLocaleString()}</span>
                      </div>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading
                          ? (language === "ja" ? "処理中..." : "Processing...")
                          : (language === "ja" ? "購入手続きへ" : "Proceed to Checkout")}
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-16 w-16 mb-4" />
              <p className="text-lg">
                {language === "ja" ? "商品がありません" : "No products available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const defaultVariant = product.variants[0];
                const price = defaultVariant
                  ? parseFloat(defaultVariant.retail_price) * (defaultVariant.currency === "USD" ? 150 : 1)
                  : 0;
                const thumbnail = defaultVariant?.files?.find(f => f.type === "preview")?.preview_url
                  || defaultVariant?.product?.image
                  || product.thumbnail_url;

                return (
                  <Card key={product.id} className="overflow-hidden group">
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={thumbnail}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                        {product.name}
                      </h3>
                      <p className="text-lg font-bold text-primary mb-3">
                        ¥{Math.round(price).toLocaleString()}
                      </p>
                      
                      {product.variants.length > 1 && (
                        <Select
                          value={selectedVariants[product.id]?.toString() || defaultVariant?.id.toString()}
                          onValueChange={(value) => setSelectedVariants({
                            ...selectedVariants,
                            [product.id]: parseInt(value)
                          })}
                        >
                          <SelectTrigger className="mb-3">
                            <SelectValue placeholder={language === "ja" ? "サイズを選択" : "Select size"} />
                          </SelectTrigger>
                          <SelectContent>
                            {product.variants.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id.toString()}>
                                {variant.name.split(" - ").pop()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        className="w-full active:scale-[0.98]"
                        onClick={() => addToCart(product)}
                        disabled={!defaultVariant}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {language === "ja" ? "カートに追加" : "Add to Cart"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
  );
}
