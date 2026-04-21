'use client'

import React from 'react'
import { ArrowLeftRight, ArrowRight, Gavel, History } from 'lucide-react'
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
  amount?: number | null
  isKeeper?: boolean
  isDevyPick?: boolean
  isCollegePick?: boolean
  isProPick?: boolean
  isPromotedFromDevy?: boolean
  source?: string | null
  tradedPickMeta?: {
    originalRosterId?: string
    newOwnerName?: string
    previousOwnerName?: string
    showNewOwnerInRed?: boolean
    tintColor?: string
  } | null
  managerTintColor?: string | null
  /** Current owner of this pick slot (for trade targeting). */
  ownerRosterId?: string | null
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
      {team ? team.slice(0, 2).toUpperCase() : '-'}
    </span>
  )
}

export type PickHighlightTone = 'none' | 'user' | 'ai'

export type DraftBoardCellProps = {
  pick: DraftBoardCellPick
  isEmpty: boolean
  isCurrentPick?: boolean
  tradedPickColorMode?: boolean
  showNewOwnerInRed?: boolean
  isDevyRound?: boolean
  isCollegeRound?: boolean
  pickHighlight?: PickHighlightTone
  /** When set, show a trade affordance (opens pick-trade flow from parent). */
  onTradeFromCell?: () => void
  /**
   * When set on a cell whose pick has `tradedPickMeta`, shows a secondary
   * "history" chip. Parent routes this to PickTradeHistoryModal with
   * focusRound / focusOriginalRosterId so the relevant row highlights.
   */
  onViewTradeHistory?: () => void
}

function highlightClass(tone: PickHighlightTone | undefined): string {
  if (tone === 'user') return 'ring-1 ring-amber-400/45 border-amber-400/35 shadow-[0_0_12px_rgba(251,191,36,0.12)]'
  if (tone === 'ai') return 'ring-1 ring-sky-400/40 border-sky-400/30 shadow-[0_0_14px_rgba(56,189,248,0.14)]'
  return ''
}

function compactPickLabel(value: string): string {
  return value.replace(/\.0(?=\d$)/, '.')
}

