'use client'

import { PlayerImage } from '@/app/components/PlayerImage'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'

const ROLES = [
  'Edge Rusher',
  'Run Stopper LB',
  'Box Safety',
  'Cover Corner',
  'Ball Hawk',
  'Interior DL',
] as const

type Props = {
  playerId: string
  name: string
  position: string
  sport: string
  players: PlayerMap
  salaryM: number
  years: number
  capEff: number
  snapsPct: number
}

export function DefenderRoleCard({
  playerId,
  name,
  position,
  sport,
  players,
  salaryM,
  years,
  capEff,
  snapsPct,
}: Props) {
  const p = players[playerId]
  const role = ROLES[Math.abs(playerId.charCodeAt(0) ?? 0) % ROLES.length]
  const effColor =
    capEff > 2 ? 'text-[color:var(--cap-green)]' : capEff > 1 ? 'text-[color:var(--cap-amber)]' : 'text-[color:var(--cap-red)]'

  return (
    <div
      className="rounded-xl border border-white/[0.07] bg-[#0c101a] p-3"
      data-testid={`defender-role-${playerId}`}
    >
      <div className="flex gap-3">
        <PlayerImage
          sleeperId={playerId}
          sport={sport}
          name={name}
          position={position}
          espnId={p?.espn_id}
          nbaId={p?.nba_id}
          size={48}
          variant="round"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{name}</p>
          <p className="text-[10px] text-white/45">{position}</p>
          <span className="mt-1 inline-block rounded-full border border-red-500/30 bg-red-950/30 px-2 py-0.5 text-[9px] font-semibold text-red-100">
            {role}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/60">
          IDP pts (mock)
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/60">
          Snap {snapsPct}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-sky-500/60" style={{ width: `${snapsPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/55">
        <span>
          ${salaryM.toFixed(1)}M · {years}yr
        </span>
        <span className={effColor}>{capEff.toFixed(1)} pts/$M</span>
      </div>
    </div>
  )
}
