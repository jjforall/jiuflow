// Shared CORS configuration for Supabase Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to get CORS headers based on request origin
export const getCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://jiuflow.com,http://localhost:5173').split(',');
  
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }
  
  // Default to the first allowed origin if request origin is not in the list
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins[0],
  };
};