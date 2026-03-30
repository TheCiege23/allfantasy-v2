import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MockDraftSharedReplayTimeline } from '@/components/mock-draft/MockDraftSharedReplayTimeline'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

type SharedReplayPick = {
  overall: number
  round: number
  pick: number
  manager: string
  playerName: string
  position: string
  team?: string | null
}

export const dynamic = 'force-dynamic'

export default async function SharedMockDraftReplayPage({
  params,
}: {
  params: { shareId: string }
}) {
  const draft = await prisma.mockDraft.findUnique({
    where: { shareId: params.shareId },
    include: {
      league: { select: { name: true } },
      user: { select: { displayName: true } },
    },
  })
  if (!draft) notFound()

  const picks = Array.isArray(draft.results) ? (draft.results as unknown as SharedReplayPick[]) : []
  if (picks.length === 0) notFound()

  const title = draft.league?.name ?? `${draft.user?.displayName || 'Shared'} Mock`
  const metadata = (draft.metadata && typeof draft.metadata === 'object') ? (draft.metadata as { sport?: string }) : null
  const sport = metadata?.sport ?? DEFAULT_SPORT

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <Link
            href={`/mock-draft/share/${encodeURIComponent(params.shareId)}`}
            className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
          >
            Back to shared board
          </Link>
          <span className="text-white/45">Share ID: {params.shareId}</span>
        </div>
        <MockDraftSharedReplayTimeline picks={picks} title={title} sport={sport} />
      </div>
    </div>
  )
}

