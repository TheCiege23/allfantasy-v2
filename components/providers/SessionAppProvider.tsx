'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'

export default function SessionAppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // E2E harness routes should not require auth/session fetches.
  if (pathname?.startsWith('/e2e')) {
    return (
      <SessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    )
  }
  return <SessionProvider>{children}</SessionProvider>
}
