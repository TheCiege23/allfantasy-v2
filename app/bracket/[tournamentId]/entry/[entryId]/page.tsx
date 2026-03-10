import { prisma } from "@/lib/prisma"
import { BracketTreeView } from "@/components/bracket/BracketTreeView"
import { Leaderboard } from "@/components/bracket/Leaderboard"
import { PickAssistCard } from "@/components/bracket/PickAssistCard"
import BracketShell from "@/components/bracket/BracketShell"
import BracketEntryActionsCard from "@/components/bracket/BracketEntryActionsCard"
import Link from "next/link"
import { requireVerifiedSession } from "@/lib/require-verified"
import { getEntryBracketData } from "@/lib/brackets/getEntryBracketData"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

export default async function EntryBracketPage({
  params,
}: {
  params: { tournamentId: string; entryId: string }
}) {
  const { userId } = await requireVerifiedSession()

  const entry = await prisma.bracketEntry.findUnique({
    where: { id: params.entryId },
    select: { id: true, userId: true, leagueId: true, name: true, league: { select: { tournamentId: true } } },
  })

  if (!entry || entry.userId !== userId)
    return <div className="p-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Bracket entry not found.</div>
  if (entry.league.tournamentId !== params.tournamentId)
    return <div className="p-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Wrong tournament.</div>

  const { nodesWithGame, pickMap } = await getEntryBracketData(params.tournamentId, entry.id)
  const totalPicks = Object.values(pickMap || {}).filter(Boolean).length
  const totalGames = (nodesWithGame || []).filter((n: any) => Number(n?.round || 0) >= 1).length
  const completionPct = totalGames > 0 ? Math.round((totalPicks / totalGames) * 100) : 0

  return (
    <div className="min-h-screen text-white" style={{ background: '#0d1117' }}>
      <BracketShell>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/brackets/leagues/${entry.leagueId}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">{entry.name || "My Bracket"}</h1>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Fill out your bracket</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs text-white/55">Picks Made</div>
              <div className="text-lg font-semibold text-white">{totalPicks}/{totalGames || 0}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs text-white/55">Completion</div>
              <div className="text-lg font-semibold text-white">{completionPct}%</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs text-white/55">Status</div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Editable</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <BracketTreeView
              tournamentId={params.tournamentId}
              leagueId={entry.leagueId}
              entryId={entry.id}
              nodes={nodesWithGame as any}
              initialPicks={pickMap}
            />

            <div className="space-y-4">
              <BracketEntryActionsCard
                leagueId={entry.leagueId}
                tournamentId={params.tournamentId}
                entryId={entry.id}
              />
              <Leaderboard tournamentId={params.tournamentId} leagueId={entry.leagueId} />
              <PickAssistCard entryId={entry.id} />
            </div>
          </div>
        </div>
      </BracketShell>
    </div>
  )
}
