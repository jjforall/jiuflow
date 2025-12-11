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
    `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
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
  
  // :search endpoint returns { results: [...] } directly
  return data.results || [];
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
    `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
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
  
  // :search endpoint returns { results: [...] } directly
  return data.results || [];
}

async function updateCampaignStatus(
  accessToken: string, 
  customerId: string, 
  developerToken: string,
  campaignId: string,
  status: 'ENABLED' | 'PAUSED'
) {
  const response = await fetch(
    `https://googleads.googleapis.com/v22/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          updateMask: 'status',
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

async function createCampaign(
  accessToken: string,
  customerId: string,
  developerToken: string,
  name: string,
  budgetAmountMicros: number,
  advertisingChannelType: string = 'SEARCH'
) {
  // First, create a campaign budget
  const budgetResponse = await fetch(
    `https://googleads.googleapis.com/v22/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          create: {
            name: `${name} - Budget`,
            amountMicros: budgetAmountMicros.toString(),
            deliveryMethod: 'STANDARD',
          }
        }]
      }),
    }
  );

  if (!budgetResponse.ok) {
    const errorText = await budgetResponse.text();
    console.error('[GADS] Budget creation error:', errorText);
    throw new Error(`Failed to create budget: ${errorText}`);
  }

  const budgetResult = await budgetResponse.json();
  const budgetResourceName = budgetResult.results?.[0]?.resourceName;
  
  if (!budgetResourceName) {
    throw new Error('Failed to get budget resource name');
  }

  console.log('[GADS] Budget created:', budgetResourceName);

  // Then create the campaign
  const campaignResponse = await fetch(
    `https://googleads.googleapis.com/v22/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          create: {
            name: name,
            advertisingChannelType: advertisingChannelType,
            status: 'PAUSED',
            campaignBudget: budgetResourceName,
            // Required for most campaign types
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
          }
        }]
      }),
    }
  );

  if (!campaignResponse.ok) {
    const errorText = await campaignResponse.text();
    console.error('[GADS] Campaign creation error:', errorText);
    throw new Error(`Failed to create campaign: ${errorText}`);
  }

  const result = await campaignResponse.json();
  console.log('[GADS] Campaign created:', JSON.stringify(result).slice(0, 200));
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const developerToken = Deno.env.get('GADS_DEVELOPER_TOKEN')?.trim();
    const customerId = Deno.env.get('GADS_ACCOUNT_ID')?.replace(/-/g, '').trim();

    if (!developerToken || !customerId) {
      console.error('[GADS] Missing configuration');
      return new Response(
        JSON.stringify({ error: 'Google Ads not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();
    console.log('[GADS] Action:', action, 'Data:', data ? JSON.stringify(data).slice(0, 200) : 'none');

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
      
      case 'createCampaign':
        if (!data?.name || !data?.dailyBudget) {
          throw new Error('Campaign name and daily budget required');
        }
        // Convert to micros (multiply by 1,000,000)
        const budgetMicros = Math.round(data.dailyBudget * 1000000);
        result = await createCampaign(
          accessToken, 
          customerId, 
          developerToken, 
          data.name, 
          budgetMicros,
          data.channelType || 'SEARCH'
        );
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
