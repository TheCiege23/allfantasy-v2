import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  const config = getSupabaseConfig()
  if (!config) return null
  if (!browserClient) {
    browserClient = createClient(config.url, config.anonKey)
  }
  return browserClient
}

export async function signInWithSupabaseGoogle(input: {
  callbackUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { ok: false, error: 'SUPABASE_NOT_CONFIGURED' }
  }
  const safeCallback = input.callbackUrl.startsWith('/')
    ? input.callbackUrl
    : '/dashboard'
  const redirectTo = `${window.location.origin}${safeCallback}`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
