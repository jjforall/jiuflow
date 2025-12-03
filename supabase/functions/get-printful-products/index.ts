import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
    if (!PRINTFUL_API_KEY) {
      throw new Error("PRINTFUL_API_KEY is not set");
    }

    console.log("[GET-PRINTFUL-PRODUCTS] Fetching products from Printful");

    // Get store products from Printful
    const response = await fetch("https://api.printful.com/store/products", {
      headers: {
        "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GET-PRINTFUL-PRODUCTS] Printful API error:", response.status, errorText);
      throw new Error(`Printful API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[GET-PRINTFUL-PRODUCTS] Fetched products:", data.result?.length || 0);

    // Get detailed info for each product
    const productsWithDetails = await Promise.all(
      (data.result || []).slice(0, 20).map(async (product: any) => {
        try {
          const detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
            headers: {
              "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
            },
          });
          
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            const syncProduct = detailData.result?.sync_product;
            return {
              id: product.id,
              external_id: product.external_id,
              name: product.name,
              thumbnail_url: syncProduct?.thumbnail_url || product.thumbnail_url,
              variants: detailData.result?.sync_variants || [],
              sync_product: syncProduct,
              is_ignored: syncProduct?.is_ignored || false,
            };
          }
          return {
            id: product.id,
            external_id: product.external_id,
            name: product.name,
            thumbnail_url: product.thumbnail_url,
            variants: [],
          };
        } catch (e) {
          console.error(`[GET-PRINTFUL-PRODUCTS] Error fetching product ${product.id}:`, e);
          return {
            id: product.id,
            external_id: product.external_id,
            name: product.name,
            thumbnail_url: product.thumbnail_url,
            variants: [],
          };
        }
      })
    );

    return new Response(JSON.stringify({ products: productsWithDetails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[GET-PRINTFUL-PRODUCTS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
