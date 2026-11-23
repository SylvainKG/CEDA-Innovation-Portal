import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The browser Supabase client. This folder (`src/lib/api/supabase/`) is the only place allowed to import
 * supabase-js (ADR-001): screens use the ports in `src/lib/api/`.
 *
 * The URL and anon key are public by design; Row Level Security and the RPC checks protect the data.
 * Values come from the environment (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and are never committed.
 */
export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function readSupabaseConfig(env: Record<string, unknown>): SupabaseConfig {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : ''
  const anonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : ''
  if (!url || !anonKey) {
    throw new Error('VITE_API_MODE=supabase needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set.')
  }
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('VITE_SUPABASE_URL must be an https URL (http is allowed for a local stack only).')
  }
  const localHttp = parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
  if ((parsedUrl.protocol !== 'https:' && !localHttp) || parsedUrl.username || parsedUrl.password) {
    throw new Error('VITE_SUPABASE_URL must be an https URL (http is allowed for a local stack only).')
  }
  return { url, anonKey }
}

export function createBrowserClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
}
