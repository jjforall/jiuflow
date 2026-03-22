// CORS configuration for frontend (Vite environment)

const DEFAULT_ORIGIN = 'https://jiuflow.art';

export const corsHeaders = {
  'Access-Control-Allow-Origin': import.meta.env.VITE_ALLOWED_ORIGINS || DEFAULT_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to get CORS headers based on request origin
export const getCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = (import.meta.env.VITE_ALLOWED_ORIGINS || `${DEFAULT_ORIGIN},http://localhost:5173`).split(',');
  
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }
  
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins[0],
  };
};