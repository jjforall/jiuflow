import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create client with user's token to verify authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !roles || !roles.some((r) => r.role === "admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client only after authorization check
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { dojos } = await req.json();

    console.log(`Importing ${dojos.length} dojos...`);

    // 道場名を解析する関数
    function parseName(fullName: string): { ja: string; en: string } {
      const match = fullName.match(/^(.+?)\s*（(.+?)）\s*$/);
      if (match) {
        return { ja: match[1].trim(), en: match[2].trim() };
      }
      // 括弧がない場合はそのまま使用
      return { ja: fullName, en: fullName };
    }

    // データを整形
    const formattedDojos = dojos.map((dojo: any) => {
      const names = parseName(dojo.name);
      
      return {
        name: names.en,
        name_ja: names.ja,
        name_pt: names.en, // ポルトガル語名は英語名と同じ
        description: `Affiliated with ${dojo.federation} in ${dojo.region} region. Instructor: ${dojo.instructor || 'N/A'}`,
        description_ja: `${dojo.federation}所属、${dojo.region}地域。指導者：${dojo.instructor || '未登録'}`,
        description_pt: `Affiliated with ${dojo.federation} in ${dojo.region} region. Instructor: ${dojo.instructor || 'N/A'}`,
        location: dojo.address || null,
        phone: dojo.phone || null,
        website: dojo.url || null,
        is_verified: true,
      };
    });

    // バッチで挿入（50件ずつ）
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < formattedDojos.length; i += batchSize) {
      const batch = formattedDojos.slice(i, i + batchSize);
      
      const { error } = await supabaseAdmin
        .from("dojos")
        .insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${formattedDojos.length} dojos`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedCount} dojos`,
        count: insertedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
