import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { safeRedirectPath } from '@/lib/auth/auth-intent-resolver'

export type SupabaseOAuthProvider = 'google' | 'apple'

let browserClient: SupabaseClient | null = null

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function isSupabaseGoogleOAuthReady(): boolean {
  return Boolean(getSupabaseConfig())
}

export function buildSupabaseOAuthRedirectTo(input: {
  callbackUrl: string
}): string | null {
  if (typeof window === 'undefined') return null
  const safeCallback = safeRedirectPath(input.callbackUrl)
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeCallback)}`
}

function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  const config = getSupabaseConfig()
  if (!config) return null
  if (!browserClient) {
    browserClient = createClient(config.url, config.anonKey)
  }
  return browserClient
}

export async function signInWithSupabaseOAuth(input: {
  provider: SupabaseOAuthProvider
  callbackUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }
  }
  const redirectTo = buildSupabaseOAuthRedirectTo({
    callbackUrl: input.callbackUrl,
  })
  if (!redirectTo) {
    return { ok: false, error: 'WINDOW_NOT_AVAILABLE' }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: input.provider,
    options: {
      redirectTo,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function signInWithSupabaseGoogle(input: {
  callbackUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  return signInWithSupabaseOAuth({
    provider: 'google',
    callbackUrl: input.callbackUrl,
  })
}
