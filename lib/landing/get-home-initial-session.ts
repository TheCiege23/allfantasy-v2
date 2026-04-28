import 'server-only'

import type { Session } from 'next-auth'

/**
 * Loads session for the marketing home page without statically coupling `app/page.tsx`
 * to the full `@/lib/auth` graph (Prisma, providers, etc.). That graph has triggered
 * Next 14 dev webpack `Cannot read properties of undefined (reading 'call')` during RSC.
 */
export async function getHomeInitialSession(): Promise<Session | null> {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import('next-auth'),
    import('@/lib/auth'),
  ])
  return (await getServerSession(authOptions as never)) as Session | null
}
