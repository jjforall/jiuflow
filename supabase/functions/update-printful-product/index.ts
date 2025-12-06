import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateProductRequest {
  product_id: number;
  sync_product?: {
    name?: string;
    thumbnail?: string;
  };
  sync_variants?: Array<{
    id: number;
    retail_price?: string;
  }>;
  is_ignored?: boolean;
}

// Admin role check helper
async function checkAdminRole(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();
  
  return !error && data !== null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.log("[UPDATE-PRINTFUL-PRODUCT] No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("[UPDATE-PRINTFUL-PRODUCT] Invalid user:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check admin role
    const isAdmin = await checkAdminRole(supabase, user.id);
    if (!isAdmin) {
      console.log("[UPDATE-PRINTFUL-PRODUCT] User is not admin:", user.id);
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("[UPDATE-PRINTFUL-PRODUCT] Admin verified:", user.id);

    const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
    if (!PRINTFUL_API_KEY) {
      throw new Error("PRINTFUL_API_KEY is not set");
    }

    const body: UpdateProductRequest = await req.json();
    console.log("[UPDATE-PRINTFUL-PRODUCT] Updating product:", body.product_id);

    if (!body.product_id) {
      throw new Error("product_id is required");
    }

    // Update product name, thumbnail, or is_ignored if provided
    if (body.sync_product?.name || body.sync_product?.thumbnail || body.is_ignored !== undefined) {
      const updateData: Record<string, unknown> = { sync_product: {} };
      
      if (body.sync_product?.name) {
        console.log("[UPDATE-PRINTFUL-PRODUCT] Updating product name to:", body.sync_product.name);
        updateData.sync_product = { name: body.sync_product.name };
      }
      
      if (body.sync_product?.thumbnail) {
        console.log("[UPDATE-PRINTFUL-PRODUCT] Updating thumbnail to:", body.sync_product.thumbnail);
        updateData.sync_product = { 
          ...(updateData.sync_product as object), 
          thumbnail: body.sync_product.thumbnail 
        };
      }
      
      if (body.is_ignored !== undefined) {
        console.log("[UPDATE-PRINTFUL-PRODUCT] Updating is_ignored to:", body.is_ignored);
        updateData.sync_product = { 
          ...(updateData.sync_product as object), 
          is_ignored: body.is_ignored 
        };
      }
      
      const productResponse = await fetch(
        `https://api.printful.com/store/products/${body.product_id}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!productResponse.ok) {
        const errorText = await productResponse.text();
        console.error("[UPDATE-PRINTFUL-PRODUCT] Error updating product:", errorText);
        return new Response(JSON.stringify({ 
          error: `Failed to update product: ${productResponse.status}`,
          details: errorText 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Update variant prices if provided
    if (body.sync_variants && body.sync_variants.length > 0) {
      for (const variant of body.sync_variants) {
        if (variant.retail_price) {
          console.log("[UPDATE-PRINTFUL-PRODUCT] Updating variant:", variant.id, "price:", variant.retail_price);
          
          const variantResponse = await fetch(
            `https://api.printful.com/store/variants/${variant.id}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                retail_price: variant.retail_price,
              }),
            }
          );

          if (!variantResponse.ok) {
            const errorText = await variantResponse.text();
            console.error("[UPDATE-PRINTFUL-PRODUCT] Error updating variant:", errorText);
            // Continue with other variants even if one fails
          }
        }
      }
    }

    console.log("[UPDATE-PRINTFUL-PRODUCT] Update completed successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Product updated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[UPDATE-PRINTFUL-PRODUCT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
