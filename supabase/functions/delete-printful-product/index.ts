import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteProductRequest {
  product_id: number;
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
      console.log("[DELETE-PRINTFUL-PRODUCT] No authorization header");
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
      console.log("[DELETE-PRINTFUL-PRODUCT] Invalid user:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check admin role
    const isAdmin = await checkAdminRole(supabase, user.id);
    if (!isAdmin) {
      console.log("[DELETE-PRINTFUL-PRODUCT] User is not admin:", user.id);
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("[DELETE-PRINTFUL-PRODUCT] Admin verified:", user.id);

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
