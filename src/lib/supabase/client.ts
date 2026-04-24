import { createBrowserClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key"

// One instance shared across the whole browser session.
// Multiple instances = each has independent auth state, causing queries to
// run without a valid Authorization header on page reload.
let _instance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (typeof window === "undefined") {
    // SSR path: always create a fresh instance per request
    return createBrowserClient(url, key)
  }
  if (!_instance) {
    _instance = createBrowserClient(url, key)
  }
  return _instance
}

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
