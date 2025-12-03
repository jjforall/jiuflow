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

    const url = new URL(req.url);
    const productId = url.searchParams.get("product_id");

    // If product_id is provided, get variants for that product
    if (productId) {
      console.log("[GET-PRINTFUL-CATALOG] Fetching variants for product:", productId);
      
      const response = await fetch(`https://api.printful.com/products/${productId}`, {
        headers: {
          "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[GET-PRINTFUL-CATALOG] Printful API error:", response.status, errorText);
        throw new Error(`Printful API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("[GET-PRINTFUL-CATALOG] Fetched product variants:", data.result?.variants?.length || 0);

      return new Response(JSON.stringify({ 
        product: data.result?.product,
        variants: data.result?.variants || [] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get catalog products (base products available for printing)
    console.log("[GET-PRINTFUL-CATALOG] Fetching catalog products");

    const response = await fetch("https://api.printful.com/products", {
      headers: {
        "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GET-PRINTFUL-CATALOG] Printful API error:", response.status, errorText);
      throw new Error(`Printful API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[GET-PRINTFUL-CATALOG] Fetched catalog products:", data.result?.length || 0);

    // Filter to commonly used products
    const popularCategories = [
      "t-shirt", "hoodie", "tank", "long sleeve", "sweatshirt", "jacket",
      "hat", "cap", "beanie",
      "mug", "tumbler", "bottle",
      "poster", "canvas", "framed",
      "sticker",
      "tote", "bag", "backpack",
      "phone case", "iphone", "samsung",
      "pillow", "blanket",
      "socks", "leggings",
      "all-over", "shorts", "joggers"
    ];

    const filteredProducts = (data.result || []).filter((product: any) => {
      const typeName = (product.type_name || "").toLowerCase();
      const title = (product.title || "").toLowerCase();
      return popularCategories.some(cat => 
        typeName.includes(cat) || title.includes(cat)
      );
    }).slice(0, 100);

    return new Response(JSON.stringify({ products: filteredProducts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[GET-PRINTFUL-CATALOG] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
