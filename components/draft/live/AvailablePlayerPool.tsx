'use client'

/**
 * Lightweight pool list for compact layouts — full ADP/search remains in `DraftRoomPageClient`.
 */
export function AvailablePlayerPool({
  players,
  onSelect,
  disabled,
}: {
  players: Array<{ id: string; name: string; position: string; team?: string | null }>
  onSelect?: (playerId: string) => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-available-pool-preview">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Available</p>
      </div>
      <ul className="max-h-[min(50vh,360px)] divide-y divide-white/[0.05] overflow-y-auto">
        {players.slice(0, 40).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(p.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-white/90 hover:bg-white/[0.04] disabled:opacity-40"
            >
              <span className="min-w-0 truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-white/45">
                {p.position}
                {p.team ? ` · ${p.team}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
