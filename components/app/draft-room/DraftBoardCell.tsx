'use client'

import React from 'react'
import { withAlpha } from '@/lib/draft-room'
import { LazyDraftImage } from './LazyDraftImage'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { buildDraftPlayerDisplayModel } from '@/lib/draft-sports-models/build-display-model'

export type DraftBoardCellPick = {
  overall: number
  round: number
  slot: number
  pickLabel: string
  playerName: string | null
  position: string | null
  team: string | null
  playerId?: string | null
  sport?: string | null
  injuryStatus?: string | null
  byeWeek: number | null
  displayName: string | null
  /** Auction: winning bid amount */
  amount?: number | null
  /** Keeper: locked keeper pick */
  isKeeper?: boolean
  /** Devy/college drafted asset marker */
  isDevyPick?: boolean
  /** C2C marker: drafted from college side */
  isCollegePick?: boolean
  /** C2C marker: drafted from pro side */
  isProPick?: boolean
  /** Promotion marker for devy rights promoted into pro player */
  isPromotedFromDevy?: boolean
  source?: string | null
  tradedPickMeta?: {
    newOwnerName?: string
    previousOwnerName?: string
    showNewOwnerInRed?: boolean
    tintColor?: string
  } | null
  managerTintColor?: string | null
}

function TinyHeadshot({
  name,
  src,
}: {
  name: string | null
  src: string | null
}) {
  const [imgError, setImgError] = React.useState(false)
  if (src && !imgError) {
    return (
      <LazyDraftImage
        src={src}
        alt={name ?? ''}
        width={18}
        height={18}
        className="rounded-full object-cover bg-white/10"
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-white/70">
      {String(name ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}

function TinyTeamLogo({
  team,
  src,
}: {
  team: string | null
  src: string | null
}) {
  const [imgError, setImgError] = React.useState(false)
  if (src && !imgError) {
    return (
      <LazyDraftImage
        src={src}
        alt={team ?? ''}
        width={14}
        height={14}
        className="rounded object-contain"
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded bg-white/10 text-[8px] font-medium text-white/70">
      {team ? team.slice(0, 2).toUpperCase() : '—'}
    </span>
  )
}

export type DraftBoardCellProps = {
  pick: DraftBoardCellPick
  isEmpty: boolean
  isCurrentPick?: boolean
  tradedPickColorMode?: boolean
  showNewOwnerInRed?: boolean
  /** When true and empty, show "Devy" slot marker */
  isDevyRound?: boolean
  /** When true and empty, show "College" slot marker (C2C) */
  isCollegeRound?: boolean
}

function DraftBoardCellInner({
  pick,
  isEmpty,
  isCurrentPick = false,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  isDevyRound = false,
  isCollegeRound = false,
}: DraftBoardCellProps) {
  const assets = React.useMemo(() => {
    const sport = normalizeToSupportedSport(pick.sport ?? DEFAULT_SPORT)
    const display = buildDraftPlayerDisplayModel({
      playerName: pick.playerName ?? '',
      position: pick.position ?? '—',
      team: pick.team ?? null,
      playerId: pick.playerId ?? null,
      byeWeek: pick.byeWeek ?? null,
      injuryStatus: pick.injuryStatus ?? null,
      sport,
    })
    return {
      headshotUrl: display.assets.headshotUrl ?? null,
      teamLogoUrl: display.assets.teamLogoUrl ?? null,
    }
  }, [pick.playerName, pick.position, pick.team, pick.playerId, pick.byeWeek, pick.injuryStatus, pick.sport])
  const tint =
    tradedPickColorMode && pick.tradedPickMeta?.tintColor
      ? { borderColor: `${pick.tradedPickMeta.tintColor}60`, backgroundColor: `${pick.tradedPickMeta.tintColor}15` }
      : undefined
  const managerTint =
    !tint && pick.managerTintColor
      ? { borderColor: withAlpha(pick.managerTintColor, 0.32), backgroundColor: withAlpha(pick.managerTintColor, 0.08) }
      : undefined

  return (
    <div
      className={`flex min-h-[52px] flex-col rounded-lg border p-1.5 text-[10px] transition-colors hover:border-white/20 ${
        isCurrentPick
          ? 'border-cyan-300/60 bg-cyan-500/12 ring-1 ring-cyan-300/35'
          : 'border-white/10 bg-[#0a1228]'
      }`}
      style={tint ?? managerTint}
      data-overall={pick.overall}
      data-round={pick.round}
      data-slot={pick.slot}
      data-testid={`draft-board-cell-${pick.overall}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="tabular-nums font-medium text-white/65">{pick.pickLabel}</span>
        {pick.displayName && (
          <span className="max-w-[60px] truncate text-white/45" title={pick.displayName}>
            {pick.displayName}
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-white/25">
          {isCollegeRound ? (
            <span className="rounded bg-violet-500/20 px-1 text-[9px] font-medium text-violet-100">College</span>
          ) : isDevyRound ? (
            <span className="rounded bg-violet-500/20 px-1 text-[9px] font-medium text-violet-100">Devy</span>
          ) : (
            '—'
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          {pick.isKeeper && (
            <span className="mb-0.5 inline-block rounded bg-emerald-500/20 px-1 text-[9px] font-medium text-emerald-100">K</span>
          )}
          {pick.isDevyPick && (
            <span className="mb-0.5 inline-block rounded bg-violet-500/20 px-1 text-[9px] font-medium text-violet-100">D</span>
          )}
          {pick.isCollegePick && (
            <span className="mb-0.5 ml-1 inline-block rounded bg-violet-500/20 px-1 text-[9px] font-medium text-violet-100">C</span>
          )}
          {pick.isProPick && (
            <span className="mb-0.5 ml-1 inline-block rounded bg-cyan-500/20 px-1 text-[9px] font-medium text-cyan-100">P</span>
          )}
          {pick.isPromotedFromDevy && (
            <span className="mb-0.5 ml-1 inline-block rounded bg-amber-500/20 px-1 text-[9px] font-medium text-amber-100">Promoted</span>
          )}
          <div className="mb-0.5 flex items-center gap-1">
            <TinyHeadshot name={pick.playerName} src={assets.headshotUrl} />
            <TinyTeamLogo team={pick.team} src={assets.teamLogoUrl} />
          </div>
          {pick.amount != null && pick.amount > 0 && (
            <span className="text-amber-300/90 font-medium">${pick.amount}</span>
          )}
          {pick.playerName && (
            <span className="truncate font-medium text-white" title={pick.playerName}>
              {pick.playerName}
            </span>
          )}
          {(pick.position || pick.team) && (
            <span className="text-white/50">
              {[pick.position, pick.team].filter(Boolean).join(' · ')}
            </span>
          )}
          {pick.tradedPickMeta?.previousOwnerName && (
            <span className="truncate text-[9px] text-amber-200/85" title={`Originally ${pick.tradedPickMeta.previousOwnerName}`}>
              Traded from {pick.tradedPickMeta.previousOwnerName}
            </span>
          )}
          {pick.byeWeek != null && pick.byeWeek > 0 && (
            <span className="text-white/40">Bye {pick.byeWeek}</span>
          )}
          {pick.injuryStatus && (
            <span className="text-[9px] text-amber-300/90" title={pick.injuryStatus}>
              {pick.injuryStatus}
            </span>
          )}
          {showNewOwnerInRed && pick.tradedPickMeta?.newOwnerName && (
            <span className="truncate text-red-400" title={pick.tradedPickMeta.newOwnerName}>
              → {pick.tradedPickMeta.newOwnerName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export const DraftBoardCell = React.memo(DraftBoardCellInner)
