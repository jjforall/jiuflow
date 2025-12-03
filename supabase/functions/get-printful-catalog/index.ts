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
    const getPrintfiles = url.searchParams.get("printfiles") === "true";

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

      // Also fetch printfiles info if requested or by default for variants
      let printfilesData = null;
      try {
        const printfilesResponse = await fetch(
          `https://api.printful.com/mockup-generator/printfiles/${productId}`,
          {
            headers: {
              "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
            },
          }
        );
        
        if (printfilesResponse.ok) {
          const pfData = await printfilesResponse.json();
          printfilesData = pfData.result;
          console.log("[GET-PRINTFUL-CATALOG] Fetched printfiles, placements:", 
            Object.keys(printfilesData?.available_placements || {}).length);
        }
      } catch (pfError) {
        console.log("[GET-PRINTFUL-CATALOG] Could not fetch printfiles:", pfError);
      }

      return new Response(JSON.stringify({ 
        product: data.result?.product,
        variants: data.result?.variants || [],
        printfiles: printfilesData,
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

    // Return all products from Printful catalog
    const allProducts = data.result || [];

    return new Response(JSON.stringify({ products: allProducts }), {
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
