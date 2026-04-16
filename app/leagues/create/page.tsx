import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { RedraftLeagueCreateClient } from '@/components/leagues/RedraftLeagueCreateClient'

export const dynamic = 'force-dynamic'

/** Alternate URL for the same redraft create flow as `/create-league`. */
export default async function LeaguesCreatePage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/leagues/create')
  }

  return (
    <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
      <RedraftLeagueCreateClient loginCallbackPath="/leagues/create" />
    </div>
  )
}
