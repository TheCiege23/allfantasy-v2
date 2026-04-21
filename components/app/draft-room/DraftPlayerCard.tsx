'use client'

import React, { useMemo, useState } from 'react'
import type { PlayerDisplayModel, PlayerAssetModel } from '@/lib/draft-sports-models/types'
import { LazyDraftImage } from './LazyDraftImage'
import { normalizePlayer } from '@/lib/players/normalizePlayer'
import { getPlayerImage } from '@/lib/players/getPlayerImage'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export type DraftPlayerCardProps = {
  /** Normalized display model (preferred) */
  display?: PlayerDisplayModel | null
  /** Fallback when display not provided: minimal fields for list row */
  name: string
  position: string
  team?: string | null
  adp?: number | null
  byeWeek?: number | null
  /** League sport for logo + asset resolution */
  draftSport?: string
  /** Draft state */
  isDrafted?: boolean
  /** Show compact row (list) vs larger card */
  variant?: 'row' | 'card'
  /** Devy: from college/devy pool */
  isDevy?: boolean
  /** Devy: school (e.g. "Ohio State") */
  school?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  /** Devy: promoted to NFL */
  graduatedToNFL?: boolean
  /** C2C: 'college' | 'pro' for Campus-to-Canton */
  poolType?: 'college' | 'pro'
  /** Optional: primary action (e.g. Draft button) */
  primaryAction?: React.ReactNode
  /** Optional: secondary action (e.g. Add to queue) */
  secondaryAction?: React.ReactNode
  /** Optional: compare / vs action (shown before secondary in row layout) */
  compareAction?: React.ReactNode
  /** Loading state */
  loading?: boolean
  /** Error state (e.g. failed to load asset) */
  error?: string | null
  /** Optional card click handler for player detail drill-down. */
  onSelect?: () => void
  /** Optional explicit test id */
  testId?: string
  /** War Room / AI helper badge on list rows */
  aiWarRoomBadge?: 'ai_pick' | 'value' | 'risky' | null
}

