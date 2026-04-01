import type { DraftPlayerPoolEntry } from '@/lib/workers/draft-worker'

export function PlayerPoolRow({
  player,
  recommended = false,
  onSelect,
}: {
  player: DraftPlayerPoolEntry
  recommended?: boolean
  onSelect?: (playerId: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-cyan-200">ADP {player.adp ?? '-'}</span>
          {recommended ? (
            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
              RECOMMENDED
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm font-semibold text-white">{player.name}</p>
        <p className="text-xs text-white/55">
          {player.position}
          {player.team ? ` • ${player.team}` : ''}
          {player.projectedPoints != null ? ` • ${player.projectedPoints.toFixed(1)} proj` : ''}
        </p>
      </div>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(player.playerId)}
          className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
        >
          Pick
        </button>
      ) : null}
    </div>
  )
}
