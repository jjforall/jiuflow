import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BONUS_AMOUNT = 1000;
const MAX_POINTS = 100000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Get current points
    const { data: currentPoints } = await supabaseClient
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      .maybeSingle();

    const current = currentPoints?.points ?? 0;

    if (current >= MAX_POINTS) {
      return new Response(
        JSON.stringify({ success: false, message: "上限に達しています", points: current }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Cap so we don't exceed MAX_POINTS
    const award = Math.min(BONUS_AMOUNT, MAX_POINTS - current);
    const newPoints = current + award;

    if (currentPoints) {
      const { error } = await supabaseClient
        .from("user_points")
        .update({ points: newPoints })
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("user_points")
        .insert({ user_id: user.id, points: award });
      if (error) throw error;
    }

    // Record transaction
    const { error: transError } = await supabaseClient
      .from("point_transactions")
      .insert({
        user_id: user.id,
        amount: award,
        transaction_type: "konami_bonus",
        description: "コナミコマンドボーナス",
      });
    if (transError) throw transError;

    return new Response(
      JSON.stringify({ success: true, awarded: award, points: newPoints }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
