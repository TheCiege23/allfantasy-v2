import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { CreateLeaguePageClient } from './CreateLeaguePageClient'

export const dynamic = 'force-dynamic'

export default async function LeaguesCreatePage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/leagues/create')
  }

  return <CreateLeaguePageClient />
}
