import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AWARD-POINTS] ${step}${detailsStr}`);
};

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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    logStep("Admin verified");

    const { userId, amount, description } = await req.json();

    if (!userId || amount === undefined || !description) {
      throw new Error("Missing required fields: userId, amount, description");
    }

    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      throw new Error("Invalid amount");
    }

    logStep("Awarding points", { userId, amount: numAmount, description });

    // Update user points
    const { data: currentPoints } = await supabaseClient
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .maybeSingle();

    if (currentPoints) {
      const newPoints = currentPoints.points + numAmount;
      if (newPoints < 0) {
        throw new Error("Insufficient points for deduction");
      }

      const { error: updateError } = await supabaseClient
        .from("user_points")
        .update({ points: newPoints })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    } else {
      // Initialize points if not exists
      if (numAmount < 0) {
        throw new Error("Cannot deduct from non-existent points");
      }

      const { error: insertError } = await supabaseClient
        .from("user_points")
        .insert({
          user_id: userId,
          points: numAmount,
        });

      if (insertError) throw insertError;
    }

    // Record transaction
    const transactionType = numAmount > 0 ? "manual_award" : "manual_deduction";
    const { error: transError } = await supabaseClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        amount: numAmount,
        transaction_type: transactionType,
        description,
      });

    if (transError) throw transError;

    logStep("Points awarded successfully", { userId, amount: numAmount });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Points awarded successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
