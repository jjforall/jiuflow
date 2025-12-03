import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateProductRequest {
  sync_product: {
    name: string;
    thumbnail?: string;
  };
  sync_variants: Array<{
    variant_id: number;
    retail_price: string;
    files: Array<{
      url: string;
      type?: string;
    }>;
  }>;
}

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

    // Create product in Printful
    const response = await fetch("https://api.printful.com/store/products", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("[CREATE-PRINTFUL-PRODUCT] Printful response status:", response.status);
    console.log("[CREATE-PRINTFUL-PRODUCT] Printful response:", responseText);

    if (!response.ok) {
      console.error("[CREATE-PRINTFUL-PRODUCT] Printful API error:", response.status, responseText);
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
