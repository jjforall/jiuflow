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
    console.log('[export-user-data] Request received');

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
      console.error('[export-user-data] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[export-user-data] Exporting data for user: ${user.id}`);

    // Create service role client for full data access
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

    // Collect all user data
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
    };

    // Profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    exportData.profile = profile;

    // Subscription data
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);
    exportData.subscriptions = subscriptions;

    // User roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role, created_at')
      .eq('user_id', user.id);
    exportData.roles = roles;

    // User videos
    const { data: videos } = await supabaseAdmin
      .from('user_videos')
      .select('*')
      .eq('user_id', user.id);
    exportData.videos = videos;

    // Practice records
    const { data: practiceRecords } = await supabaseAdmin
      .from('practice_records')
      .select('*')
      .eq('user_id', user.id);
    exportData.practice_records = practiceRecords;

    // Video views
    const { data: videoViews } = await supabaseAdmin
      .from('video_views')
      .select('*')
      .eq('user_id', user.id);
    exportData.video_views = videoViews;

    // Video ratings
    const { data: videoRatings } = await supabaseAdmin
      .from('video_ratings')
      .select('*')
      .eq('user_id', user.id);
    exportData.video_ratings = videoRatings;

    // Video comments
    const { data: videoComments } = await supabaseAdmin
      .from('video_comments')
      .select('*')
      .eq('user_id', user.id);
    exportData.video_comments = videoComments;

    // Video tips
    const { data: videoTips } = await supabaseAdmin
      .from('video_tips')
      .select('*')
      .eq('from_user_id', user.id);
    exportData.video_tips = videoTips;

    // Video purchases
    const { data: videoPurchases } = await supabaseAdmin
      .from('video_purchases')
      .select('*')
      .eq('buyer_id', user.id);
    exportData.video_purchases = videoPurchases;

    // Celebrity follows
    const { data: celebrityFollows } = await supabaseAdmin
      .from('celebrity_follows')
      .select('*')
      .eq('user_id', user.id);
    exportData.celebrity_follows = celebrityFollows;

    // User follows
    const { data: userFollows } = await supabaseAdmin
      .from('user_follows')
      .select('*')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);
    exportData.user_follows = userFollows;

    // Favorite dojos
    const { data: favoriteDojos } = await supabaseAdmin
      .from('favorite_dojos')
      .select('*')
      .eq('user_id', user.id);
    exportData.favorite_dojos = favoriteDojos;

    // User dojos
    const { data: userDojos } = await supabaseAdmin
      .from('user_dojos')
      .select('*')
      .eq('user_id', user.id);
    exportData.user_dojos = userDojos;

    // Referral codes
    const { data: referralCodes } = await supabaseAdmin
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id);
    exportData.referral_codes = referralCodes;

    // Point transactions
    const { data: pointTransactions } = await supabaseAdmin
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id);
    exportData.point_transactions = pointTransactions;

    // User points
    const { data: userPoints } = await supabaseAdmin
      .from('user_points')
      .select('*')
      .eq('user_id', user.id);
    exportData.user_points = userPoints;

    // Event registrations
    const { data: eventRegistrations } = await supabaseAdmin
      .from('event_registrations')
      .select('*')
      .eq('user_id', user.id);
    exportData.event_registrations = eventRegistrations;

    // Community threads
    const { data: communityThreads } = await supabaseAdmin
      .from('community_threads')
      .select('*')
      .eq('author_id', user.id);
    exportData.community_threads = communityThreads;

    // Community posts
    const { data: communityPosts } = await supabaseAdmin
      .from('community_posts')
      .select('*')
      .eq('author_id', user.id);
    exportData.community_posts = communityPosts;

    // User NFTs
    const { data: userNfts } = await supabaseAdmin
      .from('user_nfts')
      .select('*')
      .eq('user_id', user.id);
    exportData.user_nfts = userNfts;

    // Brothers applications
    const { data: brothersApplications } = await supabaseAdmin
      .from('brothers_applications')
      .select('*')
      .eq('user_id', user.id);
    exportData.brothers_applications = brothersApplications;

    console.log(`[export-user-data] Successfully exported data for user: ${user.id}`);

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-${user.id}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('[export-user-data] Unexpected error:', error);
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
