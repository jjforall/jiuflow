import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[CREATE-TEAM-MEMBER] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("[CREATE-TEAM-MEMBER] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[CREATE-TEAM-MEMBER] No authorization header");
      return new Response(
        JSON.stringify({ error: "認証が必要です" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Create client with user's JWT to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      console.log("[CREATE-TEAM-MEMBER] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "認証に失敗しました" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("[CREATE-TEAM-MEMBER] Authenticated user:", user.id);

    // Use service role to check if user is admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.log("[CREATE-TEAM-MEMBER] User is not admin:", user.id, roleError);
      return new Response(
        JSON.stringify({ error: "この操作には管理者権限が必要です" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    console.log("[CREATE-TEAM-MEMBER] Admin verified:", user.id);

    const body = await req.json();
    console.log("[CREATE-TEAM-MEMBER] Received body:", JSON.stringify({ email: body.email, hasPassword: !!body.password, displayName: body.displayName }));
    
    const { email, password, displayName } = body;

    if (!email || !password) {
      console.log("[CREATE-TEAM-MEMBER] Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (password.length < 6) {
      console.log("[CREATE-TEAM-MEMBER] Password too short");
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("[CREATE-TEAM-MEMBER] Processing team member with email:", email);

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // User already exists - upgrade to staff
      console.log("[CREATE-TEAM-MEMBER] User already exists, upgrading to staff:", existingProfile.id);
      userId = existingProfile.id;

      // Check if already has staff role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "staff")
        .maybeSingle();

      if (existingRole) {
        console.log("[CREATE-TEAM-MEMBER] User already has staff role");
        return new Response(
          JSON.stringify({ error: "このメールアドレスは既にスタッフとして登録されています。" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    } else {
      // Create new user
      console.log("[CREATE-TEAM-MEMBER] Creating new user");
      const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName || email.split("@")[0],
        },
      });

      if (createUserError) {
        console.error("[CREATE-TEAM-MEMBER] Error creating user:", createUserError);
        
        // Check if user already exists in auth but not in profiles
        if (createUserError.message.includes("already been registered") || createUserError.message.includes("already exists")) {
          // Get user by email from auth
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = userList?.users?.find(u => u.email === email);
          
          if (existingUser) {
            userId = existingUser.id;
            console.log("[CREATE-TEAM-MEMBER] Found existing auth user:", userId);
          } else {
            return new Response(
              JSON.stringify({ error: "このメールアドレスは既に登録されています。" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: createUserError.message }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
      } else {
        userId = userData.user?.id!;
      }

      if (!userId) {
        console.error("[CREATE-TEAM-MEMBER] No user ID");
        return new Response(
          JSON.stringify({ error: "Failed to create or find user" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      console.log("[CREATE-TEAM-MEMBER] User ID:", userId);

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
        console.error("[CREATE-TEAM-MEMBER] Error creating profile:", profileError);
      }
    }

    // Assign staff role to the user
    console.log("[CREATE-TEAM-MEMBER] Assigning staff role to:", userId);
    const { error: staffRoleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "staff",
      }, {
        onConflict: "user_id,role"
      });

    if (staffRoleError) {
      console.error("[CREATE-TEAM-MEMBER] Error assigning staff role:", staffRoleError);
      return new Response(
        JSON.stringify({ error: "Failed to assign staff role: " + staffRoleError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("[CREATE-TEAM-MEMBER] Staff role assigned to user:", userId);

    // Create or update lifetime subscription record
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: userId,
        status: "active",
        plan_type: "team_member",
        current_period_end: new Date("2099-12-31").toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (subscriptionError) {
      console.error("[CREATE-TEAM-MEMBER] Error creating subscription:", subscriptionError);
    }

    console.log("[CREATE-TEAM-MEMBER] Team member created/upgraded successfully by admin:", user.id, "for:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: existingProfile ? "既存ユーザーをスタッフに昇格しました" : "Team member created successfully",
        userId,
        upgraded: !!existingProfile,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-TEAM-MEMBER] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
