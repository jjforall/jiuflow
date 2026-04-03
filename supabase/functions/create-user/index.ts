import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Input validation schema
const createUserSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long").transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
  role: z.enum(["user", "admin", "staff"]).default("user"),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the request is from an admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT token and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('User verification error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Check if the user is an admin using admin client
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError || !userRoles) {
      console.error('Admin check error:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified');

    // Parse and validate the request body
    const rawBody = await req.json();
    const parseResult = createUserSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { email, password, role } = parseResult.data;

    console.log('Creating user:', email);

    // Create the user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error('User creation error:', createError);
      const safeMessage = createError.message?.includes('already registered') 
        ? 'A user with this email already exists' 
        : 'Failed to create user. Please try again.';
      return new Response(
        JSON.stringify({ error: safeMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', newUser.user.id);

    // Assign role to the new user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      // User is created but role assignment failed
      return new Response(
        JSON.stringify({ 
          error: 'User created but role assignment failed',
          user: newUser.user 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Role assigned successfully:', role);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: role,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