function formatAdpDisplay(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  const n = Number(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatBye(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—'
  return String(Math.floor(v))
}

function HeadshotOrFallback({
  headshotUrl,
  displayName,
  size = 32,
  className = '',
  testIdBase = 'draft-player-headshot',
}: {
  headshotUrl: string | null
  displayName: string
  size?: number
  className?: string
  testIdBase?: string
}) {
  const [imgError, setImgError] = useState(false)
  const showImg = headshotUrl && !imgError

  if (showImg) {
    return (
      <LazyDraftImage
        src={headshotUrl}
        alt=""
        width={size}
        height={size}
        testId={`${testIdBase}-image`}
        className={`rounded-full object-cover bg-white/10 ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div
      data-testid={`${testIdBase}-fallback`}
      className={`rounded-full bg-white/15 flex items-center justify-center text-white/70 font-semibold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      aria-hidden
    >
      {displayName ? displayName.charAt(0).toUpperCase() : '?'}
    </div>
  )
}

function TeamLogoOrFallback({
  logoUrl,
  teamAbbr,
  size = 20,
  className = '',
  testIdBase = 'draft-player-team-logo',
}: {
  logoUrl: string | null
  teamAbbr: string | null
  size?: number
  className?: string
  testIdBase?: string
}) {
  const [imgError, setImgError] = useState(false)
  const showImg = logoUrl && !imgError

  if (showImg) {
    return (
      <LazyDraftImage
        src={logoUrl}
        alt={teamAbbr ?? ''}
        width={size}
        height={size}
        testId={`${testIdBase}-image`}
        className={`rounded object-contain ${className}`}
        lazy
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <span
      data-testid={`${testIdBase}-fallback`}
      className={`inline-flex items-center justify-center rounded border border-white/10 bg-[#0a1228] text-[9px] font-bold text-white/85 flex-shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      {teamAbbr ? teamAbbr.slice(0, 3).toUpperCase() : '—'}
    </span>
  )
}

function DraftPlayerCardInner({
  display,
  name,
  position,
  team,
  adp,
  byeWeek,
  draftSport = DEFAULT_SPORT,
  isDrafted = false,
  variant = 'row',
  primaryAction,
  secondaryAction,
  compareAction,
  loading = false,
  error = null,
  onSelect,
  testId,
  isDevy = false,
  school = null,
  classYearLabel = null,
  draftGrade = null,
  projectedLandingSpot = null,
  graduatedToNFL = false,
  poolType,
  aiWarRoomBadge = null,
}: DraftPlayerCardProps) {
  const assets: PlayerAssetModel | null = display?.assets ?? null
  const teamAbbr = display?.metadata?.teamAbbreviation ?? team ?? null
  const displayName = display?.displayName ?? name
  const primaryStat = display?.stats?.primaryStatValue ?? adp
  const bye = display?.metadata?.byeWeek ?? display?.stats?.byeWeek ?? byeWeek
  const injuryStatus = display?.metadata?.injuryStatus ?? null
  const resolvedSchool = school ?? display?.metadata?.collegeOrPipeline ?? null
  const resolvedClassYearLabel = display?.metadata?.classYearLabel ?? classYearLabel
  const resolvedDraftGrade = display?.metadata?.draftGrade ?? draftGrade
  const resolvedProjectedLandingSpot = display?.metadata?.projectedLandingSpot ?? projectedLandingSpot
  const devyLabel = resolvedSchool ?? (isDevy ? 'Devy' : null)
  const showPromoted = graduatedToNFL
  const showProBadge = poolType === 'pro'
  const showCollegeBadge = poolType === 'college' || (isDevy && !showProBadge)

  const normalized = useMemo(
    () =>
      normalizePlayer({
        display: display ?? undefined,
        name,
        position,
        team,
        adp: primaryStat,
        byeWeek: bye,
        sport: draftSport,
        school,
        classYearLabel,
        draftGrade,
        projectedLandingSpot,
        isDevy,
        graduatedToNFL,
        poolType,
      }),
    [
      display,
      name,
      position,
      team,
      primaryStat,
      bye,
      draftSport,
      school,
      classYearLabel,
      draftGrade,
      projectedLandingSpot,
      isDevy,
      graduatedToNFL,
      poolType,
    ],
  )

  const headshotUrl = getPlayerImage(normalized) ?? assets?.headshotUrl ?? null
  const teamLogoUrl = normalized.teamLogoUrl ?? assets?.teamLogoUrl ?? null
  const statLine = normalized.stats?.summary ?? 'No stats available'
  const headshotTestBase = testId ? `${testId}-headshot` : 'draft-player-headshot'
  const teamLogoTestBase = testId ? `${testId}-team-logo` : 'draft-player-team-logo'

  if (loading) {
    return (
      <div
        className="flex animate-pulse items-center gap-2 rounded-xl border border-white/10 bg-[#0a1228]/90 px-2 py-2"
        aria-busy="true"
      >
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="h-2 w-40 bg-white/10 rounded" />
        </div>
        <div className="h-8 w-20 shrink-0 rounded-md bg-white/[0.06]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-200">
        {error}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        data-draft-player-card="true"
        data-variant="card"
        data-drafted={isDrafted ? 'true' : 'false'}
        data-testid={testId}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSelect?.()
        }}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        className={`rounded-xl border bg-gradient-to-b from-[#0e1528] to-[#0a1228] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition duration-200 hover:border-white/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] ${
          isDrafted ? 'border-white/5 opacity-75' : 'border-white/12'
        } ${isDevy ? 'ring-1 ring-inset ring-violet-500/35' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            <HeadshotOrFallback
              headshotUrl={headshotUrl}
              displayName={displayName}
              size={44}
              testIdBase={headshotTestBase}
            />
            <div className="absolute -bottom-0.5 -right-0.5 rounded border border-white/12 bg-[#0a1228] p-px shadow-sm">
              <TeamLogoOrFallback logoUrl={teamLogoUrl} teamAbbr={teamAbbr} size={18} testIdBase={teamLogoTestBase} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-white truncate">{displayName}</p>
              {devyLabel && (
                <span className="rounded bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-medium text-violet-200" title="Devy / college">
                  {devyLabel}
                </span>
              )}
              {showPromoted && (
                <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200" title="Promoted to NFL">
                  Promoted
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-white/55">
              {[teamAbbr ?? '—', position].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-0.5 text-[10px] text-white/45 line-clamp-2">{statLine}</p>
          </div>
          {(compareAction || primaryAction || secondaryAction) && (
            <div
              className="flex shrink-0 gap-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {compareAction}
              {secondaryAction}
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <li
      data-draft-player-card="true"
      data-variant="row"
      data-drafted={isDrafted ? 'true' : 'false'}
      data-testid={testId}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect?.()
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={`group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition duration-150 hover:-translate-y-px hover:border-white/22 hover:bg-[#0d1530] hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 active:scale-[0.995] ${
        isDrafted ? 'border-white/[0.07] bg-[#0a1228]/65 opacity-65' : 'border-white/[0.1] bg-gradient-to-r from-[#0c1424] to-[#0a1228]'
      } ${isDevy ? 'border-l-[3px] border-l-violet-500/55' : ''}`}
    >
      <div className="relative h-10 w-10 shrink-0">
        <HeadshotOrFallback headshotUrl={headshotUrl} displayName={displayName} size={40} testIdBase={headshotTestBase} />
        <div className="absolute -bottom-0.5 -right-0.5 rounded border border-white/15 bg-[#0a1228] p-px shadow-md">
          <TeamLogoOrFallback logoUrl={teamLogoUrl} teamAbbr={teamAbbr} size={16} testIdBase={teamLogoTestBase} />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="truncate font-bold text-white">{displayName}</p>
          {showProBadge && (
            <span className="rounded bg-cyan-500/25 px-1 py-0.5 text-[9px] font-medium text-cyan-200 shrink-0" title="Pro / NFL">
              Pro
            </span>
          )}
          {showCollegeBadge && devyLabel && (
            <span className="rounded bg-violet-500/25 px-1 py-0.5 text-[9px] font-medium text-violet-200 shrink-0" title="College / devy">
              {devyLabel}
            </span>
          )}
          {resolvedDraftGrade && (
            <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium text-amber-100 shrink-0" title="Draft grade">
              {resolvedDraftGrade}
            </span>
          )}
          {showPromoted && (
            <span className="rounded bg-emerald-500/25 px-1 py-0.5 text-[9px] font-medium text-emerald-200 shrink-0" title="Promoted to NFL">
              Promoted
            </span>
          )}
          {aiWarRoomBadge === 'ai_pick' && (
            <span className="rounded bg-emerald-500/30 px-1 py-0.5 text-[9px] font-semibold text-emerald-100 shrink-0" title="AI recommendation">
              AI Pick
            </span>
          )}
          {aiWarRoomBadge === 'value' && (
            <span className="rounded bg-amber-500/28 px-1 py-0.5 text-[9px] font-semibold text-amber-100 shrink-0" title="Strong value">
              Great Value
            </span>
          )}
          {aiWarRoomBadge === 'risky' && (
            <span className="rounded bg-rose-500/30 px-1 py-0.5 text-[9px] font-semibold text-rose-100 shrink-0" title="Elevated risk">
              Risky
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/55">
          {[teamAbbr ?? '—', position].join(' · ')}
          {resolvedClassYearLabel ? ` · ${resolvedClassYearLabel}` : ''}
          {resolvedProjectedLandingSpot ? ` · ${resolvedProjectedLandingSpot}` : ''}
          {injuryStatus ? ` · ${injuryStatus}` : ''}
        </p>
        <p className="text-[10px] text-white/42 truncate" title={statLine}>
          {statLine}
        </p>
      </div>

      <div
        className="flex shrink-0 flex-col items-end gap-1.5"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="text-right text-[10px] tabular-nums text-white/60">
          <div>
            ADP <span className="font-semibold text-white/85">{formatAdpDisplay(normalized.adp)}</span>
          </div>
          <div>
            Bye <span className="font-semibold text-white/85">{formatBye(normalized.byeWeek)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">{compareAction}{secondaryAction}{primaryAction}</div>
      </div>
    </li>
  )
}

export const DraftPlayerCard = React.memo(DraftPlayerCardInner)
