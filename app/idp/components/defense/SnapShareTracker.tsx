'use client'

type Row = { playerId: string; name: string; last: number; thisWeek: number; trend: 'up' | 'down' | 'flat' }

export function SnapShareTracker({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0c101a] p-4" data-testid="snap-share-tracker">
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-white/45">Snap share tracker</h3>
      <p className="mb-3 text-[10px] text-white/40">Snap data may have a 24–48h delay for some games.</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.playerId}
            className="flex items-center justify-between rounded-lg border border-white/[0.05] px-2 py-2 text-[11px]"
          >
            <span className="font-medium text-white/85">{r.name}</span>
            <span className="text-white/45">{r.last}% → {r.thisWeek}%</span>
            <span>
              {r.trend === 'up' ? '🟢 ▲' : r.trend === 'down' ? '🔴 ▼' : '⚪ —'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
