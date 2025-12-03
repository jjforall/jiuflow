import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncVariant {
  variant_id: number;
  retail_price: string;
  files: Array<{
    url: string;
    type?: string;
  }>;
  options?: Array<{
    id: string;
    value: string | string[];
  }>;
}

interface CreateProductRequest {
  sync_product: {
    name: string;
    thumbnail?: string;
  };
  sync_variants: SyncVariant[];
  thread_colors?: string[];
  is_embroidery?: boolean;
}

// Default thread color for embroidery products
const DEFAULT_THREAD_COLOR = "#FFFFFF";
const ALLOWED_THREAD_COLORS = [
  "#FFFFFF", "#000000", "#96A1A8", "#A67843", "#FFCC00", 
  "#E25C27", "#CC3366", "#CC3333", "#660000", "#333366", 
  "#005397", "#3399FF", "#6B5294", "#01784E", "#7BA35A"
];

// Product IDs that typically require embroidery thread colors
// This list includes common embroidery products like hats, caps, etc.
const EMBROIDERY_PRODUCT_PREFIXES = ["embroidery", "emb_"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
    if (!PRINTFUL_API_KEY) {
      throw new Error("PRINTFUL_API_KEY is not set");
    }

    const body: CreateProductRequest = await req.json();
    console.log("[CREATE-PRINTFUL-PRODUCT] Creating product:", body.sync_product.name);
    console.log("[CREATE-PRINTFUL-PRODUCT] Is embroidery flag:", body.is_embroidery);

    // Determine thread colors to use
    let threadColors = body.thread_colors || [DEFAULT_THREAD_COLOR];
    
    // Validate thread colors
    threadColors = threadColors.filter(color => 
      ALLOWED_THREAD_COLORS.includes(color.toUpperCase())
    );
    
    if (threadColors.length === 0) {
      threadColors = [DEFAULT_THREAD_COLOR];
    }

    // Check if this might be an embroidery product based on the name or flag
    const isEmbroidery = body.is_embroidery || 
      body.sync_product.name.toLowerCase().includes("hat") ||
      body.sync_product.name.toLowerCase().includes("cap") ||
      body.sync_product.name.toLowerCase().includes("beanie") ||
      body.sync_product.name.toLowerCase().includes("dad hat") ||
      body.sync_product.name.toLowerCase().includes("embroidery") ||
      body.sync_product.name.toLowerCase().includes("emb");

    console.log("[CREATE-PRINTFUL-PRODUCT] Detected embroidery product:", isEmbroidery);
    console.log("[CREATE-PRINTFUL-PRODUCT] Thread colors:", threadColors);

    // Prepare the request body
    const requestBody: {
      sync_product: typeof body.sync_product;
      sync_variants: SyncVariant[];
    } = {
      sync_product: body.sync_product,
      sync_variants: body.sync_variants.map(variant => {
        // If embroidery product, add thread_colors option to each variant
        if (isEmbroidery) {
          const existingOptions = variant.options || [];
          const hasThreadColors = existingOptions.some(opt => 
            opt.id.includes("thread_colors")
          );
          
          if (!hasThreadColors) {
            // Add multiple thread color options to cover different placements
            // Printful expects specific option IDs based on placement
            const threadColorOptions = [
              { id: "thread_colors", value: threadColors },
              { id: "thread_colors_3d", value: threadColors },
              { id: "thread_colors_front_large", value: threadColors },
              { id: "thread_colors_front", value: threadColors },
              { id: "thread_colors_back", value: threadColors },
              { id: "thread_colors_left", value: threadColors },
              { id: "stitch_color", value: threadColors[0] }, // Some products use stitch_color
            ];
            
            return {
              ...variant,
              options: [
                ...existingOptions,
                ...threadColorOptions
              ]
            };
          }
        }
        return variant;
      })
    };

    console.log("[CREATE-PRINTFUL-PRODUCT] Request body:", JSON.stringify(requestBody));

    // Create product in Printful
    const response = await fetch("https://api.printful.com/store/products", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("[CREATE-PRINTFUL-PRODUCT] Printful response status:", response.status);
    console.log("[CREATE-PRINTFUL-PRODUCT] Printful response:", responseText);

    if (!response.ok) {
      console.error("[CREATE-PRINTFUL-PRODUCT] Printful API error:", response.status, responseText);
      
      // If the error is about thread colors, provide a more helpful message
      if (responseText.includes("thread_colors")) {
        return new Response(JSON.stringify({ 
          error: "刺繍商品にはスレッドカラーが必要です",
          details: responseText,
          allowed_colors: ALLOWED_THREAD_COLORS
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `Printful API error: ${response.status}`,
        details: responseText 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const data = JSON.parse(responseText);
    console.log("[CREATE-PRINTFUL-PRODUCT] Product created successfully:", data.result?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      product: data.result 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-PRINTFUL-PRODUCT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
