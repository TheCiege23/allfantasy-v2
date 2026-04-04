'use client'

type Props = {
  activeCount: number
  taxiCount: number
  devyCount: number
  rookiePickCount: number
  devyPickCount: number
  maxDevySlots: number
}

export function TeamSummaryBar({
  activeCount,
  taxiCount,
  devyCount,
  rookiePickCount,
  devyPickCount,
  maxDevySlots,
}: Props) {
  const pipeline = devyCount + taxiCount
  const ratio = maxDevySlots > 0 ? Math.min(1, pipeline / maxDevySlots) : 0
  const label = ratio >= 0.66 ? 'Strong' : ratio >= 0.33 ? 'Average' : 'Thin'

  return (
    <div className="border-b border-white/[0.06] bg-[color:var(--devy-panel)] px-4 py-3">
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
        <Chip emoji="🏈" label="NFL Players" value={activeCount} color="var(--devy-active)" />
        <Chip emoji="🚕" label="Taxi" value={taxiCount} color="var(--devy-taxi)" />
        <Chip emoji="🎓" label="Devy" value={devyCount} color="var(--devy-devy)" />
        <Chip emoji="📋" label="Rookie picks" value={rookiePickCount} color="var(--devy-rookie)" />
        <Chip emoji="🎓" label="Devy picks" value={devyPickCount} color="var(--devy-devy)" />
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2 text-[11px] text-white/55">
          <span>
            Pipeline: <span className="font-semibold text-white/80">{pipeline}</span> prospects in system
          </span>
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
            {label}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${ratio * 100}%`,
              background: 'linear-gradient(90deg, var(--devy-devy), var(--devy-taxi))',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function Chip({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string
  label: string
  value: number
  color: string
}) {
  return (
    <div
      className="flex min-w-[120px] flex-shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2"
      style={{ borderColor: `${color}33` }}
    >
      <span className="text-[16px]">{emoji}</span>
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-wide text-white/45">{label}</p>
        <p className="text-[15px] font-bold tabular-nums" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  )
}
