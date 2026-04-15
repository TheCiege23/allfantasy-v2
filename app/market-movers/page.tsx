import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MarketMoversClient } from './MarketMoversClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Market Movers – AllFantasy',
  description: 'Track trending player value changes, risers, fallers, buy-low and sell-high targets across fantasy sports.',
}

export default async function MarketMoversPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/market-movers')
  }

  return <MarketMoversClient />
}
