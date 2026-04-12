// Shared API key validation with per-key rate limiting
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "./rate-limit.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ApiKeyValidation {
  valid: boolean;
  permissions: string[];
  keyId?: string;
  rateLimited?: boolean;
  rateLimitResetMs?: number;
}

export async function validateApiKeyWithRateLimit(
  apiKey: string,
  config: { maxRequests?: number; windowMs?: number } = {}
): Promise<ApiKeyValidation> {
  const { maxRequests = 100, windowMs = 60_000 } = config; // 100 req/min default

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Hash the API key for comparison
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('id, permissions, expires_at, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyData) {
    return { valid: false, permissions: [] };
  }

  if (!keyData.is_active) {
    return { valid: false, permissions: [] };
  }

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, permissions: [] };
  }

  // Per-key rate limiting
  const rateLimitResult = checkRateLimit(`api_key:${keyData.id}`, { maxRequests, windowMs });
  if (!rateLimitResult.allowed) {
    return {
      valid: true,
      permissions: keyData.permissions || ['read'],
      keyId: keyData.id,
      rateLimited: true,
      rateLimitResetMs: rateLimitResult.resetInMs,
    };
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id)
    .then(() => {});

  return { valid: true, permissions: keyData.permissions || ['read'], keyId: keyData.id };
}

export { rateLimitResponse };
