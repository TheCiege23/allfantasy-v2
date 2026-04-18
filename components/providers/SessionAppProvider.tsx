'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Session } from 'next-auth'
import { usePathname, useRouter } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { supabase } from '@/lib/supabaseClient'

export default function SessionAppProvider({
  children,
  session,
}: {
  children: ReactNode
  session?: Session | null
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ""

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('AUTH EVENT:', event)

      const provider = typeof currentSession?.user?.app_metadata?.provider === 'string'
        ? currentSession.user.app_metadata.provider
        : ''
      const isOAuthProvider = provider.length > 0 && provider !== 'email'
      const isOAuthCallbackPath = pathname.startsWith('/auth/callback')

      if (
        event === 'SIGNED_IN' &&
        currentSession?.user &&
        isOAuthProvider &&
        isOAuthCallbackPath &&
        pathname !== '/settings'
      ) {
        router.push('/settings')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [pathname, router])

  // E2E harness routes should not require auth/session fetches.
  if (pathname?.startsWith('/e2e')) {
    return (
      <SessionProvider
        session={session ?? null}
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        {children}
      </SessionProvider>
    )
  }
  return <SessionProvider session={session}>{children}</SessionProvider>
}
