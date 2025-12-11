import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';

async function getCampaigns(adAccountId: string, accessToken: string) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,insights.date_preset(last_30d){impressions,clicks,spend,reach,cpc,cpm,ctr,actions,cost_per_action_type}',
    limit: '100',
  });

  console.log('[META] Fetching campaigns from:', url);
  
  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[META] Campaign fetch error:', errorText);
    throw new Error(`Failed to fetch campaigns: ${errorText}`);
  }

  const data = await response.json();
  console.log('[META] Campaigns fetched:', data.data?.length || 0);
  return data.data || [];
}

async function getAdSets(adAccountId: string, accessToken: string, campaignId?: string) {
  let url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/adsets`;
  
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,insights.date_preset(last_30d){impressions,clicks,spend,reach,actions}',
    limit: '100',
  });

  if (campaignId) {
    params.append('filtering', JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]));
  }

  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[META] AdSets fetch error:', errorText);
    throw new Error(`Failed to fetch ad sets: ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function getAccountInsights(adAccountId: string, accessToken: string, datePreset: string = 'last_30d') {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights`;
  const params = new URLSearchParams({
    access_token: accessToken,
    date_preset: datePreset,
    fields: 'impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type,purchase_roas',
    level: 'account',
  });

  console.log('[META] Fetching account insights');
  
  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[META] Insights fetch error:', errorText);
    throw new Error(`Failed to fetch insights: ${errorText}`);
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

async function getDailyInsights(adAccountId: string, accessToken: string, dateRange: string = 'last_30d') {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights`;
  const params = new URLSearchParams({
    access_token: accessToken,
    date_preset: dateRange,
    fields: 'impressions,clicks,spend,reach,cpc,cpm,ctr,actions,cost_per_action_type',
    level: 'account',
    time_increment: '1', // Daily breakdown
  });

  console.log('[META] Fetching daily insights');
  
  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[META] Daily insights error:', errorText);
    throw new Error(`Failed to fetch daily insights: ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function updateCampaignStatus(adAccountId: string, accessToken: string, campaignId: string, status: string) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      status: status.toUpperCase(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update campaign: ${errorText}`);
  }

  return await response.json();
}

async function updateCampaignBudget(adAccountId: string, accessToken: string, campaignId: string, dailyBudget: number) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}`;
  
  // Budget in cents
  const budgetInCents = Math.round(dailyBudget * 100);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      daily_budget: budgetInCents,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update budget: ${errorText}`);
  }

  return await response.json();
}

async function getAccountInfo(adAccountId: string, accessToken: string) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent,balance',
  });

  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch account info: ${errorText}`);
  }

  return await response.json();
}

async function createCampaign(
  adAccountId: string, 
  accessToken: string, 
  name: string, 
  objective: string, 
  dailyBudget: number,
  status: string = 'PAUSED'
) {
  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns`;
  
  // Budget in cents
  const budgetInCents = Math.round(dailyBudget * 100);
  
  const body: Record<string, unknown> = {
    access_token: accessToken,
    name,
    objective: objective.toUpperCase(),
    status: status.toUpperCase(),
    special_ad_categories: [],
  };

  console.log('[META] Creating campaign:', name, 'objective:', objective);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[META] Create campaign error:', errorText);
    throw new Error(`Failed to create campaign: ${errorText}`);
  }

  const result = await response.json();
  console.log('[META] Campaign created:', result.id);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    const adAccountId = Deno.env.get('META_AD_ACCOUNT_ID')?.replace('act_', '');

    if (!accessToken || !adAccountId) {
      console.error('[META] Missing configuration');
      return new Response(
        JSON.stringify({ error: 'Meta Ads not configured. Please set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();
    console.log('[META] Action:', action, 'Data:', JSON.stringify(data || {}).slice(0, 200));

    let result;

    switch (action) {
      case 'getAccountInfo':
        result = await getAccountInfo(adAccountId, accessToken);
        break;

      case 'getCampaigns':
        result = await getCampaigns(adAccountId, accessToken);
        break;
      
      case 'getAdSets':
        result = await getAdSets(adAccountId, accessToken, data?.campaignId);
        break;
      
      case 'getInsights':
        result = await getAccountInsights(adAccountId, accessToken, data?.datePreset || 'last_30d');
        break;

      case 'getDailyInsights':
        result = await getDailyInsights(adAccountId, accessToken, data?.dateRange || 'last_30d');
        break;
      
      case 'updateCampaignStatus':
        if (!data?.campaignId || !data?.status) {
          throw new Error('Campaign ID and status required');
        }
        result = await updateCampaignStatus(adAccountId, accessToken, data.campaignId, data.status);
        break;
      
      case 'updateBudget':
        if (!data?.campaignId || data?.dailyBudget === undefined) {
          throw new Error('Campaign ID and daily budget required');
        }
        result = await updateCampaignBudget(adAccountId, accessToken, data.campaignId, data.dailyBudget);
        break;
      
      case 'createCampaign':
        if (!data?.name || !data?.objective || !data?.dailyBudget) {
          throw new Error('Name, objective, and daily budget required');
        }
        result = await createCampaign(
          adAccountId, 
          accessToken, 
          data.name, 
          data.objective, 
          data.dailyBudget,
          data.status || 'PAUSED'
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
    console.error('[META] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
