import { Suspense } from 'react'
import { DraftRoomHarnessClient } from '@/app/e2e/draft-room/DraftRoomHarnessClient'

export default async function E2eDraftRoomHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string; sport?: string; commissioner?: string; formatType?: string }>
}) {
  const sp = await searchParams
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0f] p-6 text-sm text-white/70">Loading draft harness…</main>
      }
    >
      <DraftRoomHarnessClient
        leagueId={sp.leagueId ?? 'e2e-league'}
        sport={sp.sport ?? 'NFL'}
        formatType={sp.formatType}
        isCommissioner={sp.commissioner !== '0'}
      />
    </Suspense>
  )
}
