'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { BigBrotherCommandDashboard } from '@/components/big-brother/BigBrotherCommandDashboard'

/**
 * Commissioner landing after Big Brother league creation (`bblId` = main app `League.id`).
 */
export default function BigBrotherCommandPage() {
  const params = useParams<{ bblId: string }>() ?? ({} as { bblId: string })
  const searchParams = useSearchParams()
  const bblId = params?.bblId
  const created = searchParams?.get('created') === '1'

  if (!bblId) return null

  return (
    <div className="min-h-screen bg-[#040915] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/league/${encodeURIComponent(bblId)}`}
          className="inline-block text-[13px] text-cyan-400 hover:underline"
          data-testid="bb-command-back-league"
        >
          ← League hub
        </Link>
        {created ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-[13px] text-emerald-100/95">
            League created — week 1 is staged (HOH_OPEN). Invite the house and run the draft when ready.
          </div>
        ) : null}
        <BigBrotherCommandDashboard leagueId={bblId} />
      </div>
    </div>
  )
}
