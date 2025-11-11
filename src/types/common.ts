
// Common type definitions to replace 'any':

// For error handlers
export type ErrorResponse = {
  error: string;
  details?: unknown;
};

// For API responses
export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

// For Supabase errors
export type SupabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

// For form data
export type FormData<T> = {
  [K in keyof T]: T[K];
};

// For event handlers
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
