// Shared CORS configuration for Supabase Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to get CORS headers based on request origin
export const getCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',');
  
  // Allow all origins if '*' is in the allowed origins
  if (allowedOrigins.includes('*')) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': '*',
    };
  }
  
  if (allowedOrigins.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }
  
  // Default to wildcard for development
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': '*',
  };
};