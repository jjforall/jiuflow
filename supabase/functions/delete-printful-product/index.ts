import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteProductRequest {
  product_id: number;
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

    const body: DeleteProductRequest = await req.json();
    console.log("[DELETE-PRINTFUL-PRODUCT] Deleting product:", body.product_id);

    if (!body.product_id) {
      throw new Error("product_id is required");
    }

    const response = await fetch(
      `https://api.printful.com/store/products/${body.product_id}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
        },
      }
    );

    const responseText = await response.text();
    console.log("[DELETE-PRINTFUL-PRODUCT] Printful response status:", response.status);
    console.log("[DELETE-PRINTFUL-PRODUCT] Printful response:", responseText);

    if (!response.ok) {
      console.error("[DELETE-PRINTFUL-PRODUCT] Printful API error:", response.status, responseText);
      return new Response(JSON.stringify({ 
        error: `Printful API error: ${response.status}`,
        details: responseText 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[DELETE-PRINTFUL-PRODUCT] Product deleted successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Product deleted successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[DELETE-PRINTFUL-PRODUCT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
