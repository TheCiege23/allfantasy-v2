'use client'

import { useCountUp } from './useCountUp'
import { useReducedMotion } from './useWarRoomMotion'

type ChampionshipGaugeProps = {
  /** 0-100. Real value from season-forecast's championshipProbability (already computed server-side). */
  percent: number
  label: string
  size?: number
  accent?: string
}

/** Small ring gauge — used for Championship Odds / Playoff Odds inside MyLeagueCard. */
export function ChampionshipGauge({ percent, label, size = 64, accent = '#fbbf24' }: ChampionshipGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const { value, ref } = useCountUp<HTMLDivElement>(clamped)
  const reduced = useReducedMotion()
  const displayed = reduced ? clamped : value

  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - displayed / 100)

  return (
    <div ref={ref} className="flex flex-col items-center gap-1" data-testid="championship-gauge">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: reduced ? 'none' : 'stroke-dashoffset 300ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[13px] font-black tabular-nums text-white">{displayed}%</span>
        </div>
      </div>
      <p className="text-center text-[9px] font-bold uppercase tracking-wider text-white/45">{label}</p>
    </div>
  )
}
