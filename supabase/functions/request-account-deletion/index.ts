import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[request-account-deletion] Request received');

    // Create Supabase client with JWT auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[request-account-deletion] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[request-account-deletion] Processing deletion for user: ${user.id}`);

    // Create admin client for user deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete user data from all tables (cascade will handle most, but let's be thorough)
    const tablesToClean = [
      { table: 'practice_records', column: 'user_id' },
      { table: 'video_views', column: 'user_id' },
      { table: 'video_ratings', column: 'user_id' },
      { table: 'video_comments', column: 'user_id' },
      { table: 'video_tips', column: 'from_user_id' },
      { table: 'video_purchases', column: 'buyer_id' },
      { table: 'celebrity_follows', column: 'user_id' },
      { table: 'user_follows', column: 'follower_id' },
      { table: 'user_follows', column: 'following_id' },
      { table: 'favorite_dojos', column: 'user_id' },
      { table: 'favorite_techniques', column: 'user_id' },
      { table: 'user_dojos', column: 'user_id' },
      { table: 'point_transactions', column: 'user_id' },
      { table: 'user_points', column: 'user_id' },
      { table: 'event_registrations', column: 'user_id' },
      { table: 'tournament_participants', column: 'user_id' },
      { table: 'community_reactions', column: 'user_id' },
      { table: 'community_ranks', column: 'user_id' },
      { table: 'community_posts', column: 'author_id' },
      { table: 'community_threads', column: 'author_id' },
      { table: 'message_group_members', column: 'user_id' },
      { table: 'messages', column: 'sender_id' },
      { table: 'message_groups', column: 'created_by' },
      { table: 'user_nfts', column: 'user_id' },
      { table: 'brothers_applications', column: 'user_id' },
      { table: 'referral_codes', column: 'user_id' },
      { table: 'subscriptions', column: 'user_id' },
      { table: 'user_videos', column: 'user_id' },
    ];

    for (const { table, column } of tablesToClean) {
      try {
        await supabaseAdmin
          .from(table)
          .delete()
          .eq(column, user.id);
        console.log(`[request-account-deletion] Cleaned ${table}`);
      } catch (err) {
        console.error(`[request-account-deletion] Error cleaning ${table}:`, err);
      }
    }

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);
    console.log('[request-account-deletion] Deleted profile');

    // Delete user roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);
    console.log('[request-account-deletion] Deleted user roles');

    // Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[request-account-deletion] Failed to delete auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[request-account-deletion] User ${user.id} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'アカウントが正常に削除されました / Account successfully deleted' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[request-account-deletion] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
