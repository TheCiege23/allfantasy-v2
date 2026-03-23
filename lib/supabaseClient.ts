import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

type OAuthArgs = {
  provider: 'google' | 'apple'
  options?: {
    redirectTo?: string
  }
}

const fallbackSupabase = {
  auth: {
    async signInWithOAuth(_: OAuthArgs) {
      return {
        data: null,
        error: { message: 'SUPABASE_NOT_CONFIGURED' },
      }
    },
    async getSession() {
      return {
        data: { session: null },
        error: { message: 'SUPABASE_NOT_CONFIGURED' },
      }
    },
    async getUser() {
      return {
        data: { user: null },
        error: { message: 'SUPABASE_NOT_CONFIGURED' },
      }
    },
  },
  from(_: string) {
    return {
      async upsert(_: Record<string, unknown>) {
        return {
          data: null,
          error: { message: 'SUPABASE_NOT_CONFIGURED' },
        }
      },
    }
  },
} as unknown as SupabaseClient

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : fallbackSupabase
