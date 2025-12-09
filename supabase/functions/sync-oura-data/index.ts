import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OURA_API_BASE = 'https://api.ouraring.com/v2/usercollection'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Syncing Oura data for user: ${user.id}`)

    // Get user's Oura token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oura_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Oura token not found. Please connect your Oura Ring first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ouraToken = tokenData.access_token

    // Calculate date range (last 7 days)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(`Fetching data from ${startDate} to ${endDate}`)

    // Fetch sleep data
    const sleepResponse = await fetch(
      `${OURA_API_BASE}/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { 'Authorization': `Bearer ${ouraToken}` }
      }
    )
    
    let sleepData = []
    if (sleepResponse.ok) {
      const sleepJson = await sleepResponse.json()
      sleepData = sleepJson.data || []
      console.log(`Fetched ${sleepData.length} sleep records`)
    } else {
      console.error('Sleep fetch error:', sleepResponse.status, await sleepResponse.text())
    }

    // Fetch activity data
    const activityResponse = await fetch(
      `${OURA_API_BASE}/daily_activity?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { 'Authorization': `Bearer ${ouraToken}` }
      }
    )
    
    let activityData = []
    if (activityResponse.ok) {
      const activityJson = await activityResponse.json()
      activityData = activityJson.data || []
      console.log(`Fetched ${activityData.length} activity records`)
    } else {
      console.error('Activity fetch error:', activityResponse.status, await activityResponse.text())
    }

    // Fetch readiness data
    const readinessResponse = await fetch(
      `${OURA_API_BASE}/daily_readiness?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { 'Authorization': `Bearer ${ouraToken}` }
      }
    )
    
    let readinessData = []
    if (readinessResponse.ok) {
      const readinessJson = await readinessResponse.json()
      readinessData = readinessJson.data || []
      console.log(`Fetched ${readinessData.length} readiness records`)
    } else {
      console.error('Readiness fetch error:', readinessResponse.status, await readinessResponse.text())
    }

    // Upsert data to database
    const { error: upsertError } = await supabase
      .from('user_oura_data')
      .upsert({
        user_id: user.id,
        sleep_data: sleepData,
        activity_data: activityData,
        readiness_data: readinessData,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      throw upsertError
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sleep: sleepData,
          activity: activityData,
          readiness: readinessData,
          lastSynced: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error syncing Oura data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync Oura data'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
