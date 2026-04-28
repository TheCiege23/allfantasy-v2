import { Suspense } from 'react'
import { DraftRoomHarnessClient } from '@/app/e2e/draft-room/DraftRoomHarnessClient'

export default async function E2eDraftRoomHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{
    leagueId?: string | string[]
    sport?: string
    commissioner?: string
    formatType?: string
    /** When `1`, skip the harness gate and mount {@link DraftRoomPageClient} immediately (Playwright / narrow E2E). */
    e2eRoom?: string
  }>
}) {
  const sp = await searchParams
  const rawLeagueId = sp.leagueId
  const leagueId =
    typeof rawLeagueId === 'string' && rawLeagueId.trim().length > 0
      ? rawLeagueId.trim()
      : Array.isArray(rawLeagueId)
        ? String(rawLeagueId.find((x) => typeof x === 'string' && x.trim().length > 0) ?? '').trim() ||
          'e2e-league'
        : 'e2e-league'
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0f] p-6 text-sm text-white/70">Loading draft harness…</main>
      }
    >
      <DraftRoomHarnessClient
        leagueId={leagueId}
        sport={sp.sport ?? 'NFL'}
        formatType={sp.formatType}
        isCommissioner={sp.commissioner !== '0'}
        initialRoomOpen={sp.e2eRoom === '1'}
      />
    </Suspense>
  )
}
