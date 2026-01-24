// Shared CORS configuration for Supabase Edge Functions

// Default allowed origins for production and development
const DEFAULT_ALLOWED_ORIGINS = [
  'https://jiuflow.com',
  'https://jiuflow.art',
  'https://jiuflow.lovable.app',
  'https://id-preview--d4de17a3-a3d0-4f5e-810f-f2ba83ada41d.lovable.app',
  // Lovable preview sometimes uses this project-scoped domain as the page origin
  'https://d4de17a3-a3d0-4f5e-810f-f2ba83ada41d.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to get CORS headers based on request origin
export const getCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get('origin') || '';
  
  // Get allowed origins from environment variable, or use defaults
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = envOrigins 
    ? envOrigins.split(',').map(o => o.trim())
    : DEFAULT_ALLOWED_ORIGINS;
  
  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }
  
  // If origin not in allowed list, return first allowed origin (will fail CORS check)
  // This prevents wildcard CORS while still providing valid headers
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigins[0] || 'https://jiuflow.com',
  };
};