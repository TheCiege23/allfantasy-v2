'use client'

import { PlayerImage } from '@/app/components/PlayerImage'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import { mockIdpPoints, mockStatPills, idpRoleLabel } from './idpPositionUtils'

const PILL_STYLES: Record<string, string> = {
  SOLO: 'border-[color:var(--idp-tackle)]/50 bg-[color:var(--idp-tackle)]/15 text-amber-100',
  AST: 'border-white/20 bg-white/10 text-white/75',
  SACK: 'border-[color:var(--idp-sack)]/50 bg-[color:var(--idp-sack)]/15 text-red-100',
  INT: 'border-[color:var(--idp-int)]/50 bg-[color:var(--idp-int)]/15 text-emerald-100',
  PD: 'border-violet-400/40 bg-violet-500/15 text-violet-100',
  FF: 'border-orange-400/40 bg-orange-500/15 text-orange-100',
  FR: 'border-amber-800/50 bg-amber-900/30 text-amber-100',
  TD: 'border-[color:var(--idp-td)]/60 bg-[color:var(--idp-td)]/20 text-[color:var(--idp-td)]',
}

export type IdpContractChip =
  | 'ACTIVE'
  | 'EXPIRING'
  | 'TAGGED'
  | 'DEAD_CAP'

export type IDPPlayerCardProps = {
  playerId: string
  name: string
  position: string
  team?: string | null
  sport: string
  players: PlayerMap
  week: number
  isStarter: boolean
  onOpen: () => void
  onToggleStart?: () => void
  /** Mobile: cap visible pills */
  maxPills?: number
  salaryM?: number
  yearsRemaining?: number
  contractChip?: IdpContractChip
}

export function IDPPlayerCard({
  playerId,
  name,
  position,
  team,
  sport,
  players,
  week,
  isStarter,
  onOpen,
  onToggleStart,
  maxPills = 8,
  salaryM,
  yearsRemaining,
  contractChip = 'ACTIVE',
}: IDPPlayerCardProps) {
  const { pts, proj } = mockIdpPoints(playerId, week)
  const stats = mockStatPills(playerId)
  const role = idpRoleLabel(playerId)
  const snapShare = 40 + (Math.abs(playerId.charCodeAt(0) ?? 0) % 55)
  const injured = playerId.endsWith('0') ? 'OUT' : playerId.endsWith('1') ? 'QUEST' : null
  const bye = false
  const lowSnap = snapShare < 50

  const pills: { label: string; val: number | string; key: keyof ReturnType<typeof mockStatPills> }[] = [
    { label: 'SOLO', val: stats.soloTackles, key: 'soloTackles' },
    { label: 'AST', val: stats.assistedTackles, key: 'assistedTackles' },
    { label: 'SACK', val: stats.sacks, key: 'sacks' },
    { label: 'INT', val: stats.interceptions, key: 'interceptions' },
    { label: 'PD', val: stats.passDeflections, key: 'passDeflections' },
    { label: 'FF', val: stats.forcedFumbles, key: 'forcedFumbles' },
    { label: 'FR', val: stats.fumbleRecoveries, key: 'fumbleRecoveries' },
  ]
  if (stats.defensiveTDs > 0) {
    pills.push({ label: 'TD', val: stats.defensiveTDs, key: 'defensiveTDs' })
  }

  const pillPoints = (p: (typeof pills)[0]) => {
    const weights: Record<string, number> = { SOLO: 1.2, SACK: 3, INT: 4, FF: 2, FR: 2, TD: 6 }
    return (weights[p.label] ?? 0.5) * Number(p.val)
  }
  const sorted = [...pills].sort((a, b) => pillPoints(b) - pillPoints(a))
  const displayPills = sorted.slice(0, maxPills)

  const p = players[playerId]

  const chipStyles: Record<IdpContractChip, string> = {
    ACTIVE: 'border-[color:var(--cap-contract)]/45 bg-[color:var(--cap-contract)]/15 text-blue-100',
    EXPIRING: 'border-[color:var(--cap-amber)]/45 bg-[color:var(--cap-amber)]/12 text-amber-100',
    TAGGED: 'border-amber-400/50 bg-amber-500/15 text-amber-50',
    DEAD_CAP: 'border-[color:var(--cap-dead)]/40 bg-white/[0.04] text-white/45',
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="relative rounded-lg border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] p-2 shadow-sm transition hover:border-red-500/25"
      data-testid={`idp-card-${playerId}`}
    >
      <span className="absolute right-2 top-2 rounded border border-[color:var(--idp-defense)]/45 bg-[color:var(--idp-defense)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-100">
        IDP
      </span>
      <div className="flex gap-2 pr-12">
        <div className="relative shrink-0">
          <PlayerImage
            sleeperId={playerId}
            sport={sport}
            name={name}
            position={position}
            espnId={p?.espn_id}
            nbaId={p?.nba_id}
            size={36}
            variant="round"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white" title={name}>
            {name.length > 16 ? `${name.slice(0, 16)}…` : name}
          </p>
          <p className="text-[10px] text-white/45">
            {team ?? '—'} · {position}
          </p>
          <p className="text-[9px] text-white/35">{role}</p>
          <div className="mt-1 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
            {displayPills.map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                  PILL_STYLES[pill.label] ?? 'border-white/15 bg-white/10 text-white/70'
                }`}
              >
                {pill.label === 'TD' ? '🟡' : null}
                {pill.val} {pill.label}
              </span>
            ))}
          </div>
          {salaryM != null && yearsRemaining != null ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-white/55">
                💰 ${salaryM.toFixed(1)}M · {yearsRemaining}yr
              </span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${chipStyles[contractChip]}`}
              >
                {contractChip === 'TAGGED'
                  ? 'TAGGED'
                  : contractChip === 'DEAD_CAP'
                    ? 'DEAD CAP'
                    : contractChip === 'EXPIRING'
                      ? 'EXPIRING'
                      : 'ACTIVE'}
              </span>
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-[color:var(--idp-defense)]">{pts}</p>
          <p className="text-[10px] text-white/35">proj {proj}</p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {injured ? (
          <span className="rounded bg-red-950/50 px-1.5 py-0.5 text-[9px] text-red-200">
            🔴 {injured}
          </span>
        ) : null}
        {bye ? <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">⚫ BYE</span> : null}
        {lowSnap ? (
          <span className="rounded bg-amber-950/40 px-1.5 py-0.5 text-[9px] text-amber-200">⚠ LOW SNAP</span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
            isStarter
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100'
              : 'border-white/15 bg-white/5 text-white/60'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleStart?.()
          }}
        >
          {isStarter ? 'Start' : 'Sit'}
        </button>
      </div>
    </div>
  )
}
