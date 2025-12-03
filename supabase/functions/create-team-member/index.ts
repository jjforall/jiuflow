import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, displayName, referralCode } = await req.json();

    // Validate referral code
    if (!referralCode || referralCode.toUpperCase() !== "TEAMRYOZO") {
      return new Response(
        JSON.stringify({ error: "Invalid referral code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Creating team member with email:", email);

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create user with email confirmed (no email verification needed)
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: displayName || email.split("@")[0],
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const userId = userData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("User created with ID:", userId);

    // Create profile for the user
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        display_name: displayName || email.split("@")[0],
        is_public: false,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway - profile might already exist from trigger
    }

    // Assign staff role to the user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "staff",
      });

    if (roleError) {
      console.error("Error assigning staff role:", roleError);
      // If role assignment fails, we should delete the user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to assign staff role" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("Staff role assigned to user:", userId);

    // Create a lifetime subscription record (no stripe, just database entry)
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        status: "active",
        plan_type: "team_member",
        current_period_end: new Date("2099-12-31").toISOString(),
      });

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      // Continue anyway - this is not critical
    }

    console.log("Team member created successfully:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Team member created successfully",
        userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-team-member:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
