'use client'

type Props = {
  activeSalary: number
  deadMoney: number
  availableCap: number
  totalCap: number
  year: number
  onYearChange?: (y: number) => void
  yearOptions?: number[]
}

export function CapOverviewBar({
  activeSalary,
  deadMoney,
  availableCap,
  totalCap,
  year,
  onYearChange,
  yearOptions,
}: Props) {
  const t = Math.max(totalCap, 0.001)
  const a = Math.max(0, activeSalary)
  const d = Math.max(0, deadMoney)
  const v = Math.max(0, availableCap)
  const sum = a + d + v
  const scale = sum > 0 ? sum : t
  const pActive = scale > 0 ? (a / scale) * 100 : 0
  const pDead = scale > 0 ? (d / scale) * 100 : 0
  const pAvail = Math.max(0, 100 - pActive - pDead)

  const years = yearOptions ?? [year, year + 1, year + 2, year + 3]

  return (
    <div className="space-y-3" data-testid="cap-overview-bar">
      {onYearChange ? (
        <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => onYearChange(y)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                y === year ? 'bg-sky-500/20 text-sky-100' : 'text-white/45 hover:bg-white/[0.04]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="flex h-4 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--cap-bar-bg)' }}
      >
        <div
          className="h-full bg-[color:var(--cap-contract)] transition-all"
          style={{ width: `${pActive}%` }}
          title="Active salary"
        />
        <div
          className="h-full bg-[color:var(--cap-dead)] transition-all"
          style={{ width: `${pDead}%` }}
          title="Dead money"
        />
        <div
          className="h-full bg-[color:var(--cap-green)]/90 transition-all"
          style={{ width: `${pAvail}%` }}
          title="Available"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-[color:var(--cap-contract)]/30 bg-[color:var(--cap-contract)]/10 px-2 py-1 font-semibold text-blue-100">
          Active: ${a.toFixed(1)}M
        </span>
        <span className="rounded-full border border-[color:var(--cap-dead)]/30 bg-white/[0.04] px-2 py-1 font-semibold text-white/60">
          Dead: ${d.toFixed(1)}M
        </span>
        <span className="rounded-full border border-[color:var(--cap-green)]/30 bg-[color:var(--cap-green)]/10 px-2 py-1 font-semibold text-emerald-100">
          Available: ${v.toFixed(1)}M
        </span>
      </div>
    </div>
  )
}
