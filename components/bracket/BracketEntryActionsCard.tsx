import Link from 'next/link'
import { Sparkles, Copy } from 'lucide-react'

export default function BracketEntryActionsCard({
  leagueId,
  tournamentId,
  entryId,
}: {
  leagueId: string
  tournamentId: string
  entryId: string
}) {
  const entryUrl = `/bracket/${tournamentId}/entry/${entryId}`
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Entry Actions</h3>
      <div className="flex flex-col gap-2">
        <Link href={`/brackets/leagues/${leagueId}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition">Back to Pool</Link>
        <Link href={`/af-legacy?tab=chat&leagueId=${leagueId}`} className="rounded-lg border border-cyan-400/35 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20 transition inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Open AI Coach</Link>
        <button
          onClick={() => navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}${entryUrl}` : entryUrl)}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition inline-flex items-center gap-1.5"
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />Copy Entry Link
        </button>
      </div>
    </div>
  )
}
