import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignData {
  name: string;
  budget: number;
  startDate?: string;
  endDate?: string;
  targetUrl?: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GADS_CLIENT_ID');
  const clientSecret = Deno.env.get('GADS_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GADS_REFRESH_TOKEN');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken!,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function getCampaigns(accessToken: string, customerId: string, developerToken: string) {
  const query = `
    SELECT 
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id DESC
  `;

  const response = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GADS] Campaign fetch error:', errorText);
    throw new Error(`Failed to fetch campaigns: ${errorText}`);
  }

  const data = await response.json();
  console.log('[GADS] Campaigns response:', JSON.stringify(data).slice(0, 500));
  
  const campaigns: any[] = [];
  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        campaigns.push(...batch.results);
      }
    }
  }
  
  return campaigns;
}

async function getAccountPerformance(accessToken: string, customerId: string, developerToken: string, dateRange: string) {
  let dateFilter = '';
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  switch (dateRange) {
    case 'today':
      dateFilter = `segments.date = '${today}'`;
      break;
    case 'last7days':
      const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
      dateFilter = `segments.date BETWEEN '${last7}' AND '${today}'`;
      break;
    case 'last30days':
      const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
      dateFilter = `segments.date BETWEEN '${last30}' AND '${today}'`;
      break;
    case 'thisMonth':
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0].replace(/-/g, '');
      dateFilter = `segments.date BETWEEN '${monthStartStr}' AND '${today}'`;
      break;
    default:
      const default30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
      dateFilter = `segments.date BETWEEN '${default30}' AND '${today}'`;
  }

  const query = `
    SELECT 
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.average_cpc,
      metrics.ctr
    FROM customer
    WHERE ${dateFilter}
    ORDER BY segments.date DESC
  `;

  console.log('[GADS] Performance query:', query);

  const response = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GADS] Performance fetch error:', errorText);
    throw new Error(`Failed to fetch performance: ${errorText}`);
  }

  const data = await response.json();
  console.log('[GADS] Performance response:', JSON.stringify(data).slice(0, 500));
  
  const results: any[] = [];
  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        results.push(...batch.results);
      }
    }
  }
  
  return results;
}

async function updateCampaignStatus(
  accessToken: string, 
  customerId: string, 
  developerToken: string,
  campaignId: string,
  status: 'ENABLED' | 'PAUSED'
) {
  const response = await fetch(
    `https://googleads.googleapis.com/v16/customers/${customerId}/campaigns/${campaignId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updateMask: 'status',
        operations: [{
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: status
          }
        }]
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update campaign: ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const developerToken = Deno.env.get('GADS_DEVELOPER_TOKEN');
    const customerId = Deno.env.get('GADS_ACCOUNT_ID')?.replace(/-/g, '');

    if (!developerToken || !customerId) {
      console.error('[GADS] Missing configuration');
      return new Response(
        JSON.stringify({ error: 'Google Ads not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();
    console.log('[GADS] Action:', action, 'Data:', JSON.stringify(data).slice(0, 200));

    const accessToken = await getAccessToken();
    console.log('[GADS] Access token obtained');

    let result;

    switch (action) {
      case 'getCampaigns':
        result = await getCampaigns(accessToken, customerId, developerToken);
        break;
      
      case 'getPerformance':
        result = await getAccountPerformance(accessToken, customerId, developerToken, data?.dateRange || 'last30days');
        break;
      
      case 'updateCampaignStatus':
        if (!data?.campaignId || !data?.status) {
          throw new Error('Campaign ID and status required');
        }
        result = await updateCampaignStatus(accessToken, customerId, developerToken, data.campaignId, data.status);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[GADS] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
