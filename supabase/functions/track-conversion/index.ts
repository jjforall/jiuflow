import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversionData {
  event_name: string;
  user_id?: string;
  email?: string;
  plan?: string;
  value: number;
  currency?: string;
  transaction_id?: string;
}

// Helper to hash email for Meta/Google
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Send to GA4 Measurement Protocol
async function sendToGA4(data: ConversionData): Promise<void> {
  const measurementId = Deno.env.get("VITE_GA_MEASUREMENT_ID") || "G-WLT5FXPQS1";
  const apiSecret = Deno.env.get("GA4_API_SECRET");
  
  if (!apiSecret) {
    console.log("[GA4] API Secret not configured, skipping");
    return;
  }

  const clientId = data.user_id ? `${data.user_id}.auto` : `anonymous.${Date.now()}`;
  
  const payload = {
    client_id: clientId,
    user_id: data.user_id,
    events: [{
      name: data.event_name,
      params: {
        user_id: data.user_id,
        plan: data.plan,
        value: data.value,
        currency: data.currency || "JPY",
        transaction_id: data.transaction_id,
      }
    }]
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`[GA4] Sent ${data.event_name}, status: ${response.status}`);
  } catch (error) {
    console.error("[GA4] Error:", error);
  }
}

// Send to Meta Conversions API
async function sendToMeta(data: ConversionData): Promise<void> {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  
  if (!pixelId || !accessToken) {
    console.log("[META] Pixel ID or Access Token not configured, skipping");
    return;
  }

  const hashedEmail = data.email ? await hashEmail(data.email) : undefined;
  
  const payload = {
    data: [{
      event_name: data.event_name === "purchase" ? "Purchase" : "Subscribe",
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: {
        em: hashedEmail ? [hashedEmail] : undefined,
        external_id: data.user_id ? [data.user_id] : undefined,
      },
      custom_data: {
        currency: data.currency || "JPY",
        value: data.value,
        content_name: data.plan,
      }
    }]
  };

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    console.log(`[META] Sent ${data.event_name}, result:`, result);
  } catch (error) {
    console.error("[META] Error:", error);
  }
}

// Send to Google Ads Enhanced Conversions API
async function sendToGoogleAds(data: ConversionData): Promise<void> {
  const clientId = Deno.env.get("GADS_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("GADS_CLIENT_SECRET")?.trim();
  const developerToken = Deno.env.get("GADS_DEVELOPER_TOKEN")?.trim();
  const refreshToken = Deno.env.get("GADS_REFRESH_TOKEN")?.trim();
  const accountId = Deno.env.get("GADS_ACCOUNT_ID")?.trim();
  const conversionActionId = Deno.env.get("GADS_CONVERSION_ID")?.trim();
  
  if (!clientId || !clientSecret || !refreshToken || !developerToken || !accountId || !conversionActionId) {
    console.log("[GADS] Credentials not fully configured, skipping");
    console.log("[GADS] Missing:", {
      clientId: !!clientId,
      clientSecret: !!clientSecret,
      refreshToken: !!refreshToken,
      developerToken: !!developerToken,
      accountId: !!accountId,
      conversionActionId: !!conversionActionId,
    });
    return;
  }

  // Validate conversionActionId is numeric
  const cleanConversionActionId = conversionActionId.replace(/\D/g, "");
  if (!cleanConversionActionId) {
    console.error("[GADS] GADS_CONVERSION_ID must be a numeric ID (e.g., '123456789'), got:", conversionActionId);
    return;
  }

  if (!data.email) {
    console.log("[GADS] Email required for Enhanced Conversions, skipping");
    return;
  }

  try {
    // Step 1: Get access token using refresh token
    console.log("[GADS] Requesting access token...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    const tokenText = await tokenResponse.text();
    console.log(`[GADS] Token response status: ${tokenResponse.status}`);
    
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[GADS] Token response is not JSON:", tokenText.substring(0, 200));
      return;
    }
    
    if (!tokenData.access_token) {
      console.error("[GADS] Failed to get access token:", JSON.stringify(tokenData));
      return;
    }
    
    console.log("[GADS] Access token obtained successfully");

    // Step 2: Prepare Enhanced Conversion data
    const customerId = accountId.replace(/-/g, "");
    const hashedEmail = await hashEmail(data.email);
    
    // Format datetime for Google Ads (yyyy-MM-dd HH:mm:ss+TZ)
    const now = new Date();
    const conversionDateTime = now.toISOString().replace("T", " ").split(".")[0] + "+09:00";
    
    // Generate a unique order_id if not provided
    const orderId = data.transaction_id || `jiuflow_${data.user_id}_${Date.now()}`;
    
    // Enhanced Conversion payload with user identifiers
    const conversionPayload = {
      conversions: [{
        conversionAction: `customers/${customerId}/conversionActions/${cleanConversionActionId}`,
        conversionDateTime: conversionDateTime,
        conversionValue: data.value,
        currencyCode: data.currency || "JPY",
        orderId: orderId,
        // User identifiers for Enhanced Conversions
        userIdentifiers: [
          {
            hashedEmail: hashedEmail,
            userIdentifierSource: "FIRST_PARTY"
          }
        ],
        // Consent settings (required for Enhanced Conversions)
        consent: {
          adUserData: "GRANTED",
          adPersonalization: "GRANTED"
        }
      }],
      partialFailure: true,
    };

    console.log("[GADS] Conversion payload:", JSON.stringify(conversionPayload, null, 2));

    // Step 3: Upload Enhanced Conversion (using v16 for stability)
    const uploadUrl = `https://googleads.googleapis.com/v16/customers/${customerId}:uploadClickConversions`;
    
    console.log(`[GADS] Uploading Enhanced Conversion to ${uploadUrl}`);
    
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
        "login-customer-id": customerId,
      },
      body: JSON.stringify(conversionPayload),
    });
    
    const resultText = await response.text();
    console.log(`[GADS] Upload response status: ${response.status}`);
    
    try {
      const result = JSON.parse(resultText);
      if (response.ok) {
        console.log("[GADS] Enhanced Conversion uploaded successfully:", JSON.stringify(result));
      } else {
        console.error("[GADS] Upload failed:", JSON.stringify(result));
      }
    } catch {
      console.error("[GADS] Upload response is not JSON:", resultText.substring(0, 500));
    }
  } catch (error) {
    console.error("[GADS] Error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ConversionData = await req.json();
    
    console.log(`[TRACK-CONVERSION] Processing ${data.event_name}:`, {
      user_id: data.user_id,
      plan: data.plan,
      value: data.value,
    });

    // Send to all platforms in parallel
    await Promise.allSettled([
      sendToGA4(data),
      sendToMeta(data),
      sendToGoogleAds(data),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TRACK-CONVERSION] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
