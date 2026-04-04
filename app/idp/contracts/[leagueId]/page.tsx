import { Suspense } from 'react'
import { ContractCenterClient } from './ContractCenterClient'

export const dynamic = 'force-dynamic'

export default async function ContractCenterPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#040915] p-6 text-white/50">Loading…</div>}>
      <ContractCenterClient leagueId={leagueId} />
    </Suspense>
  )
}
