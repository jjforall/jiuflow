// Utility functions for safe search parameter handling

const MAX_SEARCH_LENGTH = 100;

/**
 * Sanitize search input for LIKE/ILIKE queries
 * - Escapes SQL LIKE special characters (%, _)
 * - Trims and limits length
 * - Returns null if input is empty or invalid
 */
export function sanitizeSearchTerm(search: string | null | undefined): string | null {
  if (!search || typeof search !== 'string') {
    return null;
  }
  
  // Trim and limit length
  let sanitized = search.trim().slice(0, MAX_SEARCH_LENGTH);
  
  if (sanitized.length === 0) {
    return null;
  }
  
  // Escape LIKE special characters
  // % matches any sequence of characters
  // _ matches any single character
  // \ is the escape character in PostgreSQL LIKE patterns
  sanitized = sanitized
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape percent signs
    .replace(/_/g, '\\_');    // Escape underscores
  
  return sanitized;
}

/**
 * Build a safe ILIKE filter string for Supabase .or() queries
 * @param fields - Array of field names to search
 * @param search - Raw search input from user
 * @returns Filter string for .or() or null if search is invalid
 */
export function buildSafeIlikeFilter(fields: string[], search: string | null | undefined): string | null {
  const sanitized = sanitizeSearchTerm(search);
  if (!sanitized) {
    return null;
  }
  
  return fields.map(field => `${field}.ilike.%${sanitized}%`).join(',');
}