function StatusBadge({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${className}`}>
      {label}
    </span>
  )
}

function DraftBoardCellInner({
  pick,
  isEmpty,
  isCurrentPick = false,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  isDevyRound = false,
  isCollegeRound = false,
  pickHighlight = 'none',
  onTradeFromCell,
  onViewTradeHistory,
}: DraftBoardCellProps) {
  const assets = React.useMemo(() => {
    const sport = normalizeToSupportedSport(pick.sport ?? DEFAULT_SPORT)
    const display = buildDraftPlayerDisplayModel({
      playerName: pick.playerName ?? '',
      position: pick.position ?? '-',
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
      ? {
          borderColor: withAlpha(pick.tradedPickMeta.tintColor, 0.54),
          backgroundColor: withAlpha(pick.tradedPickMeta.tintColor, 0.16),
        }
      : undefined
  const managerTint =
    !tint && pick.managerTintColor
      ? {
          borderColor: withAlpha(pick.managerTintColor, 0.32),
          backgroundColor: withAlpha(pick.managerTintColor, 0.08),
        }
      : undefined

  const ownerLabel = pick.tradedPickMeta?.newOwnerName ?? pick.displayName ?? null
  const showTradeChip = Boolean(isEmpty && ownerLabel && pick.tradedPickMeta?.newOwnerName)
  const compactLabel = compactPickLabel(pick.pickLabel)

  return (
    <div
      className={`relative flex min-h-[52px] flex-col overflow-hidden rounded-md border px-1.5 pb-1 pt-1 text-[10px] transition-colors hover:border-white/20 sm:min-h-[56px] sm:px-2 sm:pb-1.5 sm:pt-1.5 ${
        onTradeFromCell ? 'pr-7 sm:pr-8' : ''
      } ${
        isCurrentPick
          ? 'border-cyan-300/60 bg-cyan-500/12 ring-1 ring-cyan-300/35'
          : `border-white/10 bg-[#232c40] ${highlightClass(pickHighlight)}`
      }`}
      style={tint ?? managerTint}
      data-overall={pick.overall}
      data-round={pick.round}
      data-slot={pick.slot}
      data-owner-roster={pick.ownerRosterId ?? ''}
      data-testid={`draft-board-cell-${pick.overall}`}
    >
      {onTradeFromCell ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTradeFromCell()
          }}
          data-testid={`draft-board-cell-trade-${pick.overall}`}
          title="Offer pick trade"
          aria-label="Offer pick trade for this slot"
          className="absolute right-0.5 top-0.5 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/12 bg-[#0a1228]/95 text-white/55 shadow-sm backdrop-blur-sm transition hover:border-cyan-400/35 hover:text-cyan-100"
        >
          <ArrowLeftRight className="h-3 w-3" />
        </button>
      ) : null}
      {onViewTradeHistory && pick.tradedPickMeta ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onViewTradeHistory()
          }}
          data-testid={`draft-board-cell-history-${pick.overall}`}
          title="View trade history for this pick"
          aria-label="View trade history for this pick"
          className={`absolute ${onTradeFromCell ? 'right-0.5 top-7' : 'right-0.5 top-0.5'} z-[1] inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/25 bg-amber-500/10 text-amber-200/80 shadow-sm backdrop-blur-sm transition hover:border-amber-300/45 hover:text-amber-100`}
        >
          <History className="h-3 w-3" />
        </button>
      ) : null}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ backgroundColor: withAlpha(pick.managerTintColor ?? '#94a3b8', isCurrentPick ? 0.78 : 0.38) }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {pick.isKeeper ? <StatusBadge label="K" className="bg-emerald-500/18 text-emerald-100" /> : null}
          {pick.isDevyPick ? <StatusBadge label="D" className="bg-violet-500/18 text-violet-100" /> : null}
          {pick.isCollegePick ? <StatusBadge label="C" className="bg-violet-500/18 text-violet-100" /> : null}
          {pick.isProPick ? <StatusBadge label="P" className="bg-cyan-500/18 text-cyan-100" /> : null}
          {pick.isPromotedFromDevy ? <StatusBadge label="Promoted" className="bg-amber-500/18 text-amber-100" /> : null}
          {showTradeChip ? (
            <span
              className={`max-w-[70px] truncate rounded px-1 py-0.5 text-[8px] font-semibold ${
                showNewOwnerInRed ? 'bg-red-500/16 text-red-100' : 'bg-white/16 text-white/86'
              }`}
              title={ownerLabel ?? undefined}
            >
              {ownerLabel}
            </span>
          ) : null}
        </div>

        <span className="tabular-nums text-[9px] font-semibold text-white/48">{compactLabel}</span>
      </div>

      {isEmpty ? (
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex items-center gap-1 text-white/28">
            <ArrowRight className="h-3 w-3" />
            {isCollegeRound ? (
              <StatusBadge label="College" className="bg-violet-500/18 text-violet-100" />
            ) : isDevyRound ? (
              <StatusBadge label="Devy" className="bg-violet-500/18 text-violet-100" />
            ) : null}
          </div>

          {pick.tradedPickMeta?.previousOwnerName ? (
            <span
              className="max-w-[56px] truncate text-[8px] text-white/24"
              title={`Originally ${pick.tradedPickMeta.previousOwnerName}`}
            >
              from {pick.tradedPickMeta.previousOwnerName}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex flex-1 flex-col justify-between">
          <div className="flex min-w-0 items-center gap-1.5">
            <TinyHeadshot name={pick.playerName} src={assets.headshotUrl} />
            <TinyTeamLogo team={pick.team} src={assets.teamLogoUrl} />
            <span className="truncate font-semibold text-white" title={pick.playerName ?? undefined}>
              {pick.playerName}
            </span>
          </div>

          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {(pick.position || pick.team) ? (
                <p className="truncate text-[9px] text-white/56">
                  {[pick.position, pick.team].filter(Boolean).join(' / ')}
                </p>
              ) : null}
              {pick.byeWeek != null && pick.byeWeek > 0 ? (
                <p className="text-[8px] text-white/34">Bye {pick.byeWeek}</p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              {pick.amount != null && pick.amount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/16 px-1.5 py-0.5 text-[8px] font-semibold text-amber-100">
                  <Gavel className="h-2.5 w-2.5" />
                  ${pick.amount}
                </span>
              ) : ownerLabel ? (
                <span
                  className={`block max-w-[66px] truncate text-[8px] ${
                    showNewOwnerInRed && pick.tradedPickMeta?.newOwnerName ? 'text-red-200/90' : 'text-white/42'
                  }`}
                  title={ownerLabel}
                >
                  {ownerLabel}
                </span>
              ) : null}
            </div>
          </div>

          {pick.tradedPickMeta?.previousOwnerName ? (
            <span
              className="mt-1 truncate text-[8px] text-amber-200/78"
              title={`Traded from ${pick.tradedPickMeta.previousOwnerName}`}
            >
              Traded from {pick.tradedPickMeta.previousOwnerName}
            </span>
          ) : null}

          {pick.injuryStatus ? (
            <span className="mt-0.5 truncate text-[8px] text-amber-300/90" title={pick.injuryStatus}>
              {pick.injuryStatus}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

export const DraftBoardCell = React.memo(DraftBoardCellInner)
